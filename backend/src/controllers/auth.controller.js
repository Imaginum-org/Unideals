import bcrypt from "bcrypt";
import crypto from "crypto";
import xss from "xss";
import { OAuth2Client } from "google-auth-library";
import userModel from "../models/User.model.js";
import sendEmail from "../config/sendEmail.js";
import generatedAccessToken from "../utils/generatedAccessToken.js";
import generatedRefreshToken from "../utils/generatedRefreshToken.js";
import verifyEmailTempplate from "../utils/templates/verifyEmailTemplate.js";
import forgotPaswordTemplate from "../utils/templates/forgotPaswordTemplate.js";
import { USER_STATUS } from "../config/constants.js";
import {
  clearAuthCookies,
  loginWithPassword,
  refreshSession,
  revokeRefreshToken,
  revokeRefreshTokenByToken,
  sanitizeAuthUser,
  setAuthCookies,
} from "../services/auth.service.js";
import { safeErrorMessage } from "../utils/response.js";
import escapeHtml from "../utils/escapeHtml.js";

const sha256 = (value) =>
  crypto.createHash("sha256").update(String(value)).digest("hex");

// Native mobile app (Expo) mode. React Native has no reliable HttpOnly
// cookie jar, so the app opts in with `x-client-type: mobile` and receives
// tokens in the JSON body instead (stored in the OS keychain/keystore).
// Browsers ALWAYS send an Origin on cross-origin requests carrying a custom
// header, so requiring "no Origin" keeps a web XSS from flipping this mode
// on to read tokens. In mobile mode the refresh token comes from the body
// only — cookies are never read or set — so the web cookie session can
// never be converted into a JSON-exposed token.
const isMobileClient = (req) =>
  String(req.headers["x-client-type"] || "").toLowerCase() === "mobile" &&
  !req.headers.origin;

const issueSession = (req, res, accessToken, refreshToken) => {
  if (isMobileClient(req)) return { accessToken, refreshToken };
  setAuthCookies(res, accessToken, refreshToken);
  return {};
};

// Google ID tokens minted for the native apps carry their own client ID as
// `aud`. Accept the web client plus any configured mobile client IDs.
const googleAudiences = () =>
  [process.env.GOOGLE_CLIENT_ID, ...String(process.env.GOOGLE_MOBILE_CLIENT_IDS || "").split(",")]
    .map((s) => String(s || "").trim())
    .filter(Boolean);

// The Google callback is a top-level browser navigation: answering with
// JSON left users staring at a raw JSON page. Send them back to /login with
// a short error code the Login page turns into a friendly message.
// Native app sign-in (Expo): /google?return_to=unideals://oauth (or Expo
// Go's exp://.../--/oauth). Only the app's own URL schemes are accepted, so
// this can never become an open redirect to a website.
const MOBILE_RETURN_RE = /^(unideals|exp|exps):\/\/[^\s<>"]{1,250}$/;
const sanitizeChallenge = (v) => (typeof v === "string" && /^[a-f0-9]{64}$/.test(v) ? v : null);
export const sanitizeMobileReturn = (v) => (typeof v === "string" && MOBILE_RETURN_RE.test(v) ? v : null);
const OAUTH_COOKIE_OPTS = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "Lax",
  path: "/",
});

// Hand the result back to the app. Android Chrome (Custom Tabs) often
// refuses a bare 302 to an app scheme (unideals:// / exp://) that isn't
// tied to a tap, leaving users on a blank "loading" tab. So we serve a tiny
// page that tries to open the app right away and also shows a button: a tap
// always works. The page carries its own strict CSP (nonce'd script only).
const redirectToApp = (res, base, params) => {
  const url = new URL(base);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const target = url.toString();
  const ok = !params.oauth_error;
  const nonce = crypto.randomBytes(16).toString("base64");
  res.set(
    "Content-Security-Policy",
    `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
  );
  res.set("Cache-Control", "no-store");
  res.set("Referrer-Policy", "no-referrer");
  const href = escapeHtml(target);
  return res
    .status(200)
    .type("html")
    .send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#3838EC"><title>Unideals</title>
<style>html,body{margin:0;height:100%;background:#3838EC;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
body{display:flex;align-items:center;justify-content:center}
.l{width:72px;height:72px;border-radius:22px;background:#fff;color:#3838EC;font-weight:800;font-size:38px;display:flex;align-items:center;justify-content:center;animation:p 1.1s ease-in-out infinite}
@keyframes p{0%,100%{transform:scale(.94);opacity:.85}50%{transform:scale(1.04);opacity:1}}
a{position:fixed;left:0;right:0;bottom:40px;text-align:center;color:rgba(255,255,255,.85);font-size:14px;text-decoration:underline;opacity:0;animation:f .3s 4s forwards}
@keyframes f{to{opacity:1}}</style></head>
<body><div class="l" aria-label="Unideals">U</div>
<a id="go" href="${href}">${ok ? "Still here? Tap to open Unideals" : "Sign-in didn't finish. Tap to go back"}</a>
<script nonce="${nonce}">location.replace(${JSON.stringify(target).replace(/</g, "\\u003c")});</script></body></html>`);
};

const redirectOAuthError = (res, code, mobileReturn = null) => {
  if (mobileReturn) return redirectToApp(res, mobileReturn, { oauth_error: code });
  const base = String(process.env.FRONTEND_URL || "").split(",")[0].trim();
  if (!base) {
    return res.status(400).json({ success: false, error: true, message: "Google login failed." });
  }
  const url = new URL(`${base.replace(/\/$/, "")}/login`);
  url.searchParams.set("oauth_error", code);
  return res.redirect(url.toString());
};

// Per-target-email send throttle (in-memory, no new deps): max 3/hr per
// email across forgot/resend/register-resend. Throttled callers still get
// generic success (no oracle, no email-bombing signal).
const emailSendThrottle = new Map(); // key -> { count, expiresAt }
const EMAIL_SEND_LIMIT = 3;
const EMAIL_SEND_WINDOW_MS = 60 * 60 * 1000;

const isEmailSendThrottled = (normalizedEmail) => {
  const entry = emailSendThrottle.get(normalizedEmail);
  if (!entry) return false;
  if (entry.expiresAt <= Date.now()) {
    emailSendThrottle.delete(normalizedEmail);
    return false;
  }
  return entry.count >= EMAIL_SEND_LIMIT;
};

const pruneEmailSendThrottle = () => {
  // Bound memory: drop expired entries (previously grew forever).
  if (emailSendThrottle.size < 1000) return;
  const now = Date.now();
  for (const [key, entry] of emailSendThrottle) {
    if (!entry || entry.expiresAt <= now) emailSendThrottle.delete(key);
  }
};

const recordEmailSend = (normalizedEmail) => {
  pruneEmailSendThrottle();
  const now = Date.now();
  const entry = emailSendThrottle.get(normalizedEmail);
  if (!entry || entry.expiresAt <= now) {
    emailSendThrottle.set(normalizedEmail, { count: 1, expiresAt: now + EMAIL_SEND_WINDOW_MS });
  } else {
    entry.count += 1;
    emailSendThrottle.set(normalizedEmail, entry);
  }
};

const isPasswordValidLength = (password) =>
  typeof password === "string" && password.length >= 8 && password.length <= 72;

const REGISTER_GENERIC_MESSAGE =
  "If this email is registered, please log in or check your inbox for verification.";

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
);

const findOrCreateGoogleUser = async (payload) => {
  const email = payload?.email?.toLowerCase();

  if (!email) {
    const error = new Error("Google did not return a valid email.");
    error.statusCode = 400;
    throw error;
  }

  // Only trust Google-verified emails for auto-verification/linking
  if (payload?.email_verified === false) {
    const error = new Error("Google email is not verified.");
    error.statusCode = 400;
    throw error;
  }

  const name = xss(String(payload.name || email.split("@")[0]).slice(0, 100));
  // Only accept Google-hosted avatar URLs to prevent stored XSS/phishing
  const rawPicture = typeof payload.picture === "string" ? payload.picture : null;
  const isGoogleAvatar =
    rawPicture &&
    /^https:\/\/lh\d*\.googleusercontent\.com\//.test(rawPicture);
  const picture = isGoogleAvatar ? rawPicture.replace("s96-c", "s400-c") : null;

  let user = await userModel.findOne({ email }).select("+password");

  if (!user) {
    const randomPassword = crypto.randomBytes(32).toString("hex");
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    user = await userModel.create({
      name,
      email,
      password: hashedPassword,
      avatar: picture ? { url: picture } : undefined,
      is_email_verified: true,
      verifyTokenEmail: "",
      verifyTokenEmailExpiry: null,
    });
  } else {
    if (picture && !user.avatar?.url) {
      user.avatar = {
        ...(user.avatar?.toObject?.() || user.avatar || {}),
        url: picture,
      };
    }

    if (!user.is_email_verified) {
      // Pre-account-takeover guard: an unverified account may have been
      // registered by someone else (with a password they know) before the
      // real owner signed in with Google. Google just proved inbox
      // ownership, so discard that unproven password and any sessions.
      user.is_email_verified = true;
      user.password = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
      user.verifyTokenEmail = "";
      user.verifyTokenEmailExpiry = null;
      user.tokenVersion = (user.tokenVersion || 0) + 1;
    }

    await user.save();
  }

  return user;
};

export const registerUserController = async (req, res) => {
  try {
    let { name, email, password, gender } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Please provide your name, email, and password.",
        error: true,
        success: false,
      });
    }
    name = name.trim().slice(0, 100);
    if (!/^\S+@\S+\.\S+$/.test(email.trim()) || email.length > 254) {
      return res.status(400).json({
        message: "Please provide a valid email address.",
        error: true,
        success: false,
      });
    }

    // Server-side backstop (frontend already enforces a stronger policy).
    // bcrypt caps at 72 bytes — reject longer to avoid silent truncation.
    if (!isPasswordValidLength(password)) {
      return res.status(400).json({
        message:
          typeof password === "string" && password.length > 72
            ? "Password must be at most 72 characters."
            : "Password must be at least 8 characters.",
        error: true,
        success: false,
      });
    }

    email = email.trim().toLowerCase();
    const normalizedEmail = email;
    if (isEmailSendThrottled(normalizedEmail)) {
      return res.status(200).json({
        message: REGISTER_GENERIC_MESSAGE,
        error: false,
        success: true,
      });
    }
    const existingUser = await userModel.findOne({ email });

    if (existingUser) {
      // Deleted/suspended accounts reactivate via forgot-password only —
      // never resurrect or leak via re-register. Same generic 200.
      if (existingUser.status !== USER_STATUS.ACTIVE) {
        return res.status(200).json({
          message: REGISTER_GENERIC_MESSAGE,
          error: false,
          success: true,
        });
      }
      if (existingUser.is_email_verified) {
        // Uniform success: distinct statuses/messages would let anyone
        // probe which emails hold verified accounts.
        return res.status(200).json({
          message: REGISTER_GENERIC_MESSAGE,
          error: false,
          success: true,
        });
      }
    }

    const verifyToken = crypto.randomBytes(32).toString("hex");
    const hashedVerifyToken = sha256(verifyToken);
    const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const verifyEmailUrl = `${process.env.FRONTEND_URL}/verify-email?code=${verifyToken}`;

    if (existingUser) {
      // Unverified re-register: the latest registrant's password wins and
      // the old verification link dies. Previously the FIRST registrant's
      // password was kept, so anyone could pre-register a victim's email
      // and log in once the real owner clicked the verification link.
      await userModel.findByIdAndUpdate(existingUser._id, {
        password: await bcrypt.hash(password, 10),
        verifyTokenEmail: hashedVerifyToken,
        verifyTokenEmailExpiry: verifyExpiry,
        $inc: { tokenVersion: 1 },
      });

      recordEmailSend(normalizedEmail);
      try {
        await sendEmail({
          sendTo: email,
          subject: "Verify your email for Unideals",
          html: verifyEmailTempplate({
            name: existingUser.name,
            url: verifyEmailUrl,
          }),
        });
      } catch {
        // best-effort: uniform success even if mailer fails
      }

      // Uniform generic 200 (no verified/unverified/missing distinction).
      return res.status(200).json({
        message: REGISTER_GENERIC_MESSAGE,
        error: false,
        success: true,
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    // Girls Corner 🌸 optional self-declared gender at signup.
    const cleanGender = gender === "female" || gender === "male" ? gender : undefined;
    await userModel.create({
      name,
      email,
      password: hashedPassword,
      verifyTokenEmail: hashedVerifyToken,
      verifyTokenEmailExpiry: verifyExpiry,
      is_email_verified: false,
      ...(cleanGender ? { gender: cleanGender, genderUpdatedAt: new Date() } : {}),
    });

    recordEmailSend(normalizedEmail);
    try {
      await sendEmail({
        sendTo: email,
        subject: "Verify your email for Unideals",
        html: verifyEmailTempplate({
          name,
          url: verifyEmailUrl,
        }),
      });
    } catch {
      // best-effort: uniform success even if mailer fails
    }

    // Uniform generic 200 (creation no longer signalled via 201/message).
    return res.status(200).json({
      message: REGISTER_GENERIC_MESSAGE,
      error: false,
      success: true,
    });
  } catch (err) {
    console.error("Registration Error:", err);
    return res.status(500).json({
      message: safeErrorMessage(err, "Internal server error"),
      error: true,
      success: false,
    });
  }
};

export const loginController = async (req, res) => {
  try {
    const { accessToken, refreshToken, user } = await loginWithPassword(
      req.body,
    );

    // Web: tokens travel via HttpOnly cookies only — never in the JSON
    // body, where any XSS could exfiltrate the 7-day refresh token.
    // Native app (see isMobileClient): tokens in the body, no cookies.
    const tokens = issueSession(req, res, accessToken, refreshToken);
    return res.status(200).json({
      message: "Login successfully",
      success: true,
      error: false,
      data: {
        user,
        ...tokens,
      },
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      message: safeErrorMessage(err, "Login failed"),
      success: false,
      error: true,
      requiresVerification: Boolean(err.requiresVerification),
      accountBlocked: Boolean(err.accountBlocked),
      accountStatus: err.accountStatus,
    });
  }
};

export const googleAuthRedirectController = async (req, res) => {
  try {
    // OAuth state binds the callback to this browser (login-CSRF defense).
    const state = crypto.randomBytes(16).toString("hex");
    res.cookie("oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      maxAge: 5 * 60 * 1000,
      path: "/",
    });
    const mobileReturn = sanitizeMobileReturn(req.query?.return_to);
    const challenge = mobileReturn ? sanitizeChallenge(req.query?.challenge) : null;
    if (mobileReturn) {
      res.cookie("oauth_mobile_return", mobileReturn, { ...OAUTH_COOKIE_OPTS(), maxAge: 5 * 60 * 1000 });
    } else {
      res.clearCookie("oauth_mobile_return", OAUTH_COOKIE_OPTS());
    }
    if (challenge) {
      res.cookie("oauth_mobile_challenge", challenge, { ...OAUTH_COOKIE_OPTS(), maxAge: 5 * 60 * 1000 });
    } else {
      res.clearCookie("oauth_mobile_challenge", OAUTH_COOKIE_OPTS());
    }
    const authorizeUrl = oauth2Client.generateAuthUrl({
      // "online": we only need the ID token once; never request a Google
      // refresh token we don't store or use.
      access_type: "online",
      scope: ["openid", "email", "profile"],
      prompt: "select_account",
      state,
    });

    return res.redirect(authorizeUrl);
  } catch (error) {
    console.error("Google auth redirect error:", error);
    return res.status(500).json({
      message: "Unable to start Google authentication",
      success: false,
      error: true,
    });
  }
};

export const googleAuthCallbackController = async (req, res) => {
  try {
    const { code, state } = req.query;
    const mobileReturn = sanitizeMobileReturn(req.cookies?.oauth_mobile_return);
    const challenge = mobileReturn ? sanitizeChallenge(req.cookies?.oauth_mobile_challenge) : null;
    if (mobileReturn) res.clearCookie("oauth_mobile_return", OAUTH_COOKIE_OPTS());
    if (req.cookies?.oauth_mobile_challenge) res.clearCookie("oauth_mobile_challenge", OAUTH_COOKIE_OPTS());
    if (!code || typeof code !== "string") {
      return redirectOAuthError(res, "missing_code", mobileReturn);
    }
    // State must match the cookie set at redirect time — otherwise this
    // login was planted by someone else (login CSRF / session fixation).
    if (!state || state !== req.cookies?.oauth_state) {
      return redirectOAuthError(res, "session_mismatch", mobileReturn);
    }
    // Clear with the same flags used at set time or the cookie survives.
    res.clearCookie("oauth_state", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      path: "/",
    });

    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens?.id_token) {
      return redirectOAuthError(res, "verify_failed", mobileReturn);
    }

    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const previewUser = await userModel
      .findOne({ email: payload?.email?.toLowerCase() })
      .select("status")
      .lean();
    if (previewUser && previewUser.status !== USER_STATUS.ACTIVE) {
      return redirectOAuthError(
        res,
        previewUser.status === USER_STATUS.SUSPENDED
          ? "account_suspended"
          : "account_inactive",
        mobileReturn,
      );
    }
    const user = await findOrCreateGoogleUser(payload);

    const oauthLoginCode = crypto.randomBytes(32).toString("hex");
    const hashedOauthLoginCode = crypto
      .createHash("sha256")
      .update(oauthLoginCode)
      .digest("hex");

    await userModel.findByIdAndUpdate(user._id, {
      oauth_login_token: hashedOauthLoginCode,
      oauth_login_challenge: challenge || "",
      oauth_login_expiry: new Date(Date.now() + 2 * 60 * 1000),
    });

    if (mobileReturn) return redirectToApp(res, mobileReturn, { oauth_code: oauthLoginCode });

    const redirectUrl = new URL(`${process.env.FRONTEND_URL}/login`);
    redirectUrl.searchParams.set("oauth_code", oauthLoginCode);

    return res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error("Google auth callback error:", error?.message || error);
    return redirectOAuthError(res, "failed", sanitizeMobileReturn(req.cookies?.oauth_mobile_return));
  }
};

export const googleOneTapController = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        message: "Google credential is required",
        success: false,
        error: true,
      });
    }

    const ticket = await oauth2Client.verifyIdToken({
      idToken: credential,
      audience: googleAudiences(),
    });

    const user = await findOrCreateGoogleUser(ticket.getPayload());

    if (user.status !== USER_STATUS.ACTIVE) {
      const statusLabel =
        user.status === USER_STATUS.SUSPENDED ? "suspended" : "inactive";

      return res.status(403).json({
        message: `Your account is ${statusLabel}. Please contact support.`,
        success: false,
        error: true,
        accountBlocked: true,
        accountStatus: user.status,
      });
    }

    user.last_login_date = new Date();
    await user.save();

    const accessToken = await generatedAccessToken(user._id, user.tokenVersion || 0);
    const refreshToken = await generatedRefreshToken(user._id, user.tokenVersion || 0);

    const tokens = issueSession(req, res, accessToken, refreshToken);

    return res.status(200).json({
      message: "Google login successful",
      success: true,
      error: false,
      data: {
        user: sanitizeAuthUser(user),
        ...tokens,
      },
    });
  } catch (error) {
    console.error("Google One Tap error:", error?.message || error);
    // Invalid/expired Google credentials are client errors; anything else
    // is masked (library/DB messages never reach the client).
    const status = error.statusCode || (/token|audience|signature|expired/i.test(String(error?.message)) ? 401 : 500);
    return res.status(status).json({
      message: status < 500 && error.statusCode ? error.message : "Google login failed",
      success: false,
      error: true,
    });
  }
};

export const exchangeGoogleOAuthCodeController = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        message: "OAuth login code is required",
        success: false,
        error: true,
      });
    }

    const hashedOauthLoginCode = crypto
      .createHash("sha256")
      .update(code)
      .digest("hex");

    // Atomic single-use consume to prevent parallel replay
    const user = await userModel.findOneAndUpdate(
      {
        oauth_login_token: hashedOauthLoginCode,
        oauth_login_expiry: { $gt: new Date() },
      },
      {
        $unset: { oauth_login_challenge: 1 },
        $set: { oauth_login_token: "", oauth_login_expiry: null },
      },
      { new: false },
    );

    if (!user) {
      return res.status(401).json({
        message: "Google login session expired. Please try again.",
        success: false,
        error: true,
      });
    }

    const freshUser = await userModel.findById(user._id);

    if (freshUser.status !== USER_STATUS.ACTIVE) {
      const statusLabel =
        freshUser.status === USER_STATUS.SUSPENDED ? "suspended" : "inactive";

      return res.status(403).json({
        message: `Your account is ${statusLabel}. Please contact support.`,
        success: false,
        error: true,
        accountBlocked: true,
        accountStatus: freshUser.status,
      });
    }

    freshUser.last_login_date = new Date();
    await freshUser.save();

    const accessToken = await generatedAccessToken(freshUser._id, freshUser.tokenVersion || 0);
    const refreshToken = await generatedRefreshToken(freshUser._id, freshUser.tokenVersion || 0);

    const tokens = issueSession(req, res, accessToken, refreshToken);

    return res.status(200).json({
      message: "Google login successful",
      success: true,
      error: false,
      data: {
        user: sanitizeAuthUser(freshUser),
        ...tokens,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: safeErrorMessage(error, "Google login failed"),
      success: false,
      error: true,
    });
  }
};

/**
 * Native app: "has my Google sign-in finished?" The app started the flow
 * with challenge = sha256(verifier) and polls here with the verifier.
 * 202 while pending; once the callback has run, the session is issued
 * (single use) and the app closes the browser itself, so nothing has to
 * redirect from the browser back into the app.
 */
export const pollGoogleOAuthController = async (req, res) => {
  try {
    const verifier = req.body?.verifier;
    if (typeof verifier !== "string" || !/^[a-f0-9]{64}$/.test(verifier)) {
      return res.status(400).json({ message: "Invalid sign-in session", success: false, error: true });
    }
    const user = await userModel.findOneAndUpdate(
      {
        oauth_login_challenge: sha256(verifier),
        oauth_login_expiry: { $gt: new Date() },
      },
      { $set: { oauth_login_token: "", oauth_login_challenge: "", oauth_login_expiry: null } },
      { new: false },
    );
    if (!user) return res.status(202).json({ success: true, error: false, pending: true });

    const freshUser = await userModel.findById(user._id);
    if (freshUser.status !== USER_STATUS.ACTIVE) {
      return res.status(403).json({
        message: `Your account is ${freshUser.status === USER_STATUS.SUSPENDED ? "suspended" : "inactive"}. Please contact support.`,
        success: false,
        error: true,
        accountBlocked: true,
        accountStatus: freshUser.status,
      });
    }
    freshUser.last_login_date = new Date();
    await freshUser.save();
    const accessToken = await generatedAccessToken(freshUser._id, freshUser.tokenVersion || 0);
    const refreshToken = await generatedRefreshToken(freshUser._id, freshUser.tokenVersion || 0);
    const tokens = issueSession(req, res, accessToken, refreshToken);
    return res.status(200).json({
      message: "Google login successful",
      success: true,
      error: false,
      data: { user: sanitizeAuthUser(freshUser), ...tokens },
    });
  } catch (error) {
    return res.status(500).json({ message: safeErrorMessage(error, "Google login failed"), success: false, error: true });
  }
};

export const verifyEmailController = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== "string") {
      return res.status(400).json({
        message: "verification code required ",
        success: false,
        error: true,
      });
    }
    // Hashed-first lookup; fallback to legacy raw tokens then upgrade to hash.
    const hashedCode = sha256(code);
    let user = await userModel.findOne({
      verifyTokenEmail: hashedCode,
      verifyTokenEmailExpiry: { $gt: new Date() },
    });
    if (!user) {
      const legacyUser = await userModel.findOne({
        verifyTokenEmail: code,
        verifyTokenEmailExpiry: { $gt: new Date() },
      });
      if (!legacyUser) {
        return res.status(400).json({
          message: " Invalid or expired verification link",
          success: false,
          error: true,
        });
      }
      user = legacyUser;
    }

    user.is_email_verified = true;
    user.verifyTokenEmail = "";
    user.verifyTokenEmailExpiry = null;
    await user.save();

    return res.status(200).json({
      message: "Verified email",
      success: true,
      error: false,
    });
  } catch (err) {
    return res.status(500).json({
      message: safeErrorMessage(err, "Unable to verify email right now"),
      success: false,
      error: true,
    });
  }
};

export const checkEmailVerificationController = async (req, res) => {
  try {
    const email = req.query.email;
    if (!email || typeof email !== "string") {
      return res.status(400).json({
        message: "Email is required to check verification status",
        success: false,
        error: true,
      });
    }

    const normalized = String(email).trim().toLowerCase();
    // Basic email shape check to avoid DB probe with garbage
    if (!/^\S+@\S+\.\S+$/.test(normalized)) {
      return res.status(400).json({
        message: "Invalid email format",
        success: false,
        error: true,
      });
    }

    const GENERIC_CHECK_MESSAGE =
      "If this email is registered, its verification status has been sent where applicable.";
    const user = await userModel.findOne({ email: normalized });
    if (!user) {
      // Generic response to avoid enumeration; frontend treats as unverified
      return res.status(200).json({
        message: GENERIC_CHECK_MESSAGE,
        success: true,
        error: false,
        verified: false,
      });
    }

    return res.status(200).json({
      message: GENERIC_CHECK_MESSAGE,
      success: true,
      error: false,
      verified: user.is_email_verified,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Unable to check verification status",
      success: false,
      error: true,
    });
  }
};

export const logoutUser = async (req, res) => {
  try {
    // Prefer authenticated userId, fallback to refresh-cookie lookup
    // so legacy GET /logoutUser (no auth middleware) still revokes server-side.
    const mobile = isMobileClient(req);
    if (req.userId) {
      await revokeRefreshToken(req.userId);
    } else if (mobile && typeof req.body?.refreshToken === "string") {
      await revokeRefreshTokenByToken(req.body.refreshToken);
    } else if (!mobile && req.cookies?.refreshToken) {
      await revokeRefreshTokenByToken(req.cookies.refreshToken);
    }
    clearAuthCookies(res);

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
      error: false,
    });
  } catch (error) {
    console.error("Error in logoutUser:", error);
    clearAuthCookies(res);
    res.status(200).json({
      success: true,
      message: "Logged out successfully",
      error: false,
    });
  }
};

export const refreshAccessTokenController = async (req, res) => {
  try {
    const mobile = isMobileClient(req);
    const session = await refreshSession({
      refreshToken: mobile
        ? typeof req.body?.refreshToken === "string"
          ? req.body.refreshToken
          : undefined
        : req.cookies?.refreshToken,
    });

    const tokens = issueSession(req, res, session.accessToken, session.refreshToken);

    return res.status(200).json({
      message: "Token refreshed successfully",
      success: true,
      error: false,
      data: { user: session.user, ...tokens },
    });
  } catch (err) {
    // Dead refresh token (401): wipe stale cookies so the browser stops
    // sending them. Other failures (429/5xx/network) keep cookies — they
    // may still be valid and the next attempt can succeed.
    if ((err.statusCode || 401) === 401 && !isMobileClient(req)) {
      clearAuthCookies(res);
    }
    return res.status(err.statusCode || 401).json({
      message: safeErrorMessage(err, "Invalid refresh token"),
      success: false,
      error: true,
    });
  }
};

export const forgotPasswordController = async (req, res) => {
  try {
    const { email } = req.body;
    const genericMessage =
      "If an account exists for this email, a password reset link has been sent. Please check your inbox.";

    if (!email || typeof email !== "string") {
      return res.status(200).json({
        message: genericMessage,
        success: true,
        error: false,
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    // Per-target-email throttle: generic success even when throttled.
    if (isEmailSendThrottled(normalizedEmail)) {
      return res.status(200).json({
        message: genericMessage,
        success: true,
        error: false,
      });
    }
    const user = await userModel.findOne({ email: normalizedEmail });

    if (!user) {
      // Generic success to prevent enumeration; small delay so missing
      // accounts take ~as long as the email-sending path below.
      await new Promise((resolve) => setTimeout(resolve, 600));
      return res.status(200).json({
        message: genericMessage,
        success: true,
        error: false,
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    const expireTime = Date.now() + 15 * 60 * 1000;
    await userModel.findByIdAndUpdate(user._id, {
      reset_password_token: hashedResetToken,
      reset_password_expiry: expireTime,
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // 5. Send the email
    try {
      await sendEmail({
        sendTo: normalizedEmail,
        subject: "Reset your Unideals password",
        html: forgotPaswordTemplate({
          name: user.name,
          resetUrl,
        }),
      });
      recordEmailSend(normalizedEmail);
    } catch (emailErr) {
      // Roll back token if email fails so stale tokens don't linger
      await userModel.findByIdAndUpdate(user._id, {
        reset_password_token: "",
        reset_password_expiry: null,
      });
      throw emailErr;
    }

    return res.status(200).json({
      message: genericMessage,
      success: true,
      error: false,
    });
  } catch (error) {
    return res.status(500).json({
      message: safeErrorMessage(
        error,
        "An error occurred while sending the reset email",
      ),
      success: false,
      error: true,
    });
  }
};

export const resetPasswordController = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!isPasswordValidLength(password)) {
      return res.status(400).json({
        message:
          typeof password === "string" && password.length > 72
            ? "Password must be at most 72 characters."
            : "Please provide a new password of at least 8 characters",
        success: false,
        error: true,
      });
    }

    if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(400).json({
        message: "This password reset link is invalid or has expired.",
        success: false,
        error: true,
      });
    }
    const hashedToken = crypto.createHash("sha256").update(String(token)).digest("hex");
    const user = await userModel.findOne({
      reset_password_token: hashedToken,
      reset_password_expiry: { $gt: Date.now() }, // $gt means "greater than" right now
    });

    if (!user) {
      return res.status(400).json({
        message: "This password reset link is invalid or has expired.",
        success: false,
        error: true,
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await userModel.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      reset_password_token: "",
      reset_password_expiry: null,
      // Clicking the emailed reset link proves inbox ownership.
      is_email_verified: true,
      verifyTokenEmail: "",
      verifyTokenEmailExpiry: null,
      refresh_token: null,
      refresh_token_prev: null,
      refresh_token_prev_expires_at: null,
      $inc: { tokenVersion: 1 },
    });

    // Post-reset notify (best-effort, never fail the request).
    try {
      await sendEmail({
        sendTo: user.email,
        subject: "Your Unideals password was changed",
        html: `<p>Hi ${escapeHtml(user.name || "there")},</p><p>Your Unideals password was just changed. If this wasn't you, please reset your password immediately or contact support.</p>`,
      });
    } catch {
      // ignore notify failures
    }

    return res.status(200).json({
      message: "Password updated successfully!",
      success: true,
      error: false,
    });
  } catch (error) {
    return res.status(500).json({
      message: safeErrorMessage(
        error,
        "An error occurred while resetting the password",
      ),
      success: false,
      error: true,
    });
  }
};

export const verifyResetTokenPreCheck = async (req, res) => {
  try {
    const { token } = req.params;

    const hashedToken = crypto.createHash("sha256").update(String(token)).digest("hex");
    // Check if the token exists and hasn't expired yet
    const user = await userModel.findOne({
      reset_password_token: hashedToken,
      reset_password_expiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "This password reset link is invalid or has expired.",
        success: false,
        error: true,
      });
    }

    // If user is found, the token is perfectly valid!
    return res.status(200).json({
      message: "Token is valid",
      success: true,
      error: false,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error while verifying link",
      success: false,
      error: true,
    });
  }
};

export const resendVerificationController = async (req, res) => {
  try {
    const { email } = req.body;
    const genericMessage = "If this email is registered and unverified, a verification email has been sent.";

    if (!email || typeof email !== "string") {
      return res.status(200).json({
        message: genericMessage,
        success: true,
        error: false,
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    // Per-target-email throttle: generic success even when throttled.
    if (isEmailSendThrottled(normalizedEmail)) {
      return res.status(200).json({
        message: genericMessage,
        success: true,
        error: false,
      });
    }
    const user = await userModel.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(200).json({
        message: genericMessage,
        success: true,
        error: false,
      });
    }

    if (user.is_email_verified) {
      // Uniform success: a distinct 400 would confirm verified accounts.
      return res.status(200).json({
        message: genericMessage,
        success: true,
        error: false,
      });
    }

    // Generate a new token (SHA256-hashed at rest, 24h expiry) and update the user
    const verifyToken = crypto.randomBytes(32).toString("hex");
    await userModel.findByIdAndUpdate(user._id, {
      verifyTokenEmail: sha256(verifyToken),
      verifyTokenEmailExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Send the email (best-effort, uniform success)
    const verifyEmailUrl = `${process.env.FRONTEND_URL}/verify-email?code=${verifyToken}`;
    try {
      await sendEmail({
        sendTo: normalizedEmail,
        subject: "Verify your email for Unideals",
        html: verifyEmailTempplate({ name: user.name, url: verifyEmailUrl }),
      });
      recordEmailSend(normalizedEmail);
    } catch {
      // best-effort: still return generic success
    }

    return res.status(200).json({
      message: genericMessage,
      success: true,
      error: false,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Unable to resend verification email", success: false, error: true });
  }
};

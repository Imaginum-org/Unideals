import crypto from "crypto";
import User from "../models/User.model.js";
import sendEmail from "../config/sendEmail.js";
import collegeOtpTemplate from "../utils/templates/collegeOtpTemplate.js";
import { AppError } from "../utils/appError.js";

/**
 * College email verification (the verified tick).
 *
 * People sign in with a personal email. To get the tick they add a college
 * address in Settings, we email a 6-digit code to it, and they type it back.
 * Only a sha256 of the code is stored; it lasts 10 minutes, allows 5 wrong
 * tries, and a new code can be sent once a minute.
 */

export const OTP_TTL_MS = 10 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 60 * 1000;
export const MAX_ATTEMPTS = 5;

const EMAIL_RE = /^[^\s@]+@([a-z0-9-]+\.)+[a-z]{2,}$/i;

// Personal mailboxes never count, even if a campus lists them by mistake.
const PERSONAL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.in", "yahoo.co.in", "outlook.com",
  "hotmail.com", "live.com", "msn.com", "icloud.com", "me.com", "aol.com", "proton.me",
  "protonmail.com", "rediffmail.com", "zoho.com", "zohomail.in", "yandex.com", "gmx.com", "mail.com",
]);

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const domainOf = (email) => email.slice(email.lastIndexOf("@") + 1);
const matchesDomain = (domain, base) => domain === base || domain.endsWith(`.${base}`);

const hashCode = (userId, email, code) =>
  crypto.createHash("sha256").update(`${userId}:${email}:${code}`).digest("hex");

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a || ""), "hex");
  const y = Buffer.from(String(b || ""), "hex");
  return x.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y);
};

// Masks the address for display back to its owner ("ab•••@vitstudent.ac.in").
export const maskEmail = (email) => {
  if (!email || !email.includes("@")) return null;
  const [local, domain] = email.split("@");
  return `${local.slice(0, Math.min(2, local.length))}${"•".repeat(3)}@${domain}`;
};

// Which college email a campus accepts. Rules are checked in order; the first
// whose `match` fits the campus slug wins and overrides Campus.email_domains
// (so a stale domain on the campus document, e.g. vit.ac.in from an older
// seed, can't widen it). To support a new college, add a rule here, or set
// email_domains on its campus. Campuses with neither can't verify yet.
const CAMPUS_DOMAIN_RULES = [
  // Every VIT campus (Vellore, Chennai, Bhopal, Amaravati, …): student mail.
  { match: (slug) => /^vit(-|$)/.test(slug), domains: ["vitstudent.ac.in"] },
];

const cleanDomain = (d) => normalizeEmail(d).replace(/^@/, "");

/** The domains a user's campus accepts ([] = not available for this campus yet). */
export const campusDomainsFor = (campus) => {
  if (!campus) return [];
  const slug = String(campus.slug || "").toLowerCase();
  const rule = CAMPUS_DOMAIN_RULES.find((r) => r.match(slug));
  const list = (rule ? rule.domains : campus.email_domains || [])
    .map(cleanDomain)
    .filter((d) => d && !PERSONAL_DOMAINS.has(d));
  return [...new Set(list)];
};

const statusOf = (user, allowedDomains = []) => ({
  available: allowedDomains.length > 0,
  allowedDomains,
  verified: Boolean(user?.is_college_verified),
  email: user?.is_college_verified ? maskEmail(user.college_email) : null,
  verifiedAt: user?.college_verified_at || null,
  pendingEmail: !user?.is_college_verified && user?.college_email_otp?.expires_at > new Date() ? user.college_email_otp.email : null,
  resendAt:
    user?.college_email_otp?.sent_at && !user?.is_college_verified
      ? new Date(new Date(user.college_email_otp.sent_at).getTime() + RESEND_COOLDOWN_MS)
      : null,
});

export const getCollegeStatus = async (userId) => {
  const load = () =>
    User.findById(userId)
      .select("email is_email_verified is_college_verified college_email college_verified_at campus_id +college_email_otp")
      .populate("campus_id", "slug name email_domains")
      .lean();
  let user = await load();
  if (!user) throw new AppError("User not found", 404);
  // Signed in with their college email: verified on the spot (see below).
  if (await autoVerifyFromAccountEmail(user)) user = await load();
  return statusOf(user, campusDomainsFor(user.campus_id));
};

export const sendCollegeOtp = async (userId, rawEmail) => {
  const email = normalizeEmail(rawEmail);
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    throw new AppError("Enter a valid email address.", 400);
  }

  const user = await User.findById(userId)
    .select("name email is_college_verified college_email campus_id +college_email_otp")
    .populate("campus_id", "slug name email_domains")
    .lean();
  if (!user) throw new AppError("User not found", 404);
  if (user.is_college_verified) throw new AppError("Your college email is already verified.", 409);

  // Only the campus's own student domain counts (VIT: vitstudent.ac.in).
  const allowed = campusDomainsFor(user.campus_id);
  if (!allowed.length) {
    throw new AppError("College email verification isn't available for your campus yet.", 400);
  }
  if (!allowed.some((d) => matchesDomain(domainOf(email), d))) {
    const campusName = user.campus_id?.name || "your campus";
    const list = allowed.map((d) => `@${d}`).join(" or ");
    throw new AppError(`Use your ${campusName} email ending in ${list}.`, 400);
  }

  const sentAt = user.college_email_otp?.sent_at ? new Date(user.college_email_otp.sent_at).getTime() : 0;
  const wait = sentAt + RESEND_COOLDOWN_MS - Date.now();
  if (wait > 0) {
    throw new AppError(`Please wait ${Math.ceil(wait / 1000)}s before asking for a new code.`, 429);
  }

  const taken = await User.exists({ _id: { $ne: userId }, college_email: email, is_college_verified: true });
  if (taken) throw new AppError("This college email is already linked to another Unideals account.", 409);

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const now = new Date();
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        college_email_otp: {
          email,
          hash: hashCode(userId, email, code),
          expires_at: new Date(now.getTime() + OTP_TTL_MS),
          sent_at: now,
          attempts: 0,
        },
      },
    },
  );

  if (process.env.NODE_ENV !== "production" && !process.env.RESEND_API_KEY) {
    // Local dev without a mail provider: print the code instead.
    console.info(`[college-otp] ${email} -> ${code}`);
  } else {
    try {
      await sendEmail({
        sendTo: email,
        subject: `${code} is your Unideals verification code`,
        html: collegeOtpTemplate({ name: user.name, code, siteUrl: process.env.FRONTEND_URL }),
      });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        // Local dev: the mail provider refused (e.g. sending domain not
        // verified on this Resend key). Print the code so the flow can
        // still be tested; production never does this.
        console.warn(`[college-otp] email not sent (${err?.message || "unknown error"}). Code for ${email}: ${code}`);
      } else {
        // Let them retry straight away instead of waiting out the cooldown.
        await User.updateOne({ _id: userId }, { $set: { college_email_otp: null } });
        throw new AppError("We couldn't send the code right now. Please try again in a moment.", 503);
      }
    }
  }

  return {
    email,
    expiresAt: new Date(now.getTime() + OTP_TTL_MS),
    resendAt: new Date(now.getTime() + RESEND_COOLDOWN_MS),
  };
};

export const verifyCollegeOtp = async (userId, rawCode) => {
  const code = String(rawCode || "").replace(/\D/g, "");
  if (code.length !== 6) throw new AppError("Enter the 6-digit code from the email.", 400);

  const user = await User.findById(userId).select("is_college_verified +college_email_otp").lean();
  if (!user) throw new AppError("User not found", 404);
  if (user.is_college_verified) throw new AppError("Your college email is already verified.", 409);

  const otp = user.college_email_otp;
  if (!otp?.hash || !otp.email) throw new AppError("Ask for a code first.", 400);
  if (new Date(otp.expires_at) <= new Date()) {
    throw new AppError("This code has expired. Ask for a new one.", 410);
  }
  if ((otp.attempts || 0) >= MAX_ATTEMPTS) {
    throw new AppError("Too many wrong tries. Ask for a new code.", 429);
  }

  if (!safeEqual(hashCode(userId, otp.email, code), otp.hash)) {
    await User.updateOne({ _id: userId }, { $inc: { "college_email_otp.attempts": 1 } });
    const left = MAX_ATTEMPTS - (otp.attempts || 0) - 1;
    throw new AppError(
      left > 0 ? `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong tries. Ask for a new code.",
      left > 0 ? 400 : 429,
    );
  }

  const verifiedAt = new Date();
  try {
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          is_college_verified: true,
          college_email: otp.email,
          college_verified_at: verifiedAt,
          college_email_otp: null,
        },
      },
    );
  } catch (err) {
    if (err?.code === 11000) {
      throw new AppError("This college email is already linked to another Unideals account.", 409);
    }
    throw err;
  }

  return { verified: true, email: maskEmail(otp.email), verifiedAt };
};

/**
 * Automatic tick: someone whose sign-in email *is* their college email
 * (email/password with a verified inbox, or Google, which proves the inbox)
 * already showed they own it, so they get verified without the OTP step.
 * Runs whenever the profile loads, so it also applies once a campus is
 * picked. Personal addresses never match (campusDomainsFor drops them), so
 * everyone else still verifies from Settings. Returns true when it verified.
 */
export const autoVerifyFromAccountEmail = async (user) => {
  if (!user?._id || user.is_college_verified || !user.is_email_verified) return false;
  const email = normalizeEmail(user.email);
  if (!EMAIL_RE.test(email)) return false;
  const allowed = campusDomainsFor(user.campus_id && typeof user.campus_id === "object" ? user.campus_id : null);
  if (!allowed.some((d) => matchesDomain(domainOf(email), d))) return false;
  try {
    const res = await User.updateOne(
      { _id: user._id, is_college_verified: { $ne: true } },
      { $set: { is_college_verified: true, college_email: email, college_verified_at: new Date(), college_email_otp: null } },
    );
    return res.modifiedCount > 0;
  } catch (err) {
    // Same college email already verified on another account: leave this one alone.
    if (err?.code === 11000) return false;
    throw err;
  }
};

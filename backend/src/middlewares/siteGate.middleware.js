// [SITE-LOCK] testing gate — delete this file (plus controller, routes,
// and the marked blocks in app.js / sockets/index.js) to remove the lock.
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { getAuthCookieOptions } from "../services/auth.service.js";

// Testing gate for app.unideals.in: the whole API stays locked behind a
// shared password until the browser holds a signed HttpOnly cookie.
// Frontend localStorage alone is NOT trusted — anyone can set that from the
// console — so every /api route (and socket handshake) re-verifies here.
const COOKIE_NAME = "site_gate";

export const isSiteGateEnabled = () =>
  String(process.env.SITE_GATE_ENABLED ?? "true").toLowerCase() !== "false";

const gatePassword = () =>
  String(process.env.SITE_GATE_PASSWORD || "imaginum").toLowerCase();

export const passwordsMatch = (candidate) => {
  const a = Buffer.from(String(candidate || "").trim().toLowerCase());
  const b = Buffer.from(gatePassword());
  if (a.length !== b.length || a.length === 0) return false;
  return crypto.timingSafeEqual(a, b);
};

export const verifySiteGateToken = (token) => {
  if (!token) return false;
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY_REFRESH_TOKEN, {
      algorithms: ["HS256"],
    });
    return decoded?.gate === true;
  } catch {
    return false;
  }
};

export const hasSiteGate = (req) =>
  verifySiteGateToken(req.cookies?.[COOKIE_NAME]);

export const issueSiteGateCookie = (res) => {
  const token = jwt.sign(
    { gate: true },
    process.env.SECRET_KEY_REFRESH_TOKEN,
    { algorithm: "HS256", expiresIn: "30d" },
  );
  res.cookie(COOKIE_NAME, token, {
    ...getAuthCookieOptions(),
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
};

// Never gated: health probes, the gate itself, server-to-server webhooks
// (Razorpay can't hold our cookie).
const EXEMPT_PREFIXES = ["/health", "/api/site-gate", "/api/payments/webhook"];

export const requireSiteGate = (req, res, next) => {
  if (!isSiteGateEnabled()) return next();
  const path = req.path || req.originalUrl || "";
  if (EXEMPT_PREFIXES.some((p) => path === p || path.startsWith(p))) {
    return next();
  }
  if (hasSiteGate(req)) return next();
  return res.status(403).json({
    success: false,
    message: "Site is locked for testing.",
    code: "SITE_LOCKED",
  });
};

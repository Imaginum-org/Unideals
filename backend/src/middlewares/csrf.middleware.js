// Origin check against CSRF on cookie-authenticated mutating endpoints.
// CORS allowlists do NOT stop simple cross-site form POSTs (cookies attach
// automatically), so state-changing routes need an explicit Origin/Referer
// gate. Safe methods, server-to-server webhooks, and non-browser clients
// (no Origin) always pass through.
const EXEMPT_PREFIXES = ["/api/payments/webhook"];

const normalize = (origin) => String(origin || "").trim().replace(/\/+$/, "");

const configuredOrigins = () =>
  [process.env.FRONTEND_URL, process.env.ADMIN_FRONTEND_URL]
    .filter(Boolean)
    .flatMap((value) => String(value).split(","))
    .map(normalize)
    .filter(Boolean);

export const verifyOrigin = (req, res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  if (EXEMPT_PREFIXES.some((p) => req.path === p || req.originalUrl.startsWith(p))) {
    return next();
  }

  const origin = normalize(req.headers.origin);
  const referer = String(req.headers.referer || "");

  // Non-browser clients send neither — no CSRF possible.
  if (!origin && !referer) return next();

  // Same-origin requests are always legitimate.
  if (origin) {
    try {
      if (new URL(origin).host === String(req.headers.host || "").split(",")[0].trim()) {
        return next();
      }
    } catch {
      // fall through to allowlist check
    }
  }

  const allowed = configuredOrigins();
  // Fail open when no origins are configured (local dev) rather than
  // bricking every mutation.
  if (allowed.length === 0) return next();

  const ok =
    (origin && allowed.includes(origin)) ||
    allowed.some((a) => origin === a || (referer && referer.startsWith(a)));

  if (!ok) {
    return res.status(403).json({
      success: false,
      message: "Request origin not allowed",
    });
  }

  next();
};

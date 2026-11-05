// [SITE-LOCK] testing gate — delete this file to remove the lock.
import {
  hasSiteGate,
  isSiteGateEnabled,
  issueSiteGateCookie,
  passwordsMatch,
} from "../middlewares/siteGate.middleware.js";

// POST /api/site-gate/unlock { password } — the ONLY way in. The password
// itself never ships to the client; the browser only ever holds the signed
// HttpOnly cookie, so console tricks can't fake it.
export const unlockSite = async (req, res) => {
  try {
    if (!isSiteGateEnabled()) {
      return res.status(200).json({ success: true, data: { unlocked: true } });
    }
    const { password } = req.body || {};
    if (typeof password !== "string" || password.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Password required.",
      });
    }
    if (!passwordsMatch(password)) {
      return res.status(401).json({
        success: false,
        message: "Wrong password.",
      });
    }
    issueSiteGateCookie(res);
    return res.status(200).json({ success: true, data: { unlocked: true } });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// GET /api/site-gate/status — lets the client re-sync when its local flag
// says unlocked but the cookie is missing/expired.
export const siteGateStatus = async (req, res) => {
  const locked = isSiteGateEnabled() && !hasSiteGate(req);
  return res.status(200).json({ success: true, data: { locked } });
};

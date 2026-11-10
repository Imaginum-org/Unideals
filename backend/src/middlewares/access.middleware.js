import { can } from "../services/access.service.js";

/**
 * Guards an admin route by section and level instead of a fixed role list.
 * Super Admins always pass; Support passes when the stored policy allows it.
 * Run after `auth`.
 */
export const requireAccess = (feature, level = "view") => async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: true, message: "Authentication required" });
  }
  try {
    if (await can(req.user, feature, level)) return next();
  } catch {
    return res.status(503).json({ success: false, error: true, message: "Could not check access, try again" });
  }
  return res.status(403).json({
    success: false,
    error: true,
    message: level === "manage" ? "Your role can view this section but not make changes here" : "Your role doesn't have access to this section",
  });
};

export default requireAccess;

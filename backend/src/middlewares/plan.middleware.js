import { USER_TIER } from "../config/constants.js";

// Role-style guard for paid tiers. Services enforce usage limits inline;
// this middleware is for routes that are entirely tier-gated.
export const requireTier = (...allowedTiers) => {
  const allowed = allowedTiers.length > 0 ? allowedTiers : Object.values(USER_TIER);
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Access token required",
        success: false,
        error: true,
      });
    }
    if (!allowed.includes(req.user.subscription)) {
      return res.status(403).json({
        message: "This feature requires a higher plan.",
        success: false,
        error: true,
        code: "PLAN_REQUIRED",
        currentTier: req.user.subscription,
      });
    }
    next();
  };
};

export default requireTier;

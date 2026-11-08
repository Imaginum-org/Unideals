import { hasLabsFeature, labsForUser } from "../config/labs.js";
import { getPriceInsights } from "../services/labs.service.js";

// GET /api/user/labs — which early-access features this account has.
export const getMyLabs = (req, res) => {
  res.set("Cache-Control", "private, no-store");
  return res.status(200).json({ success: true, data: labsForUser(req.user) });
};

// GET /api/product/price-insights?category=&condition=
// Labs: "price_insights" (Pro & Pro+); demand only with "demand_meter" (Pro+).
export const priceInsights = async (req, res, next) => {
  try {
    if (!hasLabsFeature(req.user, "price_insights")) {
      return res.status(403).json({
        success: false,
        code: "PLAN_REQUIRED",
        message: "Smart price suggestions are an early-access feature for Pro and Pro Plus.",
      });
    }
    const campusId = req.user?.campus_id?._id || req.user?.campus_id;
    const data = await getPriceInsights({
      campusId,
      category: String(req.query.category || ""),
      condition: String(req.query.condition || ""),
      includeDemand: hasLabsFeature(req.user, "demand_meter"),
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    return next(error);
  }
};

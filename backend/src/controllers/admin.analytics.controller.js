import * as analyticsService from "../services/analytics.service.js";
import { safeErrorMessage } from "../utils/response.js";
import { cachedAdminStat, queryKey, viewKey } from "../utils/adminStatsCache.js";

// Section access + campus limit from attachAccess (see admin.routes.js).
const contextOf = (req) => {
  const permissions = req.access?.permissions || {};
  return { scope: req.campusScope || null, can: (section) => Boolean(permissions[section]?.view) };
};

// Same chart, same filters, same viewer access -> one computation per TTL.
const respond = (fn, message, name) => async (req, res) => {
  try {
    const key = `analytics:${name}:${viewKey(req.campusScope, req.access?.permissions)}:${queryKey(req.query)}`;
    const data = await cachedAdminStat(key, () => fn(req.query, contextOf(req)));
    return res.status(200).json({ success: true, error: false, message, data });
  } catch (error) {
    return res.status(error?.statusCode || 400).json({
      success: false,
      error: true,
      message: safeErrorMessage(error, "Could not load analytics"),
    });
  }
};

// GET /admin/analytics/trends?metrics=&from=&to=&interval=&compareFrom=&compareTo=&tz=
export const getTrends = respond(analyticsService.getTrends, "Trends fetched", "trends");

// GET /admin/analytics/breakdown?dims=&from=&to=&tz= (+ page filters per dimension)
export const getBreakdowns = respond(analyticsService.getBreakdowns, "Breakdowns fetched", "breakdown");

// GET /admin/analytics/jobs?from=&to=&interval=&key=&tz=
export const getJobAnalytics = respond(analyticsService.getJobAnalytics, "Job analytics fetched", "jobs");

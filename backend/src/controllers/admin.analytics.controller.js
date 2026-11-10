import * as analyticsService from "../services/analytics.service.js";
import { safeErrorMessage } from "../utils/response.js";

// Section access + campus limit from attachAccess (see admin.routes.js).
const contextOf = (req) => {
  const permissions = req.access?.permissions || {};
  return { scope: req.campusScope || null, can: (section) => Boolean(permissions[section]?.view) };
};

const respond = (fn, message) => async (req, res) => {
  try {
    const data = await fn(req.query, contextOf(req));
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
export const getTrends = respond(analyticsService.getTrends, "Trends fetched");

// GET /admin/analytics/breakdown?dims=&from=&to=&tz= (+ page filters per dimension)
export const getBreakdowns = respond(analyticsService.getBreakdowns, "Breakdowns fetched");

// GET /admin/analytics/jobs?from=&to=&interval=&key=&tz=
export const getJobAnalytics = respond(analyticsService.getJobAnalytics, "Job analytics fetched");

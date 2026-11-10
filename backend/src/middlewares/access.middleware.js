import mongoose from "mongoose";
import { accessFor } from "../services/access.service.js";
import * as scope from "../services/campusScope.service.js";

const deny = (res, status, message) => res.status(status).json({ success: false, error: true, message });

// Loads the caller's access once per request: req.access = { permissions, campuses },
// req.campusScope = null (every campus) or [campus ObjectIds].
const loadAccess = async (req) => {
  if (!req.access) {
    const access = await accessFor(req.user);
    req.campusScope = access.campuses.length ? access.campuses.map((id) => new mongoose.Types.ObjectId(id)) : null;
    req.access = access;
  }
  return req.access;
};

/**
 * Guards an admin route by section and level instead of a fixed role list.
 * Super Admins always pass; Support passes when the stored policy allows it.
 * Also attaches the caller's campus limit for the handlers. Run after `auth`.
 */
export const requireAccess = (feature, level = "view") => async (req, res, next) => {
  if (!req.user) return deny(res, 401, "Authentication required");
  try {
    const access = await loadAccess(req);
    if (access.permissions[feature]?.[level]) return next();
  } catch {
    return deny(res, 503, "Could not check access, try again");
  }
  return deny(
    res,
    403,
    level === "manage" ? "Your role can view this section but not make changes here" : "Your role doesn't have access to this section",
  );
};

/** Attaches req.access / req.campusScope without checking a section (staff-only routes). */
export const attachAccess = async (req, res, next) => {
  try {
    await loadAccess(req);
    return next();
  } catch {
    return deny(res, 503, "Could not check access, try again");
  }
};

/** Blocks campus-limited staff (actions that affect every campus). */
export const requireAllCampuses = (message = "This needs access to every campus") => async (req, res, next) => {
  try {
    await loadAccess(req);
  } catch {
    return deny(res, 503, "Could not check access, try again");
  }
  return req.campusScope ? deny(res, 403, message) : next();
};

const CHECKS = {
  user: [scope.isUserInScope, "User"],
  product: [scope.isProductInScope, "Listing"],
  order: [scope.isDealInScope, "Order"],
  campus: [async (s, id) => scope.isCampusInScope(s, id), "Campus"],
};

/**
 * 404s when the record named by `pick(req)` is outside the caller's campuses
 * (404 rather than 403 so other campuses' ids reveal nothing).
 */
export const requireInScope = (kind, pick = (req) => req.params.id) => async (req, res, next) => {
  try {
    await loadAccess(req);
    if (!req.campusScope) return next();
    const [check, label] = CHECKS[kind];
    if (await check(req.campusScope, pick(req))) return next();
    return deny(res, 404, `${label} not found in your campuses`);
  } catch {
    return deny(res, 503, "Could not check access, try again");
  }
};

/** Same for a report target given as { targetId, targetModel } in the body or query. */
export const requireReportTargetInScope = (source = "body") => async (req, res, next) => {
  try {
    await loadAccess(req);
    if (!req.campusScope) return next();
    const { targetId, targetModel } = req[source] || {};
    if (await scope.isReportTargetInScope(req.campusScope, targetId, targetModel)) return next();
    return deny(res, 404, "Report not found in your campuses");
  } catch {
    return deny(res, 503, "Could not check access, try again");
  }
};

export default requireAccess;

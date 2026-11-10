import User from "../models/User.model.js";
import Product from "../models/Product.model.js";
import Report from "../models/Report.model.js";
import { JobState } from "../models/JobRun.model.js";
import { REPORT_STATUS } from "../config/constants.js";
import * as accessService from "../services/access.service.js";
import { safeErrorMessage } from "../utils/response.js";

const ok = (res, message, data) => res.status(200).json({ success: true, error: false, message, data });
const fail = (res, error) =>
  res.status(error?.statusCode || 400).json({ success: false, error: true, message: safeErrorMessage(error, "Request failed") });

// GET /admin/access — catalogue, my effective access, and (Super Admin) the support policy.
export const getAccess = async (req, res) => {
  try {
    return ok(res, "Access fetched", await accessService.getAccessOverview(req.user));
  } catch (error) {
    return fail(res, error);
  }
};

// PUT /admin/access/support — Super Admin only; audited.
export const updateSupportAccess = async (req, res) => {
  try {
    const result = await accessService.updateSupportPolicy(req.user, req.body?.permissions);
    return ok(res, result.changes ? "Support access updated" : "No changes to save", result);
  } catch (error) {
    return fail(res, error);
  }
};

// PUT /admin/access/staff/:userId — Super Admin only; custom access for one support person.
export const updatePersonAccess = async (req, res) => {
  try {
    const result = await accessService.setPersonAccess(req.user, req.params.userId, req.body?.permissions);
    return ok(res, result.changes ? "Access updated for this person" : "Custom access saved", result);
  } catch (error) {
    return fail(res, error);
  }
};

// DELETE /admin/access/staff/:userId — Super Admin only; back to the role defaults.
export const resetPersonAccess = async (req, res) => {
  try {
    const result = await accessService.resetPersonAccess(req.user, req.params.userId);
    return ok(res, "This person now follows the Support role defaults", result);
  } catch (error) {
    return fail(res, error);
  }
};

/**
 * GET /admin/attention — counts for the sidebar badges and inbox, limited to
 * the sections the caller can see (so support without Dashboard access still
 * gets their badges, and never sees counts for hidden sections).
 */
export const getAttention = async (req, res) => {
  try {
    const p = await accessService.permissionsFor(req.user);
    const zero = () => Promise.resolve(0);
    const [pendingReports, pendingGenderRequests, autoHiddenListings, failingJobs] = await Promise.all([
      p.reports.view ? Report.countDocuments({ status: REPORT_STATUS.PENDING }) : zero(),
      p.genderRequests.view ? User.countDocuments({ "genderChangeRequest.status": "pending" }) : zero(),
      p.listings.view ? Product.countDocuments({ auto_hidden_at: { $ne: null }, is_deleted: false }) : zero(),
      p.jobs.view ? JobState.countDocuments({ last_status: "failed" }) : zero(),
    ]);
    return ok(res, "Attention counts fetched", { pendingReports, pendingGenderRequests, autoHiddenListings, failingJobs });
  } catch (error) {
    return fail(res, error);
  }
};

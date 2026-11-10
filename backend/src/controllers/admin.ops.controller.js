import crypto from "node:crypto";
import User from "../models/User.model.js";
import { JobRun, JobState } from "../models/JobRun.model.js";
import { PRODUCT_STATUS, USER_STATUS } from "../config/constants.js";
import * as moderationService from "../services/moderation.service.js";
import { expectedIntervalMs, listJobDefinitions, runJob } from "../jobs/jobRegistry.js";
import { safeErrorMessage } from "../utils/response.js";
import { getSystemStatus } from "../services/systemStatus.service.js";
import { isProductInScope, isUserInScope, outOfScope } from "../services/campusScope.service.js";

const ok = (res, message, payload = {}) => res.status(200).json({ success: true, error: false, message, ...payload });
const fail = (res, error) =>
  res.status(error?.statusCode || 400).json({ success: false, error: true, message: safeErrorMessage(error, "Request failed") });
const badRequest = (message) => Object.assign(new Error(message), { statusCode: 400 });

// ─── Report evidence ──────────────────────────────────────────────────────

export const getTargetReports = async (req, res) => {
  try {
    const data = await moderationService.getTargetReports({
      targetId: req.query.targetId,
      targetModel: req.query.targetModel,
      includeClosed: req.query.includeClosed === "true",
    });
    return ok(res, "Reports fetched", { data });
  } catch (error) {
    return fail(res, error);
  }
};

// ─── Bulk actions ─────────────────────────────────────────────────────────

const PRODUCT_BULK_ACTIONS = [PRODUCT_STATUS.BLOCKED, PRODUCT_STATUS.UNLISTED, PRODUCT_STATUS.LISTED, "delete"];

export const bulkProducts = async (req, res) => {
  try {
    const { ids, action, reason } = req.body || {};
    if (!PRODUCT_BULK_ACTIONS.includes(action)) throw badRequest("Invalid bulk action");
    const data = await moderationService.runBulk(ids, async (productId) => {
      // Campus-limited staff: items outside their campuses fail individually.
      if (!(await isProductInScope(req.campusScope, productId))) throw outOfScope("Listing");
      return action === "delete"
        ? moderationService.deleteProductPermanently({ productId, reason, actor: req.user, bulk: true })
        : moderationService.moderateProductStatus({ productId, status: action, reason, actor: req.user, bulk: true });
    });
    return ok(res, `${data.succeeded} updated${data.failed ? `, ${data.failed} failed` : ""}`, { data });
  } catch (error) {
    return fail(res, error);
  }
};

export const bulkUsers = async (req, res) => {
  try {
    const { ids, status, reason } = req.body || {};
    if (![USER_STATUS.SUSPENDED, USER_STATUS.ACTIVE].includes(status)) throw badRequest("Invalid bulk status");
    // Never let an admin suspend themselves through a bulk selection.
    const selfId = String(req.user._id);
    const targetIds = Array.isArray(ids) ? ids.filter((id) => String(id) !== selfId) : ids;
    const data = await moderationService.runBulk(targetIds, async (userId) => {
      if (!(await isUserInScope(req.campusScope, userId))) throw outOfScope("User");
      return moderationService.moderateUserStatus({ userId, status, reason, actor: req.user, bulk: true });
    });
    return ok(res, `${data.succeeded} updated${data.failed ? `, ${data.failed} failed` : ""}`, { data });
  } catch (error) {
    return fail(res, error);
  }
};

// ─── Saved views (per staff member) ───────────────────────────────────────

const SAVED_VIEW_PAGES = ["users", "products", "orders", "moderation", "audit-log"];
const MAX_SAVED_VIEWS = 30;

const loadViews = async (userId) => {
  const user = await User.findById(userId).select("+admin_saved_views").lean();
  return user?.admin_saved_views || [];
};

export const listSavedViews = async (req, res) => {
  try {
    const views = await loadViews(req.user._id);
    const page = req.query.page;
    return ok(res, "Saved views fetched", { data: page ? views.filter((v) => v.page === page) : views });
  } catch (error) {
    return fail(res, error);
  }
};

export const createSavedView = async (req, res) => {
  try {
    const { page, name, query } = req.body || {};
    if (!SAVED_VIEW_PAGES.includes(page)) throw badRequest("Views can't be saved for this page");
    const cleanName = typeof name === "string" ? name.trim().slice(0, 60) : "";
    if (cleanName.length < 1) throw badRequest("Give the view a name");
    const cleanQuery = typeof query === "string" ? query.replace(/^\?/, "").slice(0, 1000) : "";
    // Only keep well-formed key=value pairs; drop paging so views open on page 1.
    const params = new URLSearchParams(cleanQuery);
    params.delete("page");

    const views = await loadViews(req.user._id);
    if (views.length >= MAX_SAVED_VIEWS) throw badRequest(`You can keep up to ${MAX_SAVED_VIEWS} saved views`);
    if (views.some((v) => v.page === page && v.name.toLowerCase() === cleanName.toLowerCase())) {
      throw badRequest("You already have a view with that name");
    }

    const view = { id: crypto.randomUUID(), page, name: cleanName, query: params.toString(), created_at: new Date() };
    await User.updateOne({ _id: req.user._id }, { $push: { admin_saved_views: view } });
    return res.status(201).json({ success: true, error: false, message: "View saved", data: view });
  } catch (error) {
    return fail(res, error);
  }
};

export const deleteSavedView = async (req, res) => {
  try {
    const result = await User.updateOne(
      { _id: req.user._id },
      { $pull: { admin_saved_views: { id: String(req.params.id) } } },
    );
    if (!result.modifiedCount) throw Object.assign(new Error("View not found"), { statusCode: 404 });
    return ok(res, "View deleted");
  } catch (error) {
    return fail(res, error);
  }
};

// ─── Service status ───────────────────────────────────────────────────────

export const systemStatus = async (req, res) => {
  try {
    const windowMinutes = Number.parseInt(req.query.window, 10) || 15;
    const data = await getSystemStatus({ windowMinutes, refreshExternal: req.query.refresh === "true" });
    res.set("Cache-Control", "no-store");
    return ok(res, "Status fetched", { data });
  } catch (error) {
    return fail(res, error);
  }
};

// ─── Background jobs ──────────────────────────────────────────────────────

const healthOf = (definition, state, now) => {
  if (!state?.last_run_at) return "never_run";
  // Overdue: no run within 2x the expected interval (+5 min slack).
  const allowance = expectedIntervalMs(definition.schedule) * 2 + 5 * 60 * 1000;
  const sinceLastRun = now - new Date(state.last_run_at).getTime();
  // A "running" state that old means the process died mid-run.
  if (state.last_status === "running") return sinceLastRun > allowance ? "overdue" : "running";
  if (state.last_status === "failed") return "failing";
  if (sinceLastRun > allowance) return "overdue";
  return "healthy";
};

export const listJobs = async (req, res) => {
  try {
    const definitions = listJobDefinitions();
    const keys = definitions.map((d) => d.key);
    const [states, recent] = await Promise.all([
      JobState.find({ key: { $in: keys } }).lean(),
      JobRun.aggregate([
        { $match: { key: { $in: keys } } },
        { $sort: { started_at: -1 } },
        { $group: { _id: "$key", runs: { $push: "$$ROOT" } } },
        { $project: { runs: { $slice: ["$runs", 5] } } },
      ]),
    ]);
    const stateMap = new Map(states.map((s) => [s.key, s]));
    const recentMap = new Map(recent.map((r) => [r._id, r.runs]));
    const now = Date.now();

    const data = definitions.map((definition) => {
      const state = stateMap.get(definition.key) || null;
      return {
        ...definition,
        health: definition.running ? "running" : healthOf(definition, state, now),
        lastRunAt: state?.last_run_at || null,
        lastFinishedAt: state?.last_finished_at || null,
        lastStatus: state?.last_status || null,
        lastDurationMs: state?.last_duration_ms ?? null,
        lastResult: state?.last_result || null,
        lastSuccessAt: state?.last_success_at || null,
        lastFailureAt: state?.last_failure_at || null,
        lastError: state?.last_error || null,
        runCount: state?.run_count || 0,
        failureCount: state?.failure_count || 0,
        consecutiveFailures: state?.consecutive_failures || 0,
        recentRuns: (recentMap.get(definition.key) || []).map(formatRun),
      };
    });
    return ok(res, "Jobs fetched", { data });
  } catch (error) {
    return fail(res, error);
  }
};

const formatRun = (run) => ({
  id: String(run._id),
  trigger: run.trigger,
  status: run.status,
  startedAt: run.started_at,
  finishedAt: run.finished_at,
  durationMs: run.duration_ms,
  result: run.result,
  error: run.error,
});

export const getJobRuns = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const match = { key: String(req.params.key) };
    if (req.query.status === "failed") match.status = "failed";
    const [total, runs] = await Promise.all([
      JobRun.countDocuments(match),
      JobRun.find(match).sort({ started_at: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);
    return ok(res, "Job runs fetched", {
      data: runs.map(formatRun),
      pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    return fail(res, error);
  }
};

export const triggerJob = async (req, res) => {
  try {
    const run = await runJob(String(req.params.key), { trigger: "manual", triggeredBy: req.user._id });
    return ok(res, run.status === "success" ? "Job finished" : "Job failed — see the error below", {
      data: { ...formatRun({ ...run, _id: "manual" }) },
    });
  } catch (error) {
    return fail(res, error);
  }
};

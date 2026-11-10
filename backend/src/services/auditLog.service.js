import mongoose from "mongoose";
import AuditLog from "../models/AuditLog.model.js";

/**
 * Append an audit entry. This is fire-and-forget — callers should
 * `await` it inside a try/catch so a log failure never breaks a
 * real admin action.
 */
export const logAdminAction = async ({
  actor,
  action,
  targetType,
  targetId,
  targetSnapshot = null,
  metadata = null,
  note = null,
}) => {
  return AuditLog.create({
    actor_id: actor?._id || actor?.id,
    actor_name: actor?.name || "System Admin",
    actor_role: actor?.role || "admin",
    action,
    target_type: targetType,
    target_id: targetId,
    target_snapshot: targetSnapshot,
    metadata,
    note,
  });
};

/**
 * Mongo filter for the audit-log query params (action, target_type,
 * actor_role, actor_id, from, to). Shared by the list and its charts.
 */
export const auditMatchFromQuery = (query = {}) => {
  const match = {};

  // Escape the filter: raw user input was used as a regex (ReDoS /
  // pattern injection), and a non-string (?action=a&action=b) crashed .trim().
  if (typeof query.action === "string" && query.action.trim()) {
    const safe = query.action
      .trim()
      .slice(0, 100)
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    match.action = { $regex: safe, $options: "i" };
  }

  if (query.target_type) {
    const validTypes = ["user", "product", "campus", "report", "order", "settings"];
    if (validTypes.includes(query.target_type)) {
      match.target_type = query.target_type;
    }
  }

  if (query.actor_role) {
    const validRoles = ["admin", "support"];
    if (validRoles.includes(query.actor_role)) {
      match.actor_role = query.actor_role;
    }
  }

  if (typeof query.actor_id === "string" && mongoose.Types.ObjectId.isValid(query.actor_id)) {
    match.actor_id = new mongoose.Types.ObjectId(query.actor_id);
  }

  const from = query.from ? new Date(query.from) : null;
  const to = query.to ? new Date(query.to) : null;
  if ((from && !Number.isNaN(from.getTime())) || (to && !Number.isNaN(to.getTime()))) {
    match.createdAt = {};
    if (from && !Number.isNaN(from.getTime())) match.createdAt.$gte = from;
    if (to && !Number.isNaN(to.getTime())) match.createdAt.$lte = to;
  }

  return match;
};

/**
 * Get paginated audit log entries with optional filters.
 */
export const getAuditLogs = async (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const match = auditMatchFromQuery(query);

  const [total, entries] = await Promise.all([
    AuditLog.countDocuments(match),
    AuditLog.find(match)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    data: entries.map((entry) => ({
      id: entry._id.toString(),
      actor_id: entry.actor_id?.toString(),
      actor_name: entry.actor_name,
      actor_role: entry.actor_role,
      action: entry.action,
      target_type: entry.target_type,
      target_id: entry.target_id?.toString(),
      target_snapshot: entry.target_snapshot,
      metadata: entry.metadata,
      note: entry.note,
      createdAt: entry.createdAt,
    })),
    pagination: { total, page, limit, totalPages },
  };
};

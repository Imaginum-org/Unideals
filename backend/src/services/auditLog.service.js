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
 * Get paginated audit log entries with optional filters.
 */
export const getAuditLogs = async (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const match = {};

  if (query.action && query.action.trim()) {
    match.action = { $regex: query.action.trim(), $options: "i" };
  }

  if (query.target_type) {
    const validTypes = ["user", "product", "campus", "report"];
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

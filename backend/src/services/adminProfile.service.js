import bcrypt from "bcrypt";
import mongoose from "mongoose";
import User from "../models/User.model.js";
import Campus from "../models/Campus.model.js";
import AuditLog from "../models/AuditLog.model.js";

const { ObjectId } = mongoose.Types;

const PROFILE_FIELDS =
  "name email avatar mobile role status campus_id createdAt last_login_date is_email_verified tokenVersion";

const httpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const formatEntry = (entry) => ({
  id: entry._id.toString(),
  action: entry.action,
  target_type: entry.target_type,
  target_id: entry.target_id?.toString(),
  target_snapshot: entry.target_snapshot,
  metadata: entry.metadata,
  note: entry.note,
  createdAt: entry.createdAt,
});

/**
 * Profile of the signed-in admin/support account plus a summary of
 * their own audit trail (what they've done, when they last acted).
 */
export const getAdminProfile = async (userId) => {
  if (!ObjectId.isValid(userId)) throw httpError("Invalid account", 401);

  const user = await User.findById(userId).select(PROFILE_FIELDS).lean();
  if (!user) throw httpError("Account not found", 404);

  const actorId = new ObjectId(String(userId));
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [campus, totalActions, last30d, last7d, byTarget, recent] = await Promise.all([
    user.campus_id
      ? Campus.findById(user.campus_id).select("name short_name").lean()
      : null,
    AuditLog.countDocuments({ actor_id: actorId }),
    AuditLog.countDocuments({ actor_id: actorId, createdAt: { $gte: since30d } }),
    AuditLog.countDocuments({ actor_id: actorId, createdAt: { $gte: since7d } }),
    AuditLog.aggregate([
      { $match: { actor_id: actorId } },
      { $group: { _id: "$target_type", count: { $sum: 1 } } },
    ]),
    AuditLog.find({ actor_id: actorId }).sort({ createdAt: -1 }).limit(8).lean(),
  ]);

  const actionsByTarget = { user: 0, product: 0, order: 0, campus: 0, report: 0 };
  byTarget.forEach((row) => {
    if (row._id in actionsByTarget) actionsByTarget[row._id] = row.count;
  });

  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    mobile: user.mobile ?? null,
    avatar: user.avatar ?? null,
    role: user.role,
    status: user.status,
    isEmailVerified: Boolean(user.is_email_verified),
    campus: campus ? { id: String(campus._id), name: campus.name, shortName: campus.short_name } : null,
    memberSince: user.createdAt,
    lastLoginAt: user.last_login_date,
    activity: {
      totalActions,
      last30d,
      last7d,
      byTarget: actionsByTarget,
      lastActionAt: recent[0]?.createdAt ?? null,
      recent: recent.map(formatEntry),
    },
  };
};

/**
 * Self-service edits are limited to display details. Email and role are
 * identity/privilege fields and stay admin-managed.
 */
export const updateAdminProfile = async (userId, body = {}) => {
  const updates = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string") throw httpError("Name must be text");
    const name = body.name.trim().replace(/\s+/g, " ");
    if (name.length < 2 || name.length > 100) {
      throw httpError("Name must be between 2 and 100 characters");
    }
    updates.name = name;
  }

  if (body.mobile !== undefined) {
    if (body.mobile === null || body.mobile === "") {
      updates.mobile = null;
    } else {
      const mobile = String(body.mobile).replace(/\D/g, "");
      if (!/^\d{10}$/.test(mobile)) throw httpError("Mobile must be 10 digits");
      updates.mobile = mobile;
    }
  }

  if (Object.keys(updates).length === 0) throw httpError("Nothing to update");

  await User.updateOne({ _id: userId }, { $set: updates }, { runValidators: true });
  return getAdminProfile(userId);
};

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,128}$/;

/**
 * Change password and revoke every other session. Returns the new token
 * version so the caller can re-issue cookies for the current session.
 */
export const changeAdminPassword = async (userId, { currentPassword, newPassword } = {}) => {
  if (typeof currentPassword !== "string" || !currentPassword) {
    throw httpError("Current password is required");
  }
  if (typeof newPassword !== "string" || !PASSWORD_RULE.test(newPassword)) {
    throw httpError("New password must be 8+ characters with at least one letter and one number");
  }
  if (currentPassword === newPassword) {
    throw httpError("New password must be different from the current one");
  }

  const user = await User.findById(userId).select("+password tokenVersion");
  if (!user) throw httpError("Account not found", 404);

  const valid = user.password ? await bcrypt.compare(currentPassword, user.password) : false;
  if (!valid) throw httpError("Current password is incorrect");

  const hashed = await bcrypt.hash(newPassword, 10);
  const updated = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        password: hashed,
        refresh_token: null,
        refresh_token_prev: null,
        refresh_token_prev_expires_at: null,
      },
      $inc: { tokenVersion: 1 },
    },
    { returnDocument: "after" },
  )
    .select("tokenVersion")
    .lean();

  return { tokenVersion: updated?.tokenVersion ?? 0 };
};

import mongoose from "mongoose";
import Product from "../models/Product.model.js";
import User from "../models/User.model.js";
import Report from "../models/Report.model.js";
import { PRODUCT_STATUS, REPORT_STATUS, USER_STATUS } from "../config/constants.js";
import * as adminProductService from "./admin.product.service.js";
import * as adminUserService from "./admin.user.service.js";
import { logAdminAction } from "./auditLog.service.js";
import { notifyListingModerated, notifyReporterOutcome } from "./notification.service.js";

/**
 * Every staff moderation action goes through here so single actions, the
 * Reports page and bulk actions all audit and notify the same way:
 *   - the seller is told what happened to their listing (and why)
 *   - reporters hear back when their report is closed
 *   - auto-hidden listings are cleared once staff have reviewed them
 */

const { ObjectId } = mongoose.Types;

export const BULK_LIMIT = 100;

const httpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const PRODUCT_AUDIT_ACTIONS = {
  [PRODUCT_STATUS.BLOCKED]: "product.block",
  [PRODUCT_STATUS.UNLISTED]: "product.unlist",
  [PRODUCT_STATUS.LISTED]: "product.activate",
};

const cleanReason = (reason) =>
  typeof reason === "string" && reason.trim() ? reason.trim().slice(0, 500) : null;

/**
 * Change a listing's status as staff. Clears any auto-hide hold (staff have
 * now reviewed it) and tells the seller.
 */
export const moderateProductStatus = async ({ productId, status, reason = null, actor, bulk = false }) => {
  if (!ObjectId.isValid(productId)) throw httpError("Invalid product id");
  const before = await Product.findOne({ _id: productId, is_deleted: false })
    .select("title status seller_id auto_hidden_at")
    .lean();
  if (!before) throw httpError("Product not found", 404);

  const product = await adminProductService.updateProductStatus(productId, status);
  await Product.updateOne(
    { _id: productId },
    {
      $set: {
        auto_hidden_at: null,
        auto_hidden_report_count: 0,
        ...(status !== PRODUCT_STATUS.LISTED ? { is_boosted: false } : {}),
      },
    },
  );

  const note = cleanReason(reason);
  logAdminAction({
    actor,
    action: PRODUCT_AUDIT_ACTIONS[status] || "product.status_change",
    targetType: "product",
    targetId: productId,
    targetSnapshot: { title: before.title },
    metadata: { newStatus: status, previousStatus: before.status, ...(bulk ? { bulk: true } : {}) },
    note,
  }).catch(() => {});

  if (before.status !== status) {
    const action =
      status === PRODUCT_STATUS.BLOCKED
        ? "blocked"
        : status === PRODUCT_STATUS.UNLISTED
          ? "unlisted"
          : status === PRODUCT_STATUS.LISTED
            ? "reinstated"
            : null;
    if (action) {
      notifyListingModerated({ sellerId: before.seller_id, productTitle: before.title, action, reason: note }).catch(() => {});
    }
  }
  return product;
};

/**
 * Permanently delete a listing as staff, telling the seller first.
 */
export const deleteProductPermanently = async ({ productId, reason = null, actor, bulk = false }) => {
  if (!ObjectId.isValid(productId)) throw httpError("Invalid product id");
  const snapshot = await Product.findById(productId).select("title category seller_id").lean();
  if (!snapshot) throw httpError("Product not found", 404);

  const note = cleanReason(reason);
  // Hard delete wipes the listing's reports, so close them (and tell the
  // reporters) first.
  await closeReports({
    targetId: productId,
    targetModel: "Product",
    outcome: "resolved",
    adminNote: note ? `Listing deleted: ${note}` : "Listing deleted",
    actor,
  }).catch(() => {});

  const result = await adminProductService.hardDeleteProduct(productId);

  logAdminAction({
    actor,
    action: "product.hard_delete",
    targetType: "product",
    targetId: productId,
    targetSnapshot: { title: snapshot.title, category: snapshot.category },
    metadata: bulk ? { bulk: true } : null,
    note,
  }).catch(() => {});
  notifyListingModerated({ sellerId: snapshot.seller_id, productTitle: snapshot.title, action: "deleted", reason: note }).catch(() => {});
  return result;
};

/**
 * Suspend / reactivate a user as staff (with audit). Suspending already
 * revokes sessions and unlists their listings in the user service.
 */
export const moderateUserStatus = async ({ userId, status, reason = null, actor, bulk = false }) => {
  const user = await adminUserService.updateUserStatus(userId, status);
  logAdminAction({
    actor,
    action:
      status === USER_STATUS.SUSPENDED ? "user.suspend" : status === USER_STATUS.ACTIVE ? "user.activate" : "user.status_change",
    targetType: "user",
    targetId: userId,
    targetSnapshot: { name: user.name, email: user.email },
    metadata: { newStatus: status, ...(bulk ? { bulk: true } : {}) },
    note: cleanReason(reason),
  }).catch(() => {});
  return user;
};

/**
 * Apply one action to many targets. Each item succeeds or fails on its own;
 * the caller gets a per-id result so the UI can report partial failures.
 */
export const runBulk = async (ids, handler) => {
  if (!Array.isArray(ids) || ids.length === 0) throw httpError("Select at least one item");
  const unique = [...new Set(ids.map(String))];
  if (unique.length > BULK_LIMIT) throw httpError(`You can act on at most ${BULK_LIMIT} items at once`);
  if (unique.some((id) => !ObjectId.isValid(id))) throw httpError("One or more ids are invalid");

  const results = [];
  // Sequential on purpose: keeps DB load predictable and audit order stable.
  for (const id of unique) {
    try {
      await handler(id);
      results.push({ id, ok: true });
    } catch (error) {
      results.push({ id, ok: false, error: error.statusCode && error.statusCode < 500 ? error.message : "Failed" });
    }
  }
  return {
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  };
};

/**
 * Close every pending report on a target and tell each reporter the outcome.
 * outcome: "resolved" | "dismissed".
 * A dismissed auto-hidden listing goes live again (no violation found).
 */
export const closeReports = async ({ targetId, targetModel, outcome, adminNote = null, actor }) => {
  if (!ObjectId.isValid(targetId)) throw httpError("Invalid target id");
  if (!["Product", "User", "Support"].includes(targetModel)) throw httpError("Invalid target model");

  const match = { target_id: new ObjectId(targetId), target_model: targetModel, status: REPORT_STATUS.PENDING };
  const pending = await Report.find(match).select("reporter_id").lean();

  const now = new Date();
  const update =
    outcome === "resolved"
      ? { status: REPORT_STATUS.ACTION_TAKEN, admin_note: cleanReason(adminNote) || "Resolved by moderator", reviewed_at: now }
      : { status: REPORT_STATUS.DISMISSED, reviewed_at: now };
  const result = await Report.updateMany(match, { $set: { ...update, reporter_notified_at: now } });

  logAdminAction({
    actor,
    action: outcome === "resolved" ? "report.resolve" : "report.dismiss",
    targetType: "report",
    targetId: new ObjectId(targetId),
    metadata: { targetModel, count: result.modifiedCount },
    note: outcome === "resolved" ? cleanReason(adminNote) : null,
  }).catch(() => {});

  // Label for the reporter message (listing title only; never a user's name).
  let targetLabel = null;
  if (targetModel === "Product") {
    const product = await Product.findById(targetId).select("title status auto_hidden_at seller_id").lean();
    targetLabel = product?.title || null;

    if (product?.auto_hidden_at) {
      if (outcome === "dismissed" && product.status === PRODUCT_STATUS.UNLISTED) {
        // Reports were unfounded: put the listing back and tell the seller.
        await Product.updateOne(
          { _id: product._id },
          { $set: { status: PRODUCT_STATUS.LISTED, auto_hidden_at: null, auto_hidden_report_count: 0 } },
        );
        notifyListingModerated({ sellerId: product.seller_id, productTitle: product.title, action: "reinstated" }).catch(() => {});
      } else {
        // Reviewed: lift the hold so the seller can fix and relist.
        await Product.updateOne({ _id: product._id }, { $set: { auto_hidden_at: null, auto_hidden_report_count: 0 } });
      }
    }
  }

  const reporterIds = [...new Set(pending.map((r) => r.reporter_id && String(r.reporter_id)).filter(Boolean))];
  await Promise.allSettled(
    reporterIds.map((reporterId) => notifyReporterOutcome({ reporterId, targetModel, targetLabel, outcome })),
  );

  return { closedCount: result.modifiedCount, notifiedReporters: reporterIds.length };
};

/**
 * Individual reports on one target, with chat evidence, for the review panel.
 */
export const getTargetReports = async ({ targetId, targetModel, includeClosed = false }) => {
  if (!ObjectId.isValid(targetId)) throw httpError("Invalid target id");
  if (!["Product", "User", "Support"].includes(targetModel)) throw httpError("Invalid target model");

  const match = { target_id: new ObjectId(targetId), target_model: targetModel };
  if (!includeClosed) match.status = REPORT_STATUS.PENDING;

  const reports = await Report.find(match)
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("reporter_id", "name email avatar status")
    .lean();

  // Resolve names for everyone who appears in a captured chat.
  const senderIds = new Set();
  reports.forEach((r) => (r.chat_snapshot || []).forEach((m) => m.sender_id && senderIds.add(String(m.sender_id))));
  const senders = senderIds.size
    ? await User.find({ _id: { $in: [...senderIds] } }).select("name avatar").lean()
    : [];
  const senderMap = new Map(senders.map((u) => [String(u._id), { id: String(u._id), name: u.name, avatar: u.avatar }]));

  return reports.map((r) => ({
    id: String(r._id),
    reason: r.reason,
    description: r.description || null,
    status: r.status,
    adminNote: r.admin_note || null,
    createdAt: r.createdAt,
    reviewedAt: r.reviewed_at || null,
    reporterNotifiedAt: r.reporter_notified_at || null,
    evidence: r.evidence || [],
    reporter: r.reporter_id
      ? {
          id: String(r.reporter_id._id),
          name: r.reporter_id.name,
          email: r.reporter_id.email,
          avatar: r.reporter_id.avatar,
          status: r.reporter_id.status,
        }
      : r.reporter_email
        ? { id: null, name: r.reporter_name || "Guest", email: r.reporter_email }
        : null,
    conversationId: r.conversation_id ? String(r.conversation_id) : null,
    chat: (r.chat_snapshot || []).map((m) => ({
      id: m.message_id ? String(m.message_id) : null,
      sender: senderMap.get(String(m.sender_id)) || { id: String(m.sender_id), name: "Unknown" },
      type: m.message_type,
      text: m.text,
      isEdited: m.is_edited,
      isFlagged: m.is_flagged,
      sentAt: m.sent_at,
    })),
  }));
};

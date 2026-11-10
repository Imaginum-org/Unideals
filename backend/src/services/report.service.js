import mongoose from "mongoose";

import Report from "../models/Report.model.js";
import Product from "../models/Product.model.js";
import User from "../models/User.model.js";
import { PRODUCT_STATUS, REPORT_STATUS } from "../config/constants.js";
import { supportPriorityFor } from "../utils/planPerks.js";
import { notifyListingModerated, notifyModerationWarning } from "./notification.service.js";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";

// How many recent messages are captured as evidence with a chat report.
export const CHAT_SNAPSHOT_LIMIT = 40;

/**
 * Evidence for a report filed from a chat. The reporter must be a
 * participant, and (for user reports) the reported user must be the other
 * participant, so nobody can pull an arbitrary conversation into a report.
 * For product reports the chat must be about that product.
 * Returns null when no conversation id was sent.
 */
const buildChatEvidence = async ({ conversationId, reporterId, targetUserId = null, productId = null }) => {
  if (!conversationId) return null;
  if (!mongoose.Types.ObjectId.isValid(conversationId)) throw badRequest("Invalid conversation id");

  const conversation = await Conversation.findById(conversationId)
    .select("buyer_id seller_id product_id")
    .lean();
  if (!conversation) throw badRequest("Conversation not found");

  const participants = [String(conversation.buyer_id), String(conversation.seller_id)];
  if (!participants.includes(String(reporterId))) {
    throw badRequest("You can only attach a conversation you are part of");
  }
  if (targetUserId && !participants.includes(String(targetUserId))) {
    throw badRequest("That user is not part of this conversation");
  }
  if (productId && String(conversation.product_id) !== String(productId)) {
    throw badRequest("This conversation is not about that listing");
  }

  const recent = await Message.find({ conversation_id: conversation._id })
    .sort({ createdAt: -1 })
    .limit(CHAT_SNAPSHOT_LIMIT)
    .select("sender_id message_type text is_edited is_flagged createdAt")
    .lean();

  return {
    conversation_id: conversation._id,
    chat_snapshot: recent.reverse().map((m) => ({
      message_id: m._id,
      sender_id: m.sender_id,
      message_type: m.message_type,
      text: typeof m.text === "string" ? m.text.slice(0, 4000) : "",
      is_edited: Boolean(m.is_edited),
      is_flagged: Boolean(m.is_flagged),
      sent_at: m.createdAt,
    })),
  };
};

const cleanEvidence = (evidence) =>
  Array.isArray(evidence) && evidence.length ? evidence.slice(0, 3) : undefined;

const MAX_REPORTS_PER_HOUR = 10;
// Cross-user per-target throttle: at most 20 reports/hour land on the same
// target (brigading guard). In-memory best-effort; restart only resets it.
const MAX_TARGET_REPORTS_PER_HOUR = 20;
const targetThrottle = new Map();

const checkTargetThrottle = (targetId) => {
  const key = String(targetId);
  const now = Date.now();
  const windowStart = now - 60 * 60 * 1000;
  const hits = (targetThrottle.get(key) || []).filter((at) => at >= windowStart);
  if (hits.length >= MAX_TARGET_REPORTS_PER_HOUR) {
    throw new Error("Too many reports for this target. Please try again later.");
  }
  hits.push(now);
  targetThrottle.set(key, hits);
  if (targetThrottle.size > 2000) {
    for (const [k, times] of targetThrottle) {
      if (!times.some((at) => at >= windowStart)) targetThrottle.delete(k);
      if (targetThrottle.size <= 1500) break;
    }
  }
};

const badRequest = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const assertDescription = (description) => {
  if (description !== undefined && String(description).trim().length < 10) {
    throw badRequest("Description must be at least 10 characters");
  }
};

const validateReportRateLimit = async (userId) => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const reportsCount = await Report.countDocuments({
    reporter_id: userId,
    createdAt: { $gte: oneHourAgo },
  });

  if (reportsCount >= MAX_REPORTS_PER_HOUR) {
    throw new Error("Too many reports submitted. Please try again later.");
  }
};

export const reportProduct = async (productId, data, user) => {
  // Validate Product ID
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error("Invalid product ID");
  }

  // Validate Report Reason
  if (!data.reason) {
    throw new Error("Report reason is required");
  }

  assertDescription(data.description);

  // Check Product Exists
  const product = await Product.findOne({
    _id: productId,
    is_deleted: false,
  })
    .select("seller_id title auto_hidden_at")
    .lean();

  if (!product) {
    throw new Error("Product not found");
  }

  // Prevent Self Report
  if (product.seller_id.toString() === user._id.toString()) {
    throw new Error("You cannot report your own product");
  }

  // Rate Limit Validation
  await validateReportRateLimit(user._id);
  // Cross-user brigading throttle for this target.
  checkTargetThrottle(productId);

  try {
    const chatEvidence = await buildChatEvidence({
      conversationId: data.conversation_id,
      reporterId: user._id,
      productId,
    });
    const report = await Report.create({
      reporter_id: user._id,
      evidence: cleanEvidence(data.evidence),
      ...(chatEvidence || {}),

      target_id: productId,
      target_model: "Product",

      reason: data.reason,
      description: data.description,
    });

    // Auto-hide: 5+ pending reports unlists the product (best-effort) so a
    // reported listing stops getting impressions pending moderator review.
    try {
      const pendingCount = await Report.countDocuments({
        target_id: productId,
        target_model: "Product",
        status: REPORT_STATUS.PENDING,
      });
      if (pendingCount >= 5) {
        await Product.updateOne(
          { _id: productId },
          {
            $set: {
              status: PRODUCT_STATUS.UNLISTED,
              is_boosted: false,
              // Marks it for staff review and blocks seller relisting.
              auto_hidden_at: new Date(),
              auto_hidden_report_count: pendingCount,
            },
            $unset: { boost_expires_at: "", boost_tier: "" },
          },
        );
        try {
          const { default: Boost } = await import("../models/Boost.model.js");
          await Boost.deleteMany({ product_id: productId, status: "active" });
        } catch {
          // ignore boost cleanup failures
        }
        // Only notify on the first hide (later reports keep it hidden).
        if (!product.auto_hidden_at) {
          notifyListingModerated({
            sellerId: product.seller_id,
            productTitle: product.title,
            action: "auto_hidden",
          }).catch(() => {});
        }
      }
    } catch {
      // auto-hide must never fail the report submission
    }

    return report;
  } catch (error) {
    // Duplicate Report
    if (error.code === 11000) {
      throw new Error("You have already reported this product");
    }

    throw error;
  }
};

export const reportUser = async (targetUserId, data, user) => {
  // Validate User ID
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    throw new Error("Invalid user ID");
  }

  // Validate Report Reason
  if (!data.reason) {
    throw new Error("Report reason is required");
  }

  assertDescription(data.description);

  // Prevent Self Report
  if (targetUserId.toString() === user._id.toString()) {
    throw new Error("You cannot report yourself");
  }

  // Check User Exists
  const targetUser = await User.findOne({
    _id: targetUserId,
  })
    .select("_id")
    .lean();

  if (!targetUser) {
    throw new Error("User not found");
  }

  // Rate Limit Validation
  await validateReportRateLimit(user._id);
  // Cross-user brigading throttle for this target.
  checkTargetThrottle(targetUserId);

  try {
    const chatEvidence = await buildChatEvidence({
      conversationId: data.conversation_id,
      reporterId: user._id,
      targetUserId,
    });
    const report = await Report.create({
      reporter_id: user._id,
      evidence: cleanEvidence(data.evidence),
      ...(chatEvidence || {}),

      target_id: targetUserId,
      target_model: "User",

      reason: data.reason,
      description: data.description,
    });

    return report;
  } catch (error) {
    // Duplicate Report
    if (error.code === 11000) {
      throw new Error("You have already reported this user");
    }

    throw error;
  }
};

export const reportSupport = async (rawData, user) => {
  // Coerce every field to a bounded string: arrays/objects from the body
  // used to crash .trim() (500) instead of a clean 400.
  const str = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");
  const data = {
    email: str(rawData?.email, 254),
    name: str(rawData?.name, 100),
    reason: str(rawData?.reason, 200),
    topic: str(rawData?.topic, 200),
    category: str(rawData?.category, 200),
    description: str(rawData?.description, 3000),
    message: str(rawData?.message, 3000),
    reference: str(rawData?.reference, 1000),
    link: str(rawData?.link, 1000),
    support_type: str(rawData?.support_type, 40),
  };
  // Plan perk "Customer support": priority comes from the requester's plan
  // (the client-sent priority is ignored — anyone could claim "High").
  const { priority, rank: priorityRank } = supportPriorityFor(user?.subscription, data.support_type);
  const reporterEmail = (data.email || user?.email || "").trim().toLowerCase();
  if (!reporterEmail || !reporterEmail.includes("@")) {
    throw badRequest("A valid email address is required");
  }

  const reason = (data.reason || data.topic || data.category || "Support Request").trim();
  const description = (data.description || data.message || "").trim();

  const report = await Report.create({
    reporter_id: user?._id || undefined,
    reporter_email: reporterEmail,
    reporter_name: (data.name || user?.name || "Visitor").trim(),
    target_model: "Support",
    reason,
    description,
    reference: (data.reference || data.link || "").trim(),
    support_type: data.support_type || "contact",
    priority,
    priority_rank: priorityRank,
    reporter_plan: user?.subscription || "guest",
    status: REPORT_STATUS.PENDING,
  });

  return report;
};

// ---- Admin moderation queue (additive; mounted under /api/admin/reports
// via the admin router — see controller exports) ----

const clampPage = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n >= 1 ? Math.min(n, 1000) : fallback;
};

const clampLimit = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  if (!Number.isInteger(n) || n < 1) return fallback;
  return Math.min(n, 50);
};

// sort=latest (default, newest first) or sort=count (targets with the most
// reports first, aggregated). status/target_model narrow the queue.
export const getReportQueue = async ({ page = 1, limit = 20, status, target_model, sort = "latest" } = {}) => {
  page = clampPage(page, 1);
  limit = clampLimit(limit, 20);
  const skip = (page - 1) * limit;

  const match = {};
  if (status && Object.values(REPORT_STATUS).includes(status)) match.status = status;
  if (target_model === "Product" || target_model === "User" || target_model === "Support") {
    match.target_model = target_model;
  }

  if (sort === "count") {
    const grouped = await Report.aggregate([
      { $match: match },
      {
        $group: {
          _id: { target_id: "$target_id", target_model: "$target_model" },
          count: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ["$status", REPORT_STATUS.PENDING] }, 1, 0] },
          },
          latest: { $max: "$createdAt" },
        },
      },
      { $sort: { count: -1, latest: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          total: [{ $count: "total" }],
        },
      },
    ]);
    const data = grouped[0]?.data || [];
    const total = grouped[0]?.total[0]?.total || 0;
    return {
      data,
      pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  const [data, total] = await Promise.all([
    Report.find(match)
      .populate("reporter_id", "name email avatar")
      // Pending support tickets: highest plan priority first, then newest.
      .sort(
        target_model === "Support" || sort === "priority"
          ? { priority_rank: -1, createdAt: -1 }
          : { createdAt: -1 },
      )
      .skip(skip)
      .limit(limit)
      .lean(),
    Report.countDocuments(match),
  ]);
  return {
    data,
    pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
};

export const reviewReport = async (reportId, { status, admin_note } = {}) => {
  if (!mongoose.Types.ObjectId.isValid(reportId)) {
    throw badRequest("Invalid report ID");
  }
  const allowed = [REPORT_STATUS.ACTION_TAKEN, REPORT_STATUS.DISMISSED];
  if (!allowed.includes(status)) {
    throw badRequest("Invalid review status");
  }
  const update = { $set: { status, reviewed_at: new Date() } };
  if (admin_note !== undefined) {
    update.$set.admin_note = String(admin_note).slice(0, 500);
  }
  const report = await Report.findByIdAndUpdate(reportId, update, { new: true })
    .populate("target_id", "title seller_id")
    .lean();
  if (!report) {
    throw new Error("Report not found");
  }

  // Notify the product seller when a report is actioned (not on dismiss) — fire-and-forget
  if (
    status === REPORT_STATUS.ACTION_TAKEN &&
    report.target_model === "Product" &&
    report.target_id
  ) {
    const product = report.target_id;
    if (product?.seller_id) {
      notifyModerationWarning({
        productId: product._id,
        productTitle: product.title,
        sellerId: product.seller_id,
        adminNote: admin_note || null,
      }).catch(() => {});
    }
  }

  return report;
};

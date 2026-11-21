// Email fallbacks for things people haven't seen, sent via Resend.
//
//  1. Unread digest (users): personal notifications (messages, offers, deal
//     updates, price drops, moderation) that piled up and sat unread for a
//     day. Admin campaigns are excluded, so this is never a marketing blast.
//  2. Staff attention alert: the admin "needs attention" queue (pending
//     reports, gender requests, auto-hidden listings, failing jobs) crossed a
//     threshold. The admin portal has no push, so email is the only reach.
//
// Resend's free plan is 100 emails/day and 3,000/month, SHARED with
// verification and password-reset emails, which must never be starved. So:
// off unless EMAIL_ALERTS_ENABLED=true, a rolling 24h cap on digests, a
// per-person cooldown, items are never emailed twice, and a batch stops at
// the first quota/rate-limit error.
import crypto from "node:crypto";
import mongoose from "mongoose";
import Notification from "../models/Notification.model.js";
import User from "../models/User.model.js";
import Product from "../models/Product.model.js";
import Report from "../models/Report.model.js";
import { JobState } from "../models/JobRun.model.js";
import { REPORT_STATUS, USER_ROLES, USER_STATUS } from "../config/constants.js";
import { renderListEmail } from "../utils/templates/listEmailTemplate.js";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const envInt = (name, fallback, min = 1) => {
  const value = Number.parseInt(process.env[name], 10);
  return Number.isFinite(value) && value >= min ? value : fallback;
};

const config = () => ({
  enabled: process.env.EMAIL_ALERTS_ENABLED === "true",
  // Unread personal items (each chat message counts) before we email.
  digestMinUnread: envInt("EMAIL_DIGEST_MIN_UNREAD", 5),
  // Most digests per rolling 24h, leaving the rest of Resend's 100/day for auth mail.
  digestDailyCap: envInt("EMAIL_DIGEST_DAILY_CAP", 30),
  staffThreshold: envInt("STAFF_ALERT_THRESHOLD", 10),
});

const DIGEST_WINDOW_MS = 7 * DAY; // ignore anything older; it's stale by now
const DIGEST_MIN_AGE_MS = DAY; // the oldest unread item must have sat this long
const DIGEST_COOLDOWN_MS = 3 * DAY;
const DIGEST_ROWS_SHOWN = 5;
const STAFF_COOLDOWN_MS = DAY;
const STAFF_MAX_RECIPIENTS = 10;
const SEND_GAP_MS = 600; // Resend allows ~2 requests/second
const QUOTA_ERRORS = new Set(["daily_quota_exceeded", "monthly_quota_exceeded", "rate_limit_exceeded"]);

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isQuotaError = (error) => QUOTA_ERRORS.has(error?.code) || error?.statusCode === 429;
const firstUrl = (value) => String(value || "").split(",")[0].trim().replace(/\/+$/, "");

// Why a run sent nothing, shown on the admin Background Jobs page. A string,
// so jobRegistry's didWork() ignores it and frequent runs don't flood history.
const skipReason = (cfg, urlVar, url) => {
  if (!cfg.enabled) return "Email alerts are off (EMAIL_ALERTS_ENABLED is not true)";
  if (!url) return `${urlVar} is not set`;
  return null;
};

// Lazy: config/sendEmail.js throws at import time without RESEND_API_KEY.
const defaultSend = async (message) => (await import("../config/sendEmail.js")).default(message);

// ==================== UNSUBSCRIBE LINK ====================

const unsubscribeSignature = (userId) => {
  const secret = process.env.SECRET_KEY_ACCESS_TOKEN;
  if (!secret) return null;
  return crypto.createHmac("sha256", secret).update(`email-digest-unsubscribe:${userId}`).digest("base64url");
};

// Public API origin for the link. Falls back to the Google OAuth callback's
// origin, which is always the API host in this deployment.
const apiBaseUrl = () => {
  const explicit = firstUrl(process.env.API_PUBLIC_URL);
  if (explicit) return explicit;
  try {
    return new URL(process.env.GOOGLE_REDIRECT_URI).origin;
  } catch {
    return "";
  }
};

const unsubscribeUrl = (userId) => {
  const base = apiBaseUrl();
  const sig = unsubscribeSignature(userId);
  if (!base || !sig) return null;
  return `${base}/api/notifications/email/unsubscribe?u=${userId}&t=${sig}`;
};

/** Turn the digest off for the user the signed link names. Returns true on success. */
export const unsubscribeFromDigest = async (userId, token) => {
  if (!mongoose.Types.ObjectId.isValid(userId) || typeof token !== "string") return false;
  const expected = unsubscribeSignature(String(userId));
  if (!expected) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  await User.updateOne({ _id: userId }, { $set: { email_digest_enabled: false } });
  return true;
};

// ==================== UNREAD DIGEST ====================

const KIND_LABEL = {
  message: "Message",
  order: "Deal",
  price_drop: "Price drop",
  moderation: "Listing",
};

const pendingFilter = (since, now) => ({
  is_broadcast: false,
  status: "sent",
  is_read: false,
  is_dismissed: { $ne: true },
  emailed_at: null,
  sent_at: { $gte: since, $lte: now },
});

const digestEmail = ({ user, items, rowCount, rows, frontendUrl }) => {
  const firstName = String(user.name || "there").trim().split(/\s+/)[0];
  const unsub = unsubscribeUrl(String(user._id));
  const hidden = rowCount - rows.length;
  return {
    sendTo: user.email,
    subject: `${items} unread updates waiting for you on Unideals`,
    html: renderListEmail({
      title: `You have ${items} unread updates`,
      preheader: rows[0]?.title || "Messages and deal updates are waiting for you.",
      intro: `Hi ${firstName}, these have been waiting for a while. Offers and messages go stale fast, so it's worth a quick look.`,
      rows: rows.map((n) => ({
        title: n.title,
        body: n.message,
        meta: KIND_LABEL[n.type] || "Update",
      })),
      more: hidden > 0 ? `and ${hidden} more in your inbox` : "",
      ctaLabel: "Open notifications",
      ctaUrl: `${frontendUrl}/notification`,
      footnote: "We only email when updates pile up, at most once every 3 days.",
      unsubscribeUrl: unsub,
    }),
    ...(unsub && {
      headers: {
        "List-Unsubscribe": `<${unsub}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
  };
};

/**
 * Email users whose personal notifications piled up unread. Run once a day.
 * Returns a summary for the job runner.
 */
export const sendUnreadDigests = async ({ now = new Date(), send = defaultSend, gapMs = SEND_GAP_MS } = {}) => {
  const cfg = config();
  const frontendUrl = firstUrl(process.env.FRONTEND_URL);
  const digestSkip = skipReason(cfg, "FRONTEND_URL", frontendUrl);
  if (digestSkip) return { sent: 0, skipped: digestSkip };

  const sentLastDay = await User.countDocuments({ email_digest_sent_at: { $type: "date", $gt: new Date(now - DAY) } });
  const budget = cfg.digestDailyCap - sentLastDay;
  if (budget <= 0) return { sent: 0, budgetLeft: 0, skipped: "Daily digest cap reached" };

  const since = new Date(now - DIGEST_WINDOW_MS);
  const cooldownCut = new Date(now - DIGEST_COOLDOWN_MS);
  const offCooldown = [{ email_digest_sent_at: null }, { email_digest_sent_at: { $lte: cooldownCut } }];

  const candidates = await Notification.aggregate([
    { $match: { ...pendingFilter(since, now), recipient_id: { $ne: null } } },
    {
      $group: {
        _id: "$recipient_id",
        items: { $sum: { $ifNull: ["$group_count", 1] } },
        rowCount: { $sum: 1 },
        oldest: { $min: "$sent_at" },
      },
    },
    { $match: { items: { $gte: cfg.digestMinUnread }, oldest: { $lte: new Date(now - DIGEST_MIN_AGE_MS) } } },
    { $sort: { items: -1 } }, // most-neglected first when the cap bites
    {
      $lookup: {
        from: User.collection.name,
        localField: "_id",
        foreignField: "_id",
        as: "user",
        pipeline: [
          {
            $match: {
              status: USER_STATUS.ACTIVE,
              is_email_verified: true,
              email_digest_enabled: { $ne: false },
              $or: offCooldown,
            },
          },
          { $project: { name: 1, email: 1, email_digest_sent_at: 1 } },
        ],
      },
    },
    { $unwind: "$user" },
    { $limit: budget },
  ]);

  let sent = 0;
  let failed = 0;
  for (const { user, items, rowCount } of candidates) {
    // Claim before sending, so a second instance or a manual run can't double-send.
    const claim = await User.updateOne(
      { _id: user._id, $or: offCooldown },
      { $set: { email_digest_sent_at: now } },
    );
    if (!claim.modifiedCount) continue;

    const filter = { ...pendingFilter(since, now), recipient_id: user._id };
    try {
      const rows = await Notification.find(filter)
        .sort({ sent_at: -1 })
        .limit(DIGEST_ROWS_SHOWN)
        .select("title message type")
        .lean();
      await send(digestEmail({ user, items, rowCount, rows, frontendUrl }));
      await Notification.updateMany(filter, { $set: { emailed_at: now } });
      sent += 1;
    } catch (error) {
      failed += 1;
      // Not sent: release the claim so they're eligible again next run.
      await User.updateOne(
        { _id: user._id, email_digest_sent_at: now },
        { $set: { email_digest_sent_at: user.email_digest_sent_at ?? null } },
      ).catch(() => {});
      if (isQuotaError(error)) {
        console.warn("[email-digest] Resend quota/rate limit hit; stopping this run.");
        break;
      }
      console.error("[email-digest] send failed:", error?.message);
    }
    if (gapMs) await pause(gapMs);
  }
  return { sent, failed, budgetLeft: Math.max(budget - sent, 0) };
};

// ==================== STAFF ATTENTION ALERT ====================

const ATTENTION_ROWS = [
  ["pendingReports", "Reports waiting for review"],
  ["autoHiddenListings", "Listings auto-hidden after reports"],
  ["pendingGenderRequests", "Gender change requests"],
  ["failingJobs", "Background jobs failing"],
];

/** Platform-wide version of GET /admin/attention (admins see every campus). */
export const getAttentionTotals = async () => {
  const [pendingReports, pendingGenderRequests, autoHiddenListings, failingJobs] = await Promise.all([
    Report.countDocuments({ status: REPORT_STATUS.PENDING }),
    User.countDocuments({ "genderChangeRequest.status": "pending" }),
    Product.countDocuments({ auto_hidden_at: { $type: "date" }, is_deleted: false }),
    JobState.countDocuments({ last_status: "failed" }),
  ]);
  return { pendingReports, pendingGenderRequests, autoHiddenListings, failingJobs };
};

/**
 * Email admins when the attention queue reaches the threshold. Cheap to run
 * hourly: four counts, and each admin gets at most one email a day.
 */
export const sendStaffAttentionAlerts = async ({ now = new Date(), send = defaultSend, gapMs = SEND_GAP_MS } = {}) => {
  const cfg = config();
  const adminUrl = firstUrl(process.env.ADMIN_FRONTEND_URL);
  const staffSkip = skipReason(cfg, "ADMIN_FRONTEND_URL", adminUrl);
  if (staffSkip) return { sent: 0, skipped: staffSkip };

  const counts = await getAttentionTotals();
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  if (total < cfg.staffThreshold) {
    return { sent: 0, skipped: `Queue below threshold (${total} of ${cfg.staffThreshold})` };
  }

  const offCooldown = [{ staff_alert_sent_at: null }, { staff_alert_sent_at: { $lte: new Date(now - STAFF_COOLDOWN_MS) } }];
  const admins = await User.find({
    role: USER_ROLES.ADMIN,
    status: USER_STATUS.ACTIVE,
    $or: offCooldown,
  })
    .select("name email staff_alert_sent_at")
    .limit(STAFF_MAX_RECIPIENTS)
    .lean();

  const rows = ATTENTION_ROWS.filter(([key]) => counts[key] > 0).map(([key, label]) => ({
    title: label,
    meta: String(counts[key]),
  }));

  let sent = 0;
  let failed = 0;
  for (const admin of admins) {
    const claim = await User.updateOne({ _id: admin._id, $or: offCooldown }, { $set: { staff_alert_sent_at: now } });
    if (!claim.modifiedCount) continue;
    try {
      await send({
        sendTo: admin.email,
        subject: `${total} items need attention in the Unideals admin portal`,
        html: renderListEmail({
          title: `${total} items need attention`,
          preheader: rows.map((r) => `${r.title}: ${r.meta}`).join(" · "),
          intro: "The admin queue has built up. Here's what's waiting:",
          rows,
          ctaLabel: "Open admin portal",
          ctaUrl: adminUrl,
          footnote: `Sent to admins when ${cfg.staffThreshold}+ items are waiting, at most once a day.`,
        }),
      });
      sent += 1;
    } catch (error) {
      failed += 1;
      await User.updateOne(
        { _id: admin._id, staff_alert_sent_at: now },
        { $set: { staff_alert_sent_at: admin.staff_alert_sent_at ?? null } },
      ).catch(() => {});
      if (isQuotaError(error)) break;
      console.error("[staff-alert] send failed:", error?.message);
    }
    if (gapMs) await pause(gapMs);
  }
  return { sent, failed };
};

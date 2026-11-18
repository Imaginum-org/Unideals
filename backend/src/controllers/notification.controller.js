import * as notificationService from "../services/notification.service.js";
import { registerDeviceToken, unregisterDeviceToken } from "../services/push.service.js";
import { forwardServiceError } from "../utils/response.js";
import { unsubscribeFromDigest } from "../services/emailAlerts.service.js";
import { isCampusInScope } from "../services/campusScope.service.js";

// Campus-limited staff can only reach (and see) their own campuses.
const limitedAudienceError = (req, audience, campus) => {
  if (!req.campusScope) return null;
  if (audience === "campus" && campus && isCampusInScope(req.campusScope, campus)) return null;
  return Object.assign(new Error("You can only send to a campus you have access to"), { statusCode: 403 });
};

// ==================== USER CONTROLLERS ====================

// GET /api/notifications
export const getUserNotifications = async (req, res, next) => {
  try {
    const data = await notificationService.getUserNotificationFeed(req.userId);
    return res.status(200).json({
      success: true,
      message: "Notifications fetched successfully",
      data: data.notifications,
      unreadCount: data.unreadCount,
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

// PATCH /api/notifications/:id/read
export const markNotificationRead = async (req, res, next) => {
  try {
    const result = await notificationService.markNotificationRead(
      req.params.id,
      req.userId
    );
    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: result,
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

// PATCH /api/notifications/read-all
export const markAllNotificationsRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllNotificationsRead(req.userId);
    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      data: result,
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

// POST /api/notifications/:id/click
export const trackNotificationClick = async (req, res, next) => {
  try {
    await notificationService.trackNotificationClick(req.params.id, req.userId);
    return res.status(200).json({
      success: true,
      message: "Click recorded",
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

// DELETE /api/notifications/:id
export const dismissNotification = async (req, res, next) => {
  try {
    const result = await notificationService.dismissNotification(
      req.params.id,
      req.userId
    );
    return res.status(200).json({
      success: true,
      message: "Notification dismissed",
      data: result,
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

// POST /api/notifications/devices  { token, platform: "web" | "android" | "ios" }
// Called on every visit / app start: registers or refreshes this device.
export const registerDevice = async (req, res, next) => {
  try {
    await registerDeviceToken({
      userId: req.userId,
      token: req.body?.token,
      platform: req.body?.platform,
      userAgent: req.get("user-agent"),
    });
    return res.status(200).json({ success: true, message: "Device registered for push" });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

// DELETE /api/notifications/devices  { token }  — call before logout.
export const unregisterDevice = async (req, res, next) => {
  try {
    await unregisterDeviceToken({ userId: req.userId, token: req.body?.token });
    return res.status(200).json({ success: true, message: "Device unregistered" });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

// ==================== ADMIN CONTROLLERS ====================

// POST /api/admin/notifications
export const adminCreateNotification = async (req, res, next) => {
  try {
    const {
      title,
      message,
      type,
      target_audience,
      target_campus,
      image_url,
      action_url,
      action_label,
      schedule_type,
      scheduled_at,
    } = req.body;

    const denied = limitedAudienceError(req, target_audience, target_campus);
    if (denied) return res.status(403).json({ success: false, error: true, message: denied.message });

    const notification = await notificationService.createAdminNotification({
      title,
      message,
      type,
      target_audience,
      target_campus,
      image_url,
      action_url,
      action_label,
      schedule_type,
      scheduled_at,
      sent_by: req.userId,
    });

    return res.status(201).json({
      success: true,
      message:
        schedule_type === "scheduled"
          ? "Notification scheduled successfully"
          : "Notification sent successfully",
      data: notification,
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

// GET /api/admin/notifications/stats
export const adminGetStats = async (req, res, next) => {
  try {
    const stats = await notificationService.getAdminNotificationStats({ campuses: req.campusScope });
    return res.status(200).json({
      success: true,
      message: "Notification stats fetched successfully",
      data: stats,
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

// GET /api/admin/notifications/history
export const adminGetHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const history = await notificationService.getAdminNotificationHistory({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      campuses: req.campusScope,
    });
    return res.status(200).json({
      success: true,
      message: "Notification history fetched successfully",
      data: history,
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

// GET /api/admin/notifications/scheduled
export const adminGetScheduled = async (req, res, next) => {
  try {
    const scheduled = await notificationService.getAdminScheduledNotifications({ campuses: req.campusScope });
    return res.status(200).json({
      success: true,
      message: "Scheduled notifications fetched successfully",
      data: scheduled,
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

// PATCH /api/admin/notifications/:id/cancel
export const adminCancelScheduled = async (req, res, next) => {
  try {
    const cancelled = await notificationService.cancelScheduledNotification(
      req.params.id,
      { campuses: req.campusScope },
    );
    return res.status(200).json({
      success: true,
      message: "Scheduled notification cancelled",
      data: cancelled,
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

// GET /api/admin/notifications/estimate-recipients
export const adminEstimateRecipients = async (req, res, next) => {
  try {
    const { target_audience = "all", target_campus = null } = req.query;
    const denied = limitedAudienceError(req, target_audience, target_campus);
    if (denied) return res.status(403).json({ success: false, error: true, message: denied.message });
    const count = await notificationService.estimateRecipients({
      targetAudience: target_audience,
      targetCampus: target_campus,
    });
    return res.status(200).json({
      success: true,
      message: "Recipient estimate calculated",
      data: { count },
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

// ==================== EMAIL DIGEST UNSUBSCRIBE ====================

const unsubscribePage = (ok) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unideals emails</title></head>
<body style="margin:0;font-family:'Segoe UI',Arial,sans-serif;background:#F5F6FF;color:#11183D;">
<div style="max-width:420px;margin:15vh auto;padding:28px 24px;background:#fff;border:1px solid #E8EAFE;border-radius:14px;text-align:center;">
<h1 style="font-size:20px;margin:0 0 8px;">${ok ? "You're unsubscribed" : "This link isn't valid"}</h1>
<p style="font-size:14px;line-height:1.6;color:#596785;margin:0;">${
  ok
    ? "You won't get unread-notification emails anymore. Account emails like password resets still arrive."
    : "It may have been copied incompletely. Try the link from the email again."
}</p></div></body></html>`;

// GET (link click) and POST (RFC 8058 one-click from the mail client)
// /api/notifications/email/unsubscribe?u=<userId>&t=<signature>. No login:
// the HMAC signature in the link is the authorisation.
export const unsubscribeEmailDigest = async (req, res, next) => {
  try {
    const ok = await unsubscribeFromDigest(String(req.query.u || ""), String(req.query.t || ""));
    if (req.method === "POST") return res.status(ok ? 200 : 400).json({ success: ok });
    return res.status(ok ? 200 : 400).type("html").send(unsubscribePage(ok));
  } catch (error) {
    forwardServiceError(error, next);
  }
};

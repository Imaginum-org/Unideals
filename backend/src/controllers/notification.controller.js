import * as notificationService from "../services/notification.service.js";
import { forwardServiceError } from "../utils/response.js";

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
    const stats = await notificationService.getAdminNotificationStats();
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
    const scheduled = await notificationService.getAdminScheduledNotifications();
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
      req.params.id
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

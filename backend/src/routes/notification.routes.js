import express from "express";
import auth from "../middlewares/auth.middleware.js";
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  trackNotificationClick,
  dismissNotification,
  registerDevice,
  unregisterDevice,
} from "../controllers/notification.controller.js";

const router = express.Router();

router.use(auth);

// Push device tokens. Declared before "/:id" so DELETE /devices isn't
// treated as dismissing a notification with id "devices".
router.post("/devices", registerDevice);
router.delete("/devices", unregisterDevice);

router.get("/", getUserNotifications);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:id/read", markNotificationRead);
router.post("/:id/click", trackNotificationClick);
router.delete("/:id", dismissNotification);

export default router;

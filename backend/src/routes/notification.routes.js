import express from "express";
import auth from "../middlewares/auth.middleware.js";
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  trackNotificationClick,
} from "../controllers/notification.controller.js";

const router = express.Router();

router.use(auth);

router.get("/", getUserNotifications);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:id/read", markNotificationRead);
router.post("/:id/click", trackNotificationClick);

export default router;

import { Router } from "express";
import * as authMiddleware from "../middleware/authMiddleware.js";
import * as notificationController from "../controllers/notificationController.js";

const router = Router();

router.use(authMiddleware.authenticateToken, authMiddleware.requireRole(3));

router.get(
  "/notifications/unread-count",
  notificationController.getUnreadCount,
);
router.patch("/notifications/read-all", notificationController.markAllAsRead);
router.delete(
  "/notifications/delete-all",
  notificationController.deleteAllNotifications,
);
router.get("/notifications", notificationController.getNotifications);
router.patch("/notifications/:id/read", notificationController.markAsRead);
router.delete("/notifications/:id", notificationController.deleteNotification);

export default router;

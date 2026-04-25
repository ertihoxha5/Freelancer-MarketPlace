import { Router } from "express";
import * as authMiddleware from "../middleware/authMiddleware.js";
import * as notificationController from "../controllers/notificationController.js";
import * as freelancerController from "../controllers/freelancerController.js";

const router = Router();

router.get("/public/:id", freelancerController.getPublicProfile);

router.use(authMiddleware.authenticateToken, authMiddleware.requireRole(3));

router.get("/dashboard", freelancerController.getDashboard);
router.get("/profile", freelancerController.getProfile);
router.patch("/profile", freelancerController.updateProfile);
router.get("/skills", freelancerController.getAvailableSkills);

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

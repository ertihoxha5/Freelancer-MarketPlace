import { Router } from "express";
import * as authMiddleware from "../middleware/authMiddleware.js";
import * as clientController from "../controllers/clientController.js";
import * as notificationController from "../controllers/notificationController.js";

const router = Router();

router.use(authMiddleware.authenticateToken, authMiddleware.requireRole(2));

router.get("/projects", clientController.getMyProjects);
router.post("/projects", clientController.createMyProject);
router.get("/projects/:id", clientController.getMyProject);
router.patch("/projects/:id", clientController.updateMyProject);
router.delete("/projects/:id", clientController.deleteMyProject);


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

router.get("/profile", clientController.getMyProfile);
router.patch("/profile", clientController.updateMyProfile);

export default router;

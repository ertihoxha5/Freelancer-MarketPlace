import { Router } from "express";
import * as authMiddleware from "../middleware/authMiddleware.js";
import * as adminController from "../controllers/adminController.js";
import * as projectController from "../controllers/projectController.js";
import * as notificationController from "../controllers/notificationController.js";

const router = Router();

router.use(authMiddleware.authenticateToken, authMiddleware.requireRole(1));

router.get("/users", adminController.getUsers);
router.patch("/users/:id", adminController.updateUser);
router.delete("/users/:id", adminController.deleteUser);
router.post("/addUser", adminController.registerUser);

router.get("/clients", projectController.getClientList);

router.get(
  "/projects/with-freelancer",
  projectController.getProjectsWithFreelancer,
);

router.get(
  "/projects/without-freelancer",
  projectController.getProjectsWithoutFreelancer,
);

router.post("/projects", projectController.createProject);
router.patch("/projects/:id", projectController.updateProject);
router.delete("/projects/:id", projectController.deleteProject);

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

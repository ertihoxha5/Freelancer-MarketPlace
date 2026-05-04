import { Router } from "express";
import * as authMiddleware from "../middleware/authMiddleware.js";
import * as notificationController from "../controllers/notificationController.js";
import * as freelancerController from "../controllers/freelancerController.js";
import * as projectController from "../controllers/projectController.js";
import * as activityController from "../controllers/activityController.js";

const router = Router();
router.get("/public/:id", freelancerController.getPublicProfile);
router.use(authMiddleware.authenticateToken, authMiddleware.requireRole(3));
router.get("/dashboard", freelancerController.getDashboard);
router.get("/profile", freelancerController.getProfile);
router.patch("/profile", freelancerController.updateProfile);
router.get("/skills", freelancerController.getAvailableSkills);
router.get("/browse-projects", projectController.browseProjects);
router.get(
  "/projects/:projectId",
  projectController.getFreelancerProjectDetails,
);
router.post("/projects/:projectId/apply", projectController.createApplication);
router.get("/applications", projectController.getMyApplications);
router.patch(
  "/applications/:applicationId",
  projectController.updateMyApplication,
);
router.delete(
  "/applications/:applicationId",
  projectController.softDeleteMyApplication,
);

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
router.get("/activities/unread-count", activityController.getUnreadCount);
router.patch("/activities/read-all", activityController.markAllAsRead);
router.delete("/activities", activityController.deleteAllActivities);
router.get("/activities", activityController.getActivityFeed);
router.patch("/activities/:id/read", activityController.markAsRead);
router.delete("/activities/:id", activityController.deleteActivity);

export default router;

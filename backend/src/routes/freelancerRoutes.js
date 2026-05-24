import { Router } from "express";
import * as authMiddleware from "../middleware/authMiddleware.js";
import * as freelancerController from "../controllers/freelancerController.js";
import * as projectController from "../controllers/projectController.js";
import * as activityController from "../controllers/activityController.js";
import * as contractController from "../controllers/contractController.js";
import * as milestoneController from "../controllers/milestoneController.js";
import * as reviewController from "../controllers/reviewController.js";

import * as freelancerNotifController from "../controllers/freelancerNotificationController.js";

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

router.get("/contracts", contractController.getMyContracts);
router.get("/contracts/:id", contractController.getMyContractById);
router.get(
  "/contracts/:contractId/milestones",
  milestoneController.getMilestones,
);
router.patch(
  "/milestones/:id/status",
  milestoneController.updateMilestoneStatus,
);
router.post("/contracts/:contractId/reviews", reviewController.createReview);
router.get("/reviews", reviewController.getMyReceivedReviews);

router.get(
  "/notifications/unread-count",
  freelancerNotifController.getUnreadCount,
);
router.patch(
  "/notifications/read-all",
  freelancerNotifController.markAllAsRead,
);
router.delete(
  "/notifications/delete-all",
  freelancerNotifController.deleteAllNotifications,
);
router.get("/notifications", freelancerNotifController.getNotifications);
router.patch("/notifications/:id/read", freelancerNotifController.markAsRead);
router.delete(
  "/notifications/:id",
  freelancerNotifController.deleteNotification,
);

router.get("/activities/unread-count", activityController.getUnreadCount);
router.patch("/activities/read-all", activityController.markAllAsRead);
router.delete("/activities", activityController.deleteAllActivities);
router.get("/activities", activityController.getActivityFeed);
router.patch("/activities/:id/read", activityController.markAsRead);
router.delete("/activities/:id", activityController.deleteActivity);

export default router;

import { Router } from "express";
import * as authMiddleware from "../middleware/authMiddleware.js";
import * as freelancerController from "../controllers/freelancerController.js";
import * as projectController from "../controllers/projectController.js";
import * as activityController from "../controllers/activityController.js";
import * as contractController from "../controllers/contractController.js";
import * as milestoneController from "../controllers/milestoneController.js";
import * as reviewController from "../controllers/reviewController.js";
import * as freelancerNotifController from "../controllers/freelancerNotificationController.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  milestoneSchemas,
  paramSchemas,
  profileSchemas,
  proposalSchemas,
  querySchemas,
  reviewSchemas,
} from "../validation/schemas.js";

const router = Router();

router.get(
  "/public/:id",
  validateRequest({ params: paramSchemas.id }),
  freelancerController.getPublicProfile,
);

router.use(authMiddleware.authenticateToken, authMiddleware.requireRole(3));

router.get("/dashboard", freelancerController.getDashboard);
router.get("/profile", freelancerController.getProfile);
router.patch(
  "/profile",
  validateRequest({ body: profileSchemas.update }),
  freelancerController.updateProfile,
);
router.get("/skills", freelancerController.getAvailableSkills);

router.get(
  "/browse-projects",
  validateRequest({ query: querySchemas.browseProjects }),
  projectController.browseProjects,
);
router.get(
  "/projects/:projectId",
  validateRequest({ params: paramSchemas.projectId }),
  projectController.getFreelancerProjectDetails,
);
router.post(
  "/projects/:projectId/apply",
  validateRequest({
    params: paramSchemas.projectId,
    body: proposalSchemas.createOrUpdate,
  }),
  projectController.createApplication,
);
router.get("/applications", projectController.getMyApplications);
router.patch(
  "/applications/:applicationId",
  validateRequest({
    params: paramSchemas.applicationId,
    body: proposalSchemas.createOrUpdate,
  }),
  projectController.updateMyApplication,
);
router.delete(
  "/applications/:applicationId",
  validateRequest({ params: paramSchemas.applicationId }),
  projectController.softDeleteMyApplication,
);

router.get("/contracts", contractController.getMyContracts);
router.get(
  "/contracts/:id",
  validateRequest({ params: paramSchemas.id }),
  contractController.getMyContractById,
);
router.get(
  "/contracts/:contractId/milestones",
  validateRequest({ params: paramSchemas.contractId }),
  milestoneController.getMilestones,
);
router.patch(
  "/milestones/:id/status",
  validateRequest({
    params: paramSchemas.id,
    body: milestoneSchemas.status,
  }),
  milestoneController.updateMilestoneStatus,
);
router.post(
  "/contracts/:contractId/reviews",
  validateRequest({
    params: paramSchemas.contractId,
    body: reviewSchemas.create,
  }),
  reviewController.createReview,
);
router.get(
  "/reviews",
  validateRequest({ query: querySchemas.reviewList }),
  reviewController.getMyReceivedReviews,
);

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
router.patch(
  "/notifications/:id/read",
  validateRequest({ params: paramSchemas.mongoId }),
  freelancerNotifController.markAsRead,
);
router.delete(
  "/notifications/:id",
  validateRequest({ params: paramSchemas.mongoId }),
  freelancerNotifController.deleteNotification,
);

router.get("/activities/unread-count", activityController.getUnreadCount);
router.patch("/activities/read-all", activityController.markAllAsRead);
router.delete("/activities", activityController.deleteAllActivities);
router.get(
  "/activities",
  validateRequest({ query: querySchemas.activityFeed }),
  activityController.getActivityFeed,
);
router.patch(
  "/activities/:id/read",
  validateRequest({ params: paramSchemas.mongoId }),
  activityController.markAsRead,
);
router.delete(
  "/activities/:id",
  validateRequest({ params: paramSchemas.mongoId }),
  activityController.deleteActivity,
);

export default router;

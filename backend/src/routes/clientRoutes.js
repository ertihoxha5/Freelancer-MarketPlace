import { Router } from "express";
import * as authMiddleware from "../middleware/authMiddleware.js";
import * as clientController from "../controllers/clientController.js";
import * as notificationController from "../controllers/notificationController.js";
import * as contractController from "../controllers/contractController.js";
import * as milestoneController from "../controllers/milestoneController.js";
import * as reviewController from "../controllers/reviewController.js";
import * as testimonialController from "../controllers/testimonialController.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  milestoneSchemas,
  paramSchemas,
  profileSchemas,
  projectSchemas,
  proposalSchemas,
  querySchemas,
  testimonialSchemas,
  reviewSchemas,
  contractSchemas,
} from "../validation/schemas.js";

const router = Router();

router.use(authMiddleware.authenticateToken, authMiddleware.requireRole(2));

router.get("/projects", clientController.getMyProjects);
router.post(
  "/projects",
  validateRequest({ body: projectSchemas.clientCreateOrUpdate }),
  clientController.createMyProject,
);
router.get(
  "/projects/:id",
  validateRequest({ params: paramSchemas.id }),
  clientController.getMyProject,
);
router.patch(
  "/projects/:id",
  validateRequest({
    params: paramSchemas.id,
    body: projectSchemas.clientCreateOrUpdate,
  }),
  clientController.updateMyProject,
);
router.delete(
  "/projects/:id",
  validateRequest({ params: paramSchemas.id }),
  clientController.deleteMyProject,
);
router.get("/applications", clientController.getMyApplications);
router.patch(
  "/applications/:applicationId/status",
  validateRequest({
    params: paramSchemas.applicationId,
    body: proposalSchemas.status,
  }),
  clientController.updateMyApplicationStatus,
);

router.get("/contracts", contractController.getMyContracts);
router.get(
  "/contracts/:id",
  validateRequest({ params: paramSchemas.id }),
  contractController.getMyContractById,
);
router.post(
  "/contracts/:id/sign",
  validateRequest({ params: paramSchemas.id }),
  contractController.signContract,
);
router.post(
  "/contracts/:id/disputes",
  validateRequest({
    params: paramSchemas.id,
    body: contractSchemas.dispute,
  }),
  contractController.createDispute,
);
router.post(
  "/contracts/:contractId/milestones",
  validateRequest({
    params: paramSchemas.contractId,
    body: milestoneSchemas.create,
  }),
  milestoneController.createMilestone,
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
    body: milestoneSchemas.statusFlexible,
  }),
  milestoneController.updateMilestoneStatus,
);
router.delete(
  "/milestones/:id",
  validateRequest({ params: paramSchemas.id }),
  milestoneController.deleteMilestone,
);
router.post(
  "/contracts/:contractId/reviews",
  validateRequest({
    params: paramSchemas.contractId,
    body: reviewSchemas.create,
  }),
  reviewController.createReview,
);
router.post(
  "/testimonials",
  validateRequest({ body: testimonialSchemas.create }),
  testimonialController.createTestimonial,
);
router.get(
  "/reviews",
  validateRequest({ query: querySchemas.reviewList }),
  reviewController.getMyReceivedReviews,
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
router.patch(
  "/notifications/:id/read",
  validateRequest({ params: paramSchemas.id }),
  notificationController.markAsRead,
);
router.delete(
  "/notifications/:id",
  validateRequest({ params: paramSchemas.id }),
  notificationController.deleteNotification,
);

router.get("/profile", clientController.getMyProfile);
router.patch(
  "/profile",
  validateRequest({ body: profileSchemas.update }),
  clientController.updateMyProfile,
);

export default router;

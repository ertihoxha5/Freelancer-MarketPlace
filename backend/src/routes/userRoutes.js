import { Router } from "express";
import * as userController from "../controllers/userController.js";
import * as authMiddleware from "../middleware/authMiddleware.js";
import * as milestoneController from "../controllers/milestoneController.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  authSchemas,
  milestoneSchemas,
  paramSchemas,
  userSchemas,
} from "../validation/schemas.js";
import { csrfProtection, csrfTokenHandler } from "../middleware/csrf.js";

const router = Router();

router.get("/auth/csrf-token", csrfProtection, csrfTokenHandler);

router.post(
  "/auth/login",
  csrfProtection,
  validateRequest({ body: authSchemas.login }),
  userController.login,
);
router.post(
  "/auth/refresh",
  csrfProtection,
  validateRequest({ body: authSchemas.refresh }),
  userController.refresh,
);
router.post(
  "/auth/logout",
  csrfProtection,
  validateRequest({ body: authSchemas.logout }),
  userController.logout,
);
router.get(
  "/auth/me",
  authMiddleware.authenticateToken,
  userController.me,
);
router.post(
  "/auth/register",
  csrfProtection,
  validateRequest({ body: userSchemas.register }),
  userController.register,
);
router.post(
  "/auth/forgot-password",
  csrfProtection,
  validateRequest({ body: authSchemas.forgotPassword }),
  userController.forgotPassword,
);
router.post(
  "/auth/reset-password",
  csrfProtection,
  validateRequest({ body: authSchemas.resetPassword }),
  userController.resetPassword,
);
router.post(
  "/auth/changePassword",
  csrfProtection,
  authMiddleware.authenticateToken,
  validateRequest({ body: authSchemas.changePassword }),
  userController.changePassword,
);
router.post(
  "/projects/:projectID/milestones",
  authMiddleware.authenticateToken,
  authMiddleware.requireRole(3),
  validateRequest({
    params: paramSchemas.projectID,
    body: milestoneSchemas.projectCreate,
  }),
  milestoneController.createProjectMilestone,
);

export default router;

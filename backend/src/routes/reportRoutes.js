import { Router } from "express";
import * as authMiddleware from "../middleware/authMiddleware.js";
import * as reportController from "../controllers/reportController.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { paramSchemas, querySchemas } from "../validation/schemas.js";

const router = Router();

router.use(authMiddleware.authenticateToken);

router.get(
  "/platform-summary",
  authMiddleware.requireRole(1),
  reportController.platformSummary,
);
router.get(
  "/client/:id",
  validateRequest({ params: paramSchemas.id }),
  reportController.clientReport,
);
router.get("/freelancer/me", reportController.freelancerReport);
router.get(
  "/freelancer/:id",
  validateRequest({ params: paramSchemas.id }),
  reportController.freelancerReport,
);
router.get(
  "/projects",
  authMiddleware.requireRole(1),
  validateRequest({ query: querySchemas.search }),
  reportController.projectReport,
);

export default router;

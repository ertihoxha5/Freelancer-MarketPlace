import { Router } from "express";
import * as authMiddleware from "../middleware/authMiddleware.js";
import * as reportController from "../controllers/reportController.js";

const router = Router();

router.use(authMiddleware.authenticateToken);

router.get(
  "/platform-summary",
  authMiddleware.requireRole(1),
  reportController.platformSummary,
);
router.get("/client/:id", reportController.clientReport);
router.get("/freelancer/:id", reportController.freelancerReport);
router.get(
  "/projects",
  authMiddleware.requireRole(1),
  reportController.projectReport,
);

export default router;

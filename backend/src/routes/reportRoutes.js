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

// Saved dynamic reports - professional CRUD + advanced search (Task 7)
router.post("/saved", authMiddleware.requireRole(1), reportController.saveReport);

router.get(
  "/saved",
  authMiddleware.requireRole(1),
  validateRequest({ query: querySchemas.search }),
  reportController.listSavedReports,
);

router.get(
  "/saved/:id",
  authMiddleware.requireRole(1),
  validateRequest({ params: paramSchemas.id }),
  reportController.getSavedReport,
);

router.patch(
  "/saved/:id",
  authMiddleware.requireRole(1),
  validateRequest({ params: paramSchemas.id }),
  reportController.updateSavedReport,
);

router.delete(
  "/saved/:id",
  authMiddleware.requireRole(1),
  validateRequest({ params: paramSchemas.id }),
  reportController.deleteSavedReport,
);

router.post(
  "/saved/:id/run",
  authMiddleware.requireRole(1),
  validateRequest({ params: paramSchemas.id }),
  reportController.runSavedReport,
);

export default router;

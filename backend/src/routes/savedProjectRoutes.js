import { Router } from "express";
import * as controller from "../controllers/savedProjectController.js";
import * as auth from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { paramSchemas } from "../validation/schemas.js";

const router = Router();

router.use(auth.authenticateToken, auth.requireRole(3));

router.post(
  "/:projectID",
  validateRequest({ params: paramSchemas.projectID }),
  controller.saveProject,
);
router.delete(
  "/:projectID",
  validateRequest({ params: paramSchemas.projectID }),
  controller.removeSavedProject,
);
router.get("/", controller.getSavedProjects);

export default router;

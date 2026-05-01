import { Router } from "express";
import * as controller from "../controllers/savedProjectController.js";
import * as auth from "../middleware/authMiddleware.js";

const router = Router();

router.use(auth.authenticateToken, auth.requireRole(3));

router.post("/:projectID", controller.saveProject);
router.delete("/:projectID", controller.removeSavedProject);
router.get("/", controller.getSavedProjects);

export default router;
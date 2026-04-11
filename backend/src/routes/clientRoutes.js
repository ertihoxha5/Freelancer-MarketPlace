import { Router } from "express";
import * as authMiddleware from "../middleware/authMiddleware.js";
import * as clientController from "../controllers/clientController.js";

const router = Router();

// ─── Middleware: require valid JWT for ALL client routes ────────────────────
router.use(authMiddleware.authenticateToken);

// ─── Project CRUD (client's own projects) ─────────────────────────────────
router.get("/projects", clientController.getMyProjects);
router.post("/projects", clientController.createMyProject);
router.get("/projects/:id", clientController.getMyProject);
router.patch("/projects/:id", clientController.updateMyProject);
router.delete("/projects/:id", clientController.deleteMyProject);

export default router;

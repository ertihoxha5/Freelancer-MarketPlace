import { Router } from "express";
import * as authMiddleware from "../middleware/authMiddleware.js";
import * as adminController from "../controllers/adminController.js";
import * as projectController from "../controllers/projectController.js";

const router = Router();

// ─── Middleware: require valid JWT for ALL admin routes ───────────────────────
router.use(authMiddleware.authenticateToken);

// ─── User management ─────────────────────────────────────────────────────────
router.get("/users", adminController.getUsers);
router.patch("/users/:id", adminController.updateUser);
router.delete("/users/:id", adminController.deleteUser);

// ─── Client list (for project creation dropdown) ─────────────────────────────
router.get("/clients", projectController.getClientList);

// ─── Projects: with freelancer ───────────────────────────────────────────────
router.get(
  "/projects/with-freelancer",
  projectController.getProjectsWithFreelancer,
);

// ─── Projects: without freelancer ────────────────────────────────────────────
router.get(
  "/projects/without-freelancer",
  projectController.getProjectsWithoutFreelancer,
);

// ─── Project CRUD (shared) ───────────────────────────────────────────────────
router.post("/projects", projectController.createProject);
router.patch("/projects/:id", projectController.updateProject);
router.delete("/projects/:id", projectController.deleteProject);

export default router;

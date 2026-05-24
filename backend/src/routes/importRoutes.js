import { Router } from "express";
import * as authMiddleware from "../middleware/authMiddleware.js";
import {
  importProjects,
  importUsers,
  uploadImportFile,
} from "../controllers/exportController.js";

const router = Router();

router.use(authMiddleware.authenticateToken);

router.post("/projects", uploadImportFile.single("file"), importProjects);
router.post(
  "/users",
  authMiddleware.requireRole(1),
  uploadImportFile.single("file"),
  importUsers,
);

export default router;

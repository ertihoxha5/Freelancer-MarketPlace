import { Router } from "express";
import * as authMiddleware from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { importSchemas } from "../validation/schemas.js";
import {
  importProjects,
  importUsers,
  uploadImportFile,
} from "../controllers/exportController.js";

const router = Router();

router.use(authMiddleware.authenticateToken);

router.post(
  "/projects",
  authMiddleware.requireRole(1, 2),
  uploadImportFile.single("file"),
  validateRequest({ body: importSchemas.projects }),
  importProjects,
);
router.post(
  "/users",
  authMiddleware.requireRole(1),
  uploadImportFile.single("file"),
  importUsers,
);

export default router;

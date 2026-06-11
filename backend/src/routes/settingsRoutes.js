import { Router } from "express";
import * as authMiddleware from "../middleware/authMiddleware.js";
import * as settingsController from "../controllers/settingsController.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { settingsSchemas } from "../validation/schemas.js";

const router = Router();

router.use(authMiddleware.authenticateToken, authMiddleware.requireRole(1));

router.get("/", settingsController.getSettings);
router.put(
  "/",
  validateRequest({ body: settingsSchemas.update }),
  settingsController.updateSettings,
);

export default router;

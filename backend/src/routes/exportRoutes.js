import { Router } from "express";
import * as authMiddleware from "../middleware/authMiddleware.js";
import { exportList } from "../controllers/exportController.js";

const router = Router();

router.use(authMiddleware.authenticateToken);

router.get("/projects", exportList("projects"));
router.get("/applications", exportList("applications"));
router.get("/contracts", exportList("contracts"));
router.get("/freelancers", exportList("freelancers"));
router.get("/users", authMiddleware.requireRole(1), exportList("users"));
router.get("/payments", authMiddleware.requireRole(1), exportList("payments"));
router.get("/disputes", authMiddleware.requireRole(1), exportList("disputes"));

export default router;

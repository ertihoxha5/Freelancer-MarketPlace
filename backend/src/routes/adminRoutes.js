import { Router } from "express";
import * as authMiddleware from "../middleware/authMiddleware.js";
import * as adminController from "../controllers/adminController.js";
import * as projectController from "../controllers/projectController.js";

const router = Router();

router.use(authMiddleware.authenticateToken);

router.get("/users", adminController.getUsers);
router.patch("/users/:id", adminController.updateUser);
router.delete("/users/:id", adminController.deleteUser);
router.post("/addUser", adminController.registerUser);

router.get("/clients", projectController.getClientList);

router.get(
  "/projects/with-freelancer",
  projectController.getProjectsWithFreelancer,
);

router.get(
  "/projects/without-freelancer",
  projectController.getProjectsWithoutFreelancer,
);

router.post("/projects", projectController.createProject);
router.patch("/projects/:id", projectController.updateProject);
router.delete("/projects/:id", projectController.deleteProject);

export default router;

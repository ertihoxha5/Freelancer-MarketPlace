import { Router } from "express";
import * as authMiddleware from "../middleware/authMiddleware.js";
import * as adminController from "../controllers/adminController.js";
import * as catalogController from "../controllers/catalogController.js";
import * as projectController from "../controllers/projectController.js";
import * as notificationController from "../controllers/notificationController.js";
import * as skillsController from "../controllers/skillsController.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  adminSchemas,
  catalogSchemas,
  paramSchemas,
  projectSchemas,
  querySchemas,
  skillSchemas,
  userSchemas,
} from "../validation/schemas.js";

const router = Router();

router.use(authMiddleware.authenticateToken, authMiddleware.requireRole(1));

router.get(
  "/users",
  validateRequest({ query: querySchemas.pagination }),
  adminController.getUsers,
);
router.patch(
  "/users/:id",
  validateRequest({ params: paramSchemas.id, body: adminSchemas.updateUser }),
  adminController.updateUser,
);
router.delete(
  "/users/:id",
  validateRequest({ params: paramSchemas.id }),
  adminController.deleteUser,
);
router.post(
  "/addUser",
  validateRequest({ body: userSchemas.register }),
  adminController.registerUser,
);

router.get("/clients", projectController.getClientList);

router.get("/categories", catalogController.getCategories);
router.post(
  "/categories",
  validateRequest({ body: catalogSchemas.category }),
  catalogController.createCategory,
);
router.patch(
  "/categories/:id",
  validateRequest({ params: paramSchemas.id, body: catalogSchemas.category }),
  catalogController.updateCategory,
);
router.delete(
  "/categories/:id",
  validateRequest({ params: paramSchemas.id }),
  catalogController.deleteCategory,
);

router.get(
  "/skills",
  validateRequest({ query: querySchemas.search }),
  skillsController.getSkills,
);
router.get(
  "/skills/:id",
  validateRequest({ params: paramSchemas.mongoId }),
  skillsController.getSkillById,
);
router.post(
  "/skills",
  validateRequest({ body: skillSchemas.create }),
  skillsController.createSkill,
);
router.patch(
  "/skills/:id",
  validateRequest({ params: paramSchemas.mongoId, body: skillSchemas.update }),
  skillsController.updateSkill,
);
router.delete(
  "/skills/:id",
  validateRequest({ params: paramSchemas.mongoId }),
  skillsController.deleteSkill,
);

router.get(
  "/projects/with-freelancer",
  projectController.getProjectsWithFreelancer,
);
router.get(
  "/projects/without-freelancer",
  projectController.getProjectsWithoutFreelancer,
);

router.post(
  "/projects",
  validateRequest({ body: projectSchemas.adminCreateOrUpdate }),
  projectController.createProject,
);
router.patch(
  "/projects/:id",
  validateRequest({
    params: paramSchemas.id,
    body: projectSchemas.adminCreateOrUpdate,
  }),
  projectController.updateProject,
);
router.delete(
  "/projects/:id",
  validateRequest({ params: paramSchemas.id }),
  projectController.deleteProject,
);

router.get(
  "/notifications/unread-count",
  notificationController.getUnreadCount,
);
router.patch("/notifications/read-all", notificationController.markAllAsRead);
router.delete(
  "/notifications/delete-all",
  notificationController.deleteAllNotifications,
);

router.get("/notifications", notificationController.getNotifications);
router.patch(
  "/notifications/:id/read",
  validateRequest({ params: paramSchemas.id }),
  notificationController.markAsRead,
);
router.delete(
  "/notifications/:id",
  validateRequest({ params: paramSchemas.id }),
  notificationController.deleteNotification,
);

export default router;

import { Router } from "express";
import * as authMiddleware from "../middleware/authMiddleware.js";
import * as adminController from "../controllers/adminController.js";
import * as catalogController from "../controllers/catalogController.js";
import * as projectController from "../controllers/projectController.js";
import * as notificationController from "../controllers/notificationController.js";
import * as settingsController from "../controllers/settingsController.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  adminSchemas,
  catalogSchemas,
  paramSchemas,
  projectSchemas,
  querySchemas,
  settingsSchemas,
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
router.get("/categories/tree", catalogController.getCategoryTree);
router.patch(
  "/categories/order",
  validateRequest({ body: catalogSchemas.categoryOrder }),
  catalogController.updateCategoryOrder,
);
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
  catalogController.getSkills,
);
router.get(
  "/skills/search",
  validateRequest({ query: querySchemas.search }),
  catalogController.searchSkills,
);
router.get(
  "/skills/:id",
  validateRequest({ params: paramSchemas.id }),
  catalogController.getSkillById,
);
router.post(
  "/skills",
  validateRequest({ body: catalogSchemas.skill }),
  catalogController.createSkill,
);
router.patch(
  "/skills/:id",
  validateRequest({ params: paramSchemas.id, body: catalogSchemas.skill }),
  catalogController.updateSkill,
);
router.delete(
  "/skills/:id",
  validateRequest({ params: paramSchemas.id }),
  catalogController.deleteSkill,
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

router.get("/settings", settingsController.getSettings);
router.put(
  "/settings",
  validateRequest({ body: settingsSchemas.update }),
  settingsController.updateSettings,
);

export default router;

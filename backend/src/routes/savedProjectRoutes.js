import { Router } from "express";
import * as controller from "../controllers/savedProjectController.js";
import * as auth from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  paramSchemas,
  querySchemas,
  savedProjectSchemas,
} from "../validation/schemas.js";

const router = Router();

router.use(auth.authenticateToken, auth.requireRole(3));

router.post(
  "/bulk-save",
  validateRequest({ body: savedProjectSchemas.bulkSave }),
  controller.bulkSaveProjects,
);
router.delete(
  "/bulk-remove",
  validateRequest({ body: savedProjectSchemas.bulkDelete }),
  controller.bulkRemoveProjects,
);
router.get("/folders", controller.getFolders);
router.get(
  "/",
  validateRequest({ query: querySchemas.savedProjects }),
  controller.getSavedProjects,
);
router.post(
  "/:projectID",
  validateRequest({ params: paramSchemas.projectID }),
  controller.saveProject,
);
router.delete(
  "/:projectID",
  validateRequest({ params: paramSchemas.projectID }),
  controller.removeSavedProject,
);
router.post(
  "/:projectID/move-to-folder",
  validateRequest({
    params: paramSchemas.projectID,
    body: savedProjectSchemas.moveToFolder,
  }),
  controller.moveToFolder,
);
router.patch(
  "/:projectID",
  validateRequest({
    params: paramSchemas.projectID,
    body: savedProjectSchemas.update,
  }),
  controller.updateSavedProject,
);

export default router;

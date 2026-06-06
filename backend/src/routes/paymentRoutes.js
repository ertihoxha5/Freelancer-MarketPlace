import { Router } from "express";
import * as authMiddleware from "../middleware/authMiddleware.js";
import * as paymentController from "../controllers/paymentController.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { paymentSchemas } from "../validation/schemas.js";

const router = Router();

router.use(authMiddleware.authenticateToken);

router.post(
  "/intent",
  authMiddleware.requireRole(2),
  validateRequest({ body: paymentSchemas.createIntent }),
  paymentController.createIntent
);

router.post(
  "/confirm",
  authMiddleware.requireRole(2, 3),
  validateRequest({ body: paymentSchemas.confirm }),
  paymentController.confirm
);

router.post(
  "/refund",
  authMiddleware.requireRole(2),
  validateRequest({ body: paymentSchemas.refund }),
  paymentController.refund
);

router.get(
  "/history",
  authMiddleware.requireRole(2, 3),
  validateRequest({ query: paymentSchemas.historyQuery }),
  paymentController.history
);

export default router;
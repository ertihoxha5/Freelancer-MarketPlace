import { Router } from "express";
import * as authMiddleware from "../middleware/authMiddleware.js";
import * as reviewController from "../controllers/reviewController.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  paramSchemas,
  querySchemas,
  reviewSchemas,
} from "../validation/schemas.js";

const router = Router();
router.use(authMiddleware.authenticateToken);

router.get(
  "/me",
  validateRequest({ query: querySchemas.reviewList }),
  reviewController.getMyReceivedReviews,
);
router.get(
  "/freelancer/:id",
  validateRequest({ params: paramSchemas.id, query: querySchemas.reviewList }),
  reviewController.getReviewsForFreelancer,
);
router.get(
  "/freelancer/:id/stats",
  validateRequest({ params: paramSchemas.id }),
  reviewController.getReviewStats,
);
router.patch(
  "/:id",
  validateRequest({ params: paramSchemas.id, body: reviewSchemas.update }),
  reviewController.updateReview,
);
router.delete(
  "/:id",
  validateRequest({ params: paramSchemas.id }),
  reviewController.deleteReview,
);

export default router;

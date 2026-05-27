import * as reviewService from "../services/reviewService.js";
import {
  validatedBody,
  validatedParams,
  validatedQuery,
} from "../middleware/validateRequest.js";

function roleFromRequest(req) {
  return Number(req.user?.roleID) === 2 ? "client" : "freelancer";
}

export async function createReview(req, res, next) {
  try {
    const { contractId } = validatedParams(req);
    const result = await reviewService.createReview(
      contractId,
      req.user.id,
      roleFromRequest(req),
      validatedBody(req),
    );

    return res
      .status(201)
      .json({ message: "Review created successfully.", ...result });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
}

export async function getMyReceivedReviews(req, res, next) {
  try {
    const result = await reviewService.getMyReceivedReviews(
      req.user.id,
      validatedQuery(req),
    );
    return res.status(200).json(result);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
}

export async function getReviewsForFreelancer(req, res, next) {
  try {
    const { freelancerID } = validatedParams(req);
    const result = await reviewService.getReviewsForFreelancer(
      freelancerID,
      validatedQuery(req),
    );
    return res.status(200).json(result);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
}

export async function getReviewStats(req, res, next) {
  try {
    const { freelancerID } = validatedParams(req);
    const result = await reviewService.getReviewStats(freelancerID);
    return res.status(200).json(result);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
}

export async function updateReview(req, res, next) {
  try {
    const { reviewID } = validatedParams(req);
    const review = await reviewService.updateReview(
      reviewID,
      req.user.id,
      validatedBody(req),
    );
    return res
      .status(200)
      .json({ message: "Review updated successfully.", review });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
}

export async function deleteReview(req, res, next) {
  try {
    const { reviewID } = validatedParams(req);
    const result = await reviewService.deleteReview(reviewID, req.user.id);
    return res
      .status(200)
      .json({ message: "Review deleted successfully.", result });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
}

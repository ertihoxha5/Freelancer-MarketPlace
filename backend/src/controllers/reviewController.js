import * as reviewService from "../services/reviewService.js";
import { validatedBody, validatedParams } from "../middleware/validateRequest.js";

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
    const result = await reviewService.getMyReceivedReviews(req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
}

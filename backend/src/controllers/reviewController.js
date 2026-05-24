import * as reviewService from "../services/reviewService.js";

function roleFromRequest(req) {
  return Number(req.user?.roleID) === 2 ? "client" : "freelancer";
}

export async function createReview(req, res, next) {
  try {
    const result = await reviewService.createReview(
      req.params.contractId,
      req.user.id,
      roleFromRequest(req),
      req.body,
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

import * as projectRepository from "../repositories/projectRepository.js";
import * as reviewRepository from "../repositories/reviewRepository.js";
import {
  pushNotification,
  pushFreelancerNotification,
} from "./notificationService.js";
import { createActivity } from "./activityService.js";
import { getIO } from "../socket/index.js";
import { emitReviewReceived } from "../socket/handlers/businessHandlers.js";
import { validate } from "../validation/validate.js";
import { reviewSchemas } from "../validation/schemas.js";
import {
  conflictError,
  forbiddenError,
  notFoundError,
  validationError,
} from "../utils/errors.js";

function coercePositiveInt(value, label) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw validationError(`Valid ${label} is required.`);
  }
  return num;
}

function getContractPartyContext(contract, reviewerID, role) {
  if (role === "client") {
    if (Number(contract.clientID) !== reviewerID) {
      throw forbiddenError("You are not the client for this contract.");
    }
    return {
      receiverID: Number(contract.freelancerID),
      reviewerName: contract.clientName,
      receiverName: contract.freelancerName,
      receiverRole: "freelancer",
    };
  }

  if (Number(contract.freelancerID) !== reviewerID) {
    throw forbiddenError("You are not the freelancer for this contract.");
  }

  return {
    receiverID: Number(contract.clientID),
    reviewerName: contract.freelancerName,
    receiverName: contract.clientName,
    receiverRole: "client",
  };
}

export async function createReview(contractID, reviewerID, role, payload) {
  const contractId = coercePositiveInt(contractID, "contract ID");
  const reviewerId = coercePositiveInt(reviewerID, "reviewer ID");
  const { rating, title, comment, tags } = validate(
    reviewSchemas.create,
    payload ?? {},
  );

  const contract = await projectRepository.getContractById(contractId);
  if (!contract) {
    throw notFoundError("Contract not found.");
  }

  // Reviews can be left at any time during or after the contract (not restricted to completed status)

  const partyContext = getContractPartyContext(contract, reviewerId, role);

  if (partyContext.receiverID === reviewerId) {
    throw conflictError("You cannot review yourself.");
  }

  if (await reviewRepository.hasReviewedAlready(contractId, reviewerId)) {
    throw conflictError("You have already reviewed this contract.");
  }

  const review = await reviewRepository.createReview({
    rating,
    title,
    comment,
    tags,
    contractID: contractId,
    reviewerID: reviewerId,
    receiverID: partyContext.receiverID,
  });

  const ratingSummary = await reviewRepository.getAverageRatingByReceiverId(
    partyContext.receiverID,
  );

  createActivity({
    freelancerID: partyContext.receiverID,
    eventType: "review_received",
    metadata: {
      stars: rating,
      reviewerName: partyContext.reviewerName,
      contractID: contractId,
      reviewerID: reviewerId,
      receiverID: partyContext.receiverID,
      averageRating: ratingSummary.averageRating,
      reviewCount: ratingSummary.reviewCount,
    },
  }).catch(() => {});

  if (partyContext.receiverRole === "freelancer") {
    pushFreelancerNotification({
      types: "system",
      receiverID: partyContext.receiverID,
      title: "New Review Received",
      msg: `${partyContext.reviewerName} left you a ${rating}-star review.`,
      metadata: {
        projectID: contract.projectID,
        projectTitle: contract.projectTitle,
        contractID: contractId,
        reviewID: review.reviewID,
        actionUrl: "/freelancer/profile",
      },
    }).catch(() => {});
  } else {
    pushNotification({
      types: "system",
      receiverID: partyContext.receiverID,
      title: "New Review Received",
      msg: `${partyContext.reviewerName} left you a ${rating}-star review.`,
    }).catch(() => {});
  }

  const io = getIO();
  if (io) {
    emitReviewReceived(io, {
      contractID: contractId,
      reviewID: review.reviewID,
      reviewerID: reviewerId,
      receiverID: partyContext.receiverID,
      stars: rating,
      averageRating: ratingSummary.averageRating,
      reviewCount: ratingSummary.reviewCount,
    });
  }

  return { review, ratingSummary };
}

export async function getMyReceivedReviews(userID, query = {}) {
  const receiverId = coercePositiveInt(userID, "user ID");
  return reviewRepository.getReviewsByReceiverId(receiverId, query);
}

export async function getReviewsForFreelancer(freelancerID, query = {}) {
  const receiverId = coercePositiveInt(freelancerID, "freelancer ID");
  return reviewRepository.getReviewsByReceiverId(receiverId, query);
}

export async function getAverageRating(freelancerID) {
  const receiverId = coercePositiveInt(freelancerID, "freelancer ID");
  return reviewRepository.getAverageRatingByReceiverId(receiverId);
}

export async function getReviewStats(freelancerID) {
  const receiverId = coercePositiveInt(freelancerID, "freelancer ID");
  return reviewRepository.getRatingStatsByReceiverId(receiverId);
}

export async function updateReview(reviewID, userID, payload) {
  const reviewerId = coercePositiveInt(userID, "user ID");
  const validated = validate(reviewSchemas.update, payload ?? {});
  const review = await reviewRepository.getReviewById(reviewID);

  if (!review) {
    throw notFoundError("Review not found.");
  }
  if (review.reviewerID !== reviewerId) {
    throw forbiddenError("You can only update your own review.");
  }

  return reviewRepository.updateReviewById(reviewID, validated);
}

export async function deleteReview(reviewID, userID) {
  const reviewerId = coercePositiveInt(userID, "user ID");
  const review = await reviewRepository.getReviewById(reviewID);
  if (!review) {
    throw notFoundError("Review not found.");
  }
  if (review.reviewerID !== reviewerId) {
    throw forbiddenError("You can only delete your own review.");
  }

  return reviewRepository.softDeleteReview(reviewID);
}

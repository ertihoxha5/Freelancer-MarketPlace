import * as projectRepository from "../repositories/projectRepository.js";
import * as reviewRepository from "../repositories/reviewRepository.js";
import {
  pushNotification,
  pushFreelancerNotification,
} from "./notificationService.js";
import { createActivity } from "./activityService.js";
import { getIO } from "../socket/index.js";
import { emitReviewReceived } from "../socket/handlers/businessHandlers.js";

function validationError(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function notFoundError(message) {
  const err = new Error(message);
  err.statusCode = 404;
  return err;
}

function forbiddenError(message) {
  const err = new Error(message);
  err.statusCode = 403;
  return err;
}

function conflictError(message) {
  const err = new Error(message);
  err.statusCode = 409;
  return err;
}

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
  const stars = Number(payload?.stars);
  const comment = typeof payload?.comment === "string"
    ? payload.comment.trim()
    : "";

  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    throw validationError("Stars must be an integer between 1 and 5.");
  }

  if (!comment) {
    throw validationError("Review comment is required.");
  }

  if (comment.length > 255) {
    throw validationError("Review comment must be 255 characters or fewer.");
  }

  const contract = await projectRepository.getContractById(contractId);
  if (!contract) {
    throw notFoundError("Contract not found.");
  }

  if (contract.cStatus !== "completed") {
    throw conflictError("Reviews can only be left on completed contracts.");
  }

  const partyContext = getContractPartyContext(contract, reviewerId, role);

  if (await reviewRepository.hasReviewedAlready(contractId, reviewerId)) {
    throw conflictError("You have already reviewed this contract.");
  }

  const review = await reviewRepository.createReview({
    stars,
    comment,
    contractID: contractId,
    reviewerID: reviewerId,
    receiverID: partyContext.receiverID,
  });

  const ratingSummary = await reviewRepository.getRatingSummaryByReceiverId(
    partyContext.receiverID,
  );

  createActivity({
    freelancerID: partyContext.receiverID,
    eventType: "review_received",
    metadata: {
      stars,
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
      msg: `${partyContext.reviewerName} left you a ${stars}-star review.`,
      metadata: {
        projectID: contract.projectID,
        projectTitle: contract.projectTitle,
        contractID: contractId,
        reviewID: review.id,
        actionUrl: "/freelancer/profile",
      },
    }).catch(() => {});
  } else {
    pushNotification({
      types: "system",
      receiverID: partyContext.receiverID,
      title: "New Review Received",
      msg: `${partyContext.reviewerName} left you a ${stars}-star review.`,
    }).catch(() => {});
  }

  const io = getIO();
  if (io) {
    emitReviewReceived(io, {
      contractID: contractId,
      reviewID: review.id,
      reviewerID: reviewerId,
      receiverID: partyContext.receiverID,
      stars,
      averageRating: ratingSummary.averageRating,
      reviewCount: ratingSummary.reviewCount,
    });
  }

  return { review, ratingSummary };
}

export async function getMyReceivedReviews(userID) {
  const receiverId = coercePositiveInt(userID, "user ID");
  const reviews = await reviewRepository.getReviewsByReceiverId(receiverId);
  const ratingSummary = await reviewRepository.getRatingSummaryByReceiverId(
    receiverId,
  );

  return { reviews, ratingSummary };
}

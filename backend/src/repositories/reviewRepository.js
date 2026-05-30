import Review from "../models/ReviewModel.js";

const SORT_OPTIONS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  helpful: { helpfulCount: -1, createdAt: -1 },
  rating_desc: { rating: -1, createdAt: -1 },
  rating_asc: { rating: 1, createdAt: -1 },
};

function buildReviewFilter(receiverID, options = {}) {
  const filter = { receiverID, deletedAt: null };

  if (options.rating !== undefined && options.rating !== null) {
    filter.rating = Number(options.rating);
  }

  if (options.minHelpful !== undefined && options.minHelpful !== null) {
    filter.helpfulCount = { $gte: Number(options.minHelpful) };
  }

  if (options.from || options.to) {
    filter.createdAt = {};
    if (options.from) {
      const start = new Date(options.from);
      if (!Number.isNaN(start.getTime())) {
        filter.createdAt.$gte = start;
      }
    }
    if (options.to) {
      const end = new Date(options.to);
      if (!Number.isNaN(end.getTime())) {
        filter.createdAt.$lte = end;
      }
    }
    if (Object.keys(filter.createdAt).length === 0) {
      delete filter.createdAt;
    }
  }

  return filter;
}

// ==================== MAIN FIXES APPLIED ====================

export async function createReview({
  rating,
  title,
  comment,
  tags,
  contractID,
  reviewerID,
  receiverID,
}) {
  try {
    const review = await Review.create({
      rating,
      title,
      comment,
      tags: tags ?? [],
      contractID,
      reviewerID,
      receiverID,
    });
    return review.toObject();
  } catch (err) {
    console.error("❌ Error creating review:", err);
    throw err;
  }
}

export async function getReviewById(reviewID) {
  return Review.findOne({ reviewID, deletedAt: null }).lean();
}

export async function getReviewsByReceiverId(receiverID, options = {}) {
  const page = Number(options.page) || 1;
  const limit = Math.min(Math.max(Number(options.limit) || 20, 1), 100);
  const filter = buildReviewFilter(receiverID, options);
  const sort = SORT_OPTIONS[options.sort] ?? SORT_OPTIONS.newest;
  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    Review.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Review.countDocuments(filter),
  ]);

  return {
    reviews,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getReviewByContractAndReviewer(contractID, reviewerID) {
  try {
    console.log(`🔍 Checking review for contract ${contractID} by reviewer ${reviewerID}`);
    
    const review = await Review.findOne({ 
      contractID, 
      reviewerID, 
      deletedAt: null 
    }).lean();

    return review;
  } catch (err) {
    console.error("❌ Error in getReviewByContractAndReviewer:", err.message);
    throw err;
  }
}

export async function hasReviewedAlready(contractID, reviewerID) {
  try {
    const review = await getReviewByContractAndReviewer(contractID, reviewerID);
    return Boolean(review);
  } catch (err) {
    console.error(`❌ hasReviewedAlready failed for contract ${contractID}:`, err.message);
    return false; // Safe fallback - very important to prevent 500 errors
  }
}

export async function updateReviewById(reviewID, updates) {
  const review = await Review.findOneAndUpdate(
    { reviewID, deletedAt: null },
    { $set: updates },
    { new: true }
  );
  return review ? review.toObject() : null;
}

export async function softDeleteReview(reviewID) {
  const review = await Review.findOneAndUpdate(
    { reviewID, deletedAt: null },
    { $set: { deletedAt: new Date() } },
    { new: true }
  );
  return review ? review.toObject() : null;
}

export async function getAverageRatingByReceiverId(receiverID) {
  const [result] = await Review.aggregate([
    { $match: { receiverID, deletedAt: null } },
    {
      $group: {
        _id: "$receiverID",
        averageRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  return {
    receiverID,
    averageRating:
      result?.averageRating == null
        ? null
        : Number(result.averageRating.toFixed(2)),
    reviewCount: result?.reviewCount ?? 0,
  };
}

export async function getRatingStatsByReceiverId(receiverID) {
  const result = await Review.aggregate([
    { $match: { receiverID, deletedAt: null } },
    {
      $group: {
        _id: "$rating",
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const stats = result.reduce(
    (acc, entry) => {
      acc[entry._id] = entry.count;
      acc.total += entry.count;
      return acc;
    },
    { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, total: 0 }
  );

  return { receiverID, stats };
}
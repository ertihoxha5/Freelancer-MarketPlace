import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    reviewID: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => new mongoose.Types.ObjectId().toHexString(),
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    tags: {
      type: [String],
      default: [],
      validate: [
        (tags) => tags.length <= 10,
        "A review can include at most 10 tags.",
      ],
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    helpfulCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    contractID: {
      type: Number,
      required: true,
      index: true,
    },
    reviewerID: {
      type: Number,
      required: true,
      index: true,
    },
    receiverID: {
      type: Number,
      required: true,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret.reviewID;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
    },
  },
);

reviewSchema.index({ receiverID: 1, deletedAt: 1, rating: 1, createdAt: -1 });
reviewSchema.index({ reviewerID: 1, deletedAt: 1 });
reviewSchema.index({ contractID: 1, deletedAt: 1 });
reviewSchema.index({ helpfulCount: -1 });

const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);
export default Review;

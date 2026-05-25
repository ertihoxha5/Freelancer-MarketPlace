import mongoose from "mongoose";

/**
 * Activity feed stored in MongoDB.
 *
 * MongoDB is used because activity metadata changes by event type, writes are
 * append-heavy, and reads are usually scoped by freelancerID with time sorting.
 */
const activitySchema = new mongoose.Schema(
  {
    // Freelancer who owns this activity.
    freelancerID: {
      type: Number,
      required: true,
      index: true,
    },

    // Activity event type.
    eventType: {
      type: String,
      required: true,
      enum: [
        "application_accepted",
        "application_rejected",
        "application_submitted",
        "application_withdrawn",
        "new_message",
        "project_completed",
        "project_cancelled",
        "profile_viewed",
        "review_received",
      ],
    },

    // Short display title.
    title: {
      type: String,
      required: true,
      maxlength: 100,
    },

    // Full display message.
    message: {
      type: String,
      maxlength: 500,
    },

    // Event-specific metadata.
    metadata: {
      projectID: Number,
      projectTitle: String,
      clientID: Number,
      clientName: String,
      applicationID: Number,
      bidAmount: Number,
      estimatedDays: Number,

      conversationID: Number,
      senderName: String,
      messagePreview: String,

      stars: Number,
      reviewerName: String,
      contractID: Number,
      reviewerID: Number,
      receiverID: Number,
      averageRating: Number,
      reviewCount: Number,

      actionUrl: String,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    icon: {
      type: String,
      default: "bell",
    },
  },
  {
    timestamps: true,
  },
);

activitySchema.index({ freelancerID: 1, createdAt: -1 });
activitySchema.index({ freelancerID: 1, isRead: 1 });
activitySchema.index({ freelancerID: 1, eventType: 1 });

activitySchema.methods.markAsRead = function () {
  this.isRead = true;
  return this.save();
};

activitySchema.statics.markAllReadForFreelancer = function (freelancerID) {
  return this.updateMany(
    { freelancerID, isRead: false },
    { $set: { isRead: true } },
  );
};

activitySchema.statics.cleanupOld = function () {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  return this.deleteMany({ createdAt: { $lt: ninetyDaysAgo } });
};

const Activity = mongoose.model("Activity", activitySchema);

export default Activity;

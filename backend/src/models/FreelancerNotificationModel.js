import mongoose from "mongoose";

const freelancerNotificationSchema = new mongoose.Schema(
  {
    receiverID: {
      type: Number,
      required: true,
      index: true,
    },

    types: {
      type: String,
      enum: ["message", "system"],
      required: true,
      default: "system",
    },

    title: {
      type: String,
      required: true,
      maxlength: 100,
      trim: true,
    },

    msg: {
      type: String,
      maxlength: 500,
      default: null,
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
      default: "🔔",
    },

    metadata: {
      projectID: { type: Number, default: null },
      projectTitle: { type: String, default: null },
      conversationID: { type: Number, default: null },
      senderName: { type: String, default: null },
      applicationID: { type: Number, default: null },
      actionUrl: { type: String, default: null },
    },
  },
  {
    timestamps: true,
    collection: "freelancer_notifications",
  },
);

freelancerNotificationSchema.index({ receiverID: 1, createdAt: -1 });
freelancerNotificationSchema.index({ receiverID: 1, isRead: 1, createdAt: -1 });
freelancerNotificationSchema.index({ receiverID: 1, types: 1, createdAt: -1 });

freelancerNotificationSchema.statics.markAllReadForUser = function (
  receiverID,
) {
  return this.updateMany(
    { receiverID: Number(receiverID), isRead: false },
    { $set: { isRead: true } },
  );
};

freelancerNotificationSchema.statics.cleanupOld = function () {
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  return this.deleteMany({ createdAt: { $lt: sixtyDaysAgo } });
};

const FreelancerNotification = mongoose.model(
  "FreelancerNotification",
  freelancerNotificationSchema,
);

export default FreelancerNotification;

import Activity from "../models/ActivityModel.js";
import { notFoundError } from "../utils/errors.js";

/**
 * Event display configuration.
 */
const EVENT_CONFIG = {
  application_accepted: {
    icon: "check",
    priority: "high",
    titleTemplate: () => "Application Accepted",
    messageTemplate: (data) =>
      `${data.clientName} accepted your application for "${data.projectTitle}".`,
    actionUrl: () => "/freelancer/applications",
  },
  application_rejected: {
    icon: "x",
    priority: "medium",
    titleTemplate: () => "Application Rejected",
    messageTemplate: (data) =>
      `${data.clientName} rejected your application for "${data.projectTitle}".`,
    actionUrl: () => "/freelancer/applications",
  },
  application_submitted: {
    icon: "mail",
    priority: "low",
    titleTemplate: () => "Application Submitted",
    messageTemplate: (data) =>
      `You applied successfully for "${data.projectTitle}".`,
    actionUrl: () => "/freelancer/applications",
  },
  application_withdrawn: {
    icon: "undo",
    priority: "low",
    titleTemplate: () => "Application Withdrawn",
    messageTemplate: (data) =>
      `You withdrew your application for "${data.projectTitle}".`,
    actionUrl: () => "/freelancer/applications",
  },
  new_message: {
    icon: "message",
    priority: "high",
    titleTemplate: (data) => `New Message from ${data.senderName}`,
    messageTemplate: (data) =>
      data.messagePreview
        ? `"${data.messagePreview.slice(0, 80)}..."`
        : "You received a new message.",
    actionUrl: () => "/client/messages",
  },
  project_completed: {
    icon: "success",
    priority: "high",
    titleTemplate: () => "Project Completed",
    messageTemplate: (data) =>
      `Project "${data.projectTitle}" was completed successfully.`,
    actionUrl: () => "/freelancer/applications",
  },
  project_cancelled: {
    icon: "warning",
    priority: "urgent",
    titleTemplate: () => "Project Cancelled",
    messageTemplate: (data) =>
      `Project "${data.projectTitle}" was cancelled by the client.`,
    actionUrl: () => "/freelancer/applications",
  },
  review_received: {
    icon: "star",
    priority: "medium",
    titleTemplate: (data) => `New Review - ${data.stars} stars`,
    messageTemplate: (data) => `${data.reviewerName} left you a new review.`,
    actionUrl: () => "/freelancer/profile",
  },
};

/**
 * Create a new MongoDB activity.
 *
 * @param {object} params
 * @param {number} params.freelancerID
 * @param {string} params.eventType
 * @param {object} params.metadata - event-specific data
 */
export async function createActivity({
  freelancerID,
  eventType,
  metadata = {},
}) {
  try {
    const config = EVENT_CONFIG[eventType];
    if (!config) {
      console.warn(`Unknown activity eventType: ${eventType}`);
      return null;
    }

    const activity = new Activity({
      freelancerID,
      eventType,
      title: config.titleTemplate(metadata),
      message: config.messageTemplate(metadata),
      metadata: {
        ...metadata,
        actionUrl: config.actionUrl(metadata),
      },
      isRead: false,
      priority: config.priority,
      icon: config.icon,
    });

    await activity.save();
    return activity;
  } catch (err) {
    console.error("Failed to create activity in MongoDB:", err.message);
    return null;
  }
}

/**
 * Get the activity feed for one freelancer.
 *
 * @param {number} freelancerID
 * @param {object} options - { page, limit, eventType, onlyUnread }
 */
export async function getActivityFeed(freelancerID, options = {}) {
  const {
    page = 1,
    limit = 20,
    eventType = null,
    onlyUnread = false,
  } = options;

  const filter = { freelancerID: Number(freelancerID) };
  if (eventType) filter.eventType = eventType;
  if (onlyUnread) filter.isRead = false;

  const skip = (page - 1) * limit;

  const [activities, total, unreadCount] = await Promise.all([
    Activity.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Activity.countDocuments(filter),
    Activity.countDocuments({
      freelancerID: Number(freelancerID),
      isRead: false,
    }),
  ]);

  return {
    activities,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + activities.length < total,
    },
    unreadCount,
  };
}

/**
 * Mark one activity as read.
 */
export async function markActivityRead(activityId, freelancerID) {
  const activity = await Activity.findOne({
    _id: activityId,
    freelancerID: Number(freelancerID),
  });

  if (!activity) {
    throw notFoundError("Activity not found.");
  }

  activity.isRead = true;
  await activity.save();
  return activity;
}

/**
 * Mark all activities as read.
 */
export async function markAllActivitiesRead(freelancerID) {
  const result = await Activity.markAllReadForFreelancer(Number(freelancerID));
  return { modifiedCount: result.modifiedCount };
}

/**
 * Delete one activity.
 */
export async function deleteActivity(activityId, freelancerID) {
  const result = await Activity.deleteOne({
    _id: activityId,
    freelancerID: Number(freelancerID),
  });

  if (result.deletedCount === 0) {
    throw notFoundError("Activity not found.");
  }
  return { deleted: true };
}

/**
 * Delete all freelancer activities.
 */
export async function deleteAllActivities(freelancerID) {
  const result = await Activity.deleteMany({
    freelancerID: Number(freelancerID),
  });
  return { deletedCount: result.deletedCount };
}

/**
 * Get unread activity count for badges.
 */
export async function getUnreadActivityCount(freelancerID) {
  const count = await Activity.countDocuments({
    freelancerID: Number(freelancerID),
    isRead: false,
  });
  return { count };
}

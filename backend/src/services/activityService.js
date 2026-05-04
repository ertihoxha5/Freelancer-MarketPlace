import Activity from "../models/ActivityModel.js";

/**
 * Konfigurimet e eventeve - ikona dhe prioritetet
 */
const EVENT_CONFIG = {
  application_accepted: {
    icon: "✅",
    priority: "high",
    titleTemplate: (data) => `Aplikimi u pranua!`,
    messageTemplate: (data) =>
      `Klienti ${data.clientName} pranoi aplikimin tuaj për projektin "${data.projectTitle}".`,
    actionUrl: (data) => `/freelancer/applications`,
  },
  application_rejected: {
    icon: "❌",
    priority: "medium",
    titleTemplate: (data) => `Aplikimi u refuzua`,
    messageTemplate: (data) =>
      `Klienti ${data.clientName} refuzoi aplikimin tuaj për projektin "${data.projectTitle}".`,
    actionUrl: (data) => `/freelancer/applications`,
  },
  application_submitted: {
    icon: "📨",
    priority: "low",
    titleTemplate: (data) => `Aplikim i dërguar`,
    messageTemplate: (data) =>
      `Keni aplikuar me sukses për projektin "${data.projectTitle}".`,
    actionUrl: (data) => `/freelancer/applications`,
  },
  application_withdrawn: {
    icon: "↩️",
    priority: "low",
    titleTemplate: () => `Aplikim i tërhequr`,
    messageTemplate: (data) =>
      `Keni tërhequr aplikimin për projektin "${data.projectTitle}".`,
    actionUrl: () => `/freelancer/applications`,
  },
  new_message: {
    icon: "💬",
    priority: "high",
    titleTemplate: (data) => `Mesazh i ri nga ${data.senderName}`,
    messageTemplate: (data) =>
      data.messagePreview
        ? `"${data.messagePreview.slice(0, 80)}..."`
        : "Keni marrë një mesazh të ri.",
    actionUrl: (data) => `/client/messages`,
  },
  project_completed: {
    icon: "🎉",
    priority: "high",
    titleTemplate: (data) => `Projekt i kompletuar`,
    messageTemplate: (data) =>
      `Projekti "${data.projectTitle}" u kompletua me sukses.`,
    actionUrl: (data) => `/freelancer/applications`,
  },
  project_cancelled: {
    icon: "⚠️",
    priority: "urgent",
    titleTemplate: () => `Projekt i anuluar`,
    messageTemplate: (data) =>
      `Projekti "${data.projectTitle}" u anulua nga klienti.`,
    actionUrl: () => `/freelancer/applications`,
  },
  review_received: {
    icon: "⭐",
    priority: "medium",
    titleTemplate: (data) => `Vlerësim i ri - ${data.stars} yje`,
    messageTemplate: (data) => `${data.reviewerName} ju la një vlerësim të ri.`,
    actionUrl: () => `/freelancer/profile`,
  },
};

/**
 * Krijo një aktivitet të ri në MongoDB
 * @param {object} params
 * @param {number} params.freelancerID
 * @param {string} params.eventType
 * @param {object} params.metadata - të dhënat specifike të eventit
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
    // Nuk e ndal procesin kryesor nëse MongoDB dështon
    console.error("Failed to create activity in MongoDB:", err.message);
    return null;
  }
}

/**
 * Merr feed-in e aktiviteteve për një freelancer
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
 * Shëno një aktivitet si të lexuar
 */
export async function markActivityRead(activityId, freelancerID) {
  const activity = await Activity.findOne({
    _id: activityId,
    freelancerID: Number(freelancerID),
  });

  if (!activity) {
    const err = new Error("Activity not found.");
    err.statusCode = 404;
    throw err;
  }

  activity.isRead = true;
  await activity.save();
  return activity;
}

/**
 * Shëno të gjitha aktivitetet si të lexuara
 */
export async function markAllActivitiesRead(freelancerID) {
  const result = await Activity.markAllReadForFreelancer(Number(freelancerID));
  return { modifiedCount: result.modifiedCount };
}

/**
 * Fshi një aktivitet
 */
export async function deleteActivity(activityId, freelancerID) {
  const result = await Activity.deleteOne({
    _id: activityId,
    freelancerID: Number(freelancerID),
  });

  if (result.deletedCount === 0) {
    const err = new Error("Activity not found.");
    err.statusCode = 404;
    throw err;
  }
  return { deleted: true };
}

/**
 * Fshi të gjitha aktivitetet e freelancerit
 */
export async function deleteAllActivities(freelancerID) {
  const result = await Activity.deleteMany({
    freelancerID: Number(freelancerID),
  });
  return { deletedCount: result.deletedCount };
}

/**
 * Merr numrin e aktiviteteve të palexuara (për badge)
 */
export async function getUnreadActivityCount(freelancerID) {
  const count = await Activity.countDocuments({
    freelancerID: Number(freelancerID),
    isRead: false,
  });
  return { count };
}

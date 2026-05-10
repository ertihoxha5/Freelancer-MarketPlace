import FreelancerNotification from "../models/FreelancerNotificationModel.js";

const NOTIFICATION_CONFIG = {
  message: {
    icon: "💬",
    priority: "high",
  },
  system: {
    icon: "🔔",
    priority: "medium",
  },
};

export async function getMyNotifications(userID) {
  const notifications = await FreelancerNotification.find({
    receiverID: Number(userID),
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return notifications;
}

export async function getMyUnreadCount(userID) {
  const count = await FreelancerNotification.countDocuments({
    receiverID: Number(userID),
    isRead: false,
  });
  return { count };
}

export async function markNotificationRead(id, userID) {
  const notif = await FreelancerNotification.findOneAndUpdate(
    { _id: id, receiverID: Number(userID) },
    { $set: { isRead: true } },
    { new: true },
  );

  if (!notif) {
    const err = new Error("Notification not found.");
    err.statusCode = 404;
    throw err;
  }

  return { id };
}

export async function markAllNotificationsRead(userID) {
  const result = await FreelancerNotification.markAllReadForUser(
    Number(userID),
  );
  return { affected: result.modifiedCount };
}

export async function deleteMyNotification(id, userID) {
  const result = await FreelancerNotification.deleteOne({
    _id: id,
    receiverID: Number(userID),
  });

  if (result.deletedCount === 0) {
    const err = new Error("Notification not found.");
    err.statusCode = 404;
    throw err;
  }

  return { id };
}

export async function deleteAllMyNotifications(userID) {
  const result = await FreelancerNotification.deleteMany({
    receiverID: Number(userID),
  });
  return { affected: result.deletedCount };
}

/**
 * Krijo dhe dërgo njoftim te freelancer-i (MongoDB Atlas)
 *
 * @param {{ types: 'system'|'message', receiverID: number, title: string, msg: string, metadata?: object }} payload
 */
export async function pushFreelancerNotification({
  types = "system",
  receiverID,
  title,
  msg = null,
  metadata = {},
}) {
  try {
    const config = NOTIFICATION_CONFIG[types] || NOTIFICATION_CONFIG.system;

    const notif = new FreelancerNotification({
      receiverID: Number(receiverID),
      types,
      title: String(title).slice(0, 100),
      msg: msg ? String(msg).slice(0, 500) : null,
      isRead: false,
      priority: config.priority,
      icon: config.icon,
      metadata: {
        projectID: metadata.projectID ?? null,
        projectTitle: metadata.projectTitle ?? null,
        conversationID: metadata.conversationID ?? null,
        senderName: metadata.senderName ?? null,
        applicationID: metadata.applicationID ?? null,
        actionUrl: metadata.actionUrl ?? null,
      },
    });

    await notif.save();
    return notif;
  } catch (err) {
    console.error(
      "Failed to create freelancer notification in MongoDB:",
      err.message,
    );
    return null;
  }
}

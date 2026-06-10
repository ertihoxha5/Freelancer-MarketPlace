import * as notificationRepository from "../repositories/notificationRepository.js";
import { validationError } from "../utils/errors.js";

export async function getMyNotifications(userID) {
  return notificationRepository.getNotificationsByUserId(userID);
}

export async function getMyUnreadCount(userID) {
  return notificationRepository.getUnreadCount(userID);
}

export async function markNotificationRead(id, userID) {
  const notifId = Number(id);
  if (!Number.isInteger(notifId) || notifId <= 0) {
    throw validationError("Valid notification id is required.");
  }
  return notificationRepository.markAsRead(notifId, userID);
}

export async function markAllNotificationsRead(userID) {
  return notificationRepository.markAllAsRead(userID);
}

export async function deleteMyNotification(id, userID) {
  const notifId = Number(id);
  if (!Number.isInteger(notifId) || notifId <= 0) {
    throw validationError("Valid notification id is required.");
  }
  return notificationRepository.deleteNotification(notifId, userID);
}

export async function deleteAllMyNotifications(userID) {
  return notificationRepository.deleteAllNotifications(userID);
}

/**

 * @param {{ types: 'system'|'message', receiverID: number, title: string, msg: string }} payload
 */
export async function pushNotification({ types, receiverID, title, msg }) {
  return notificationRepository.createNotification({
    types,
    receiverID,
    title,
    msg,
  });
}

export async function pushToAllAdmins({ types, title, msg }) {
  try {
    const adminIds = await notificationRepository.getAdminUserIds();

    await Promise.all(
      adminIds.map((adminId) =>
        notificationRepository.createNotification({
          types,
          receiverID: adminId,
          title,
          msg,
        }),
      ),
    );
  } catch {}
}

/**
 * Compatibility wrapper so existing call sites that do
 * `pushFreelancerNotification(...)` continue to work.
 * Notifications for freelancers now use the exact same MySQL-backed
 * logic/table as clients (no more separate Mongo collection for basic notifications).
 */
export async function pushFreelancerNotification({ types, receiverID, title, msg }) {
  return pushNotification({ types, receiverID, title, msg });
}

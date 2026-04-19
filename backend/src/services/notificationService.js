import * as notificationRepository from "../repositories/notificationRepository.js";

function validationError(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

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

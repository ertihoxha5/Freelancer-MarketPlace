// Legacy controller kept for compatibility. It now delegates to the exact same
// notification logic used by clients (MySQL Notifications table via shared service).
import * as notificationService from "../services/notificationService.js";
import { validatedParams } from "../middleware/validateRequest.js";

function handleError(err, res, next) {
  if (err.statusCode) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  return next(err);
}

export async function getNotifications(req, res, next) {
  try {
    const notifications = await notificationService.getMyNotifications(
      req.user.id,
    );
    return res.status(200).json({ notifications });
  } catch (err) {
    return handleError(err, res, next);
  }
}

export async function getUnreadCount(req, res, next) {
  try {
    const count = await notificationService.getMyUnreadCount(req.user.id);
    return res.status(200).json({ count });
  } catch (err) {
    return handleError(err, res, next);
  }
}

export async function markAsRead(req, res, next) {
  try {
    const { id } = validatedParams(req);
    const result = await notificationService.markNotificationRead(id, req.user.id);
    return res
      .status(200)
      .json({ message: "Notification marked as read.", ...result });
  } catch (err) {
    return handleError(err, res, next);
  }
}

export async function markAllAsRead(req, res, next) {
  try {
    const result = await notificationService.markAllNotificationsRead(
      req.user.id,
    );
    return res
      .status(200)
      .json({ message: "All notifications marked as read.", ...result });
  } catch (err) {
    return handleError(err, res, next);
  }
}

export async function deleteNotification(req, res, next) {
  try {
    const { id } = validatedParams(req);
    const result = await notificationService.deleteMyNotification(id, req.user.id);
    return res
      .status(200)
      .json({ message: "Notification deleted.", ...result });
  } catch (err) {
    return handleError(err, res, next);
  }
}

export async function deleteAllNotifications(req, res, next) {
  try {
    const result = await notificationService.deleteAllMyNotifications(
      req.user.id,
    );
    return res
      .status(200)
      .json({ message: "All notifications deleted.", ...result });
  } catch (err) {
    return handleError(err, res, next);
  }
}

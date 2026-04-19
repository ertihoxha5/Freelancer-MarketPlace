import * as notificationService from "../services/notificationService.js";

export async function getNotifications(req, res, next) {
  try {
    const notifications = await notificationService.getMyNotifications(
      req.user.id,
    );
    return res.status(200).json({ notifications });
  } catch (err) {
    if (err.statusCode)
      return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
}

export async function getUnreadCount(req, res, next) {
  try {
    const count = await notificationService.getMyUnreadCount(req.user.id);
    return res.status(200).json({ count });
  } catch (err) {
    if (err.statusCode)
      return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
}

export async function markAsRead(req, res, next) {
  try {
    const result = await notificationService.markNotificationRead(
      req.params.id,
      req.user.id,
    );
    return res
      .status(200)
      .json({ message: "Notification marked as read.", ...result });
  } catch (err) {
    if (err.statusCode)
      return res.status(err.statusCode).json({ message: err.message });
    next(err);
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
    if (err.statusCode)
      return res.status(err.statusCode).json({ message: err.message });
    next(err);
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
    if (err.statusCode)
      return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
}

export async function deleteNotification(req, res, next) {
  try {
    const result = await notificationService.deleteMyNotification(
      req.params.id,
      req.user.id,
    );
    return res
      .status(200)
      .json({ message: "Notification deleted.", ...result });
  } catch (err) {
    if (err.statusCode)
      return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
}

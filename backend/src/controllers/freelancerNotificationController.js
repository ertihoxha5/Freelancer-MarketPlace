import * as freelancerNotifService from "../services/freelancerNotificationService.js";

function handleError(err, res, next) {
  if (err.statusCode) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  return next(err);
}

export async function getNotifications(req, res, next) {
  try {
    const rawNotifications = await freelancerNotifService.getMyNotifications(
      req.user.id,
    );

    const notifications = rawNotifications.map((n) => ({
      id: n._id,
      types: n.types,
      title: n.title,
      msg: n.msg,
      isRead: n.isRead,
      priority: n.priority,
      icon: n.icon,
      metadata: n.metadata,
      createdAt: n.createdAt,
    }));

    return res.status(200).json({ notifications });
  } catch (err) {
    return handleError(err, res, next);
  }
}

export async function getUnreadCount(req, res, next) {
  try {
    const result = await freelancerNotifService.getMyUnreadCount(req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    return handleError(err, res, next);
  }
}

export async function markAsRead(req, res, next) {
  try {
    const result = await freelancerNotifService.markNotificationRead(
      req.params.id,
      req.user.id,
    );
    return res
      .status(200)
      .json({ message: "Notification marked as read.", ...result });
  } catch (err) {
    return handleError(err, res, next);
  }
}

export async function markAllAsRead(req, res, next) {
  try {
    const result = await freelancerNotifService.markAllNotificationsRead(
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
    const result = await freelancerNotifService.deleteMyNotification(
      req.params.id,
      req.user.id,
    );
    return res
      .status(200)
      .json({ message: "Notification deleted.", ...result });
  } catch (err) {
    return handleError(err, res, next);
  }
}

export async function deleteAllNotifications(req, res, next) {
  try {
    const result = await freelancerNotifService.deleteAllMyNotifications(
      req.user.id,
    );
    return res
      .status(200)
      .json({ message: "All notifications deleted.", ...result });
  } catch (err) {
    return handleError(err, res, next);
  }
}

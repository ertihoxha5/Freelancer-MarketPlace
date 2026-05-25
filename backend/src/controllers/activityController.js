import * as activityService from "../services/activityService.js";
import { validatedParams, validatedQuery } from "../middleware/validateRequest.js";

function handleError(err, res, next) {
  if (err.statusCode) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  return next(err);
}

/**
 * GET /api/freelancer/activities
 * Query params: page, limit, eventType, onlyUnread
 */
export async function getActivityFeed(req, res, next) {
  try {
    const { page, limit, eventType, onlyUnread } = validatedQuery(req);
    const result = await activityService.getActivityFeed(req.user.id, {
      page: page ?? 1,
      limit: limit ? Math.min(limit, 50) : 20,
      eventType: eventType || null,
      onlyUnread: onlyUnread === "true",
    });
    return res.status(200).json(result);
  } catch (err) {
    return handleError(err, res, next);
  }
}

/**
 * GET /api/freelancer/activities/unread-count
 */
export async function getUnreadCount(req, res, next) {
  try {
    const result = await activityService.getUnreadActivityCount(req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    return handleError(err, res, next);
  }
}

/**
 * PATCH /api/freelancer/activities/:id/read
 */
export async function markAsRead(req, res, next) {
  try {
    const { id } = validatedParams(req);
    const activity = await activityService.markActivityRead(id, req.user.id);
    return res.status(200).json({ message: "Marked as read.", activity });
  } catch (err) {
    return handleError(err, res, next);
  }
}

/**
 * PATCH /api/freelancer/activities/read-all
 */
export async function markAllAsRead(req, res, next) {
  try {
    const result = await activityService.markAllActivitiesRead(req.user.id);
    return res.status(200).json({ message: "All marked as read.", ...result });
  } catch (err) {
    return handleError(err, res, next);
  }
}

/**
 * DELETE /api/freelancer/activities/:id
 */
export async function deleteActivity(req, res, next) {
  try {
    const { id } = validatedParams(req);
    const result = await activityService.deleteActivity(id, req.user.id);
    return res.status(200).json({ message: "Activity deleted.", ...result });
  } catch (err) {
    return handleError(err, res, next);
  }
}

/**
 * DELETE /api/freelancer/activities
 */
export async function deleteAllActivities(req, res, next) {
  try {
    const result = await activityService.deleteAllActivities(req.user.id);
    return res
      .status(200)
      .json({ message: "All activities deleted.", ...result });
  } catch (err) {
    return handleError(err, res, next);
  }
}

// Notifications for freelancers now use exactly the same logic and storage (MySQL Notifications table)
// as client notifications. This eliminates the separate MongoDB collection for basic notifications
// and the associated "bufferCommands" connection timing issues.

import * as notificationService from "./notificationService.js";

// Delegate all read/write operations to the shared client-style notification service/repository.
export const getMyNotifications = notificationService.getMyNotifications;
export const getMyUnreadCount = notificationService.getMyUnreadCount;
export const markNotificationRead = notificationService.markNotificationRead;
export const markAllNotificationsRead = notificationService.markAllNotificationsRead;
export const deleteMyNotification = notificationService.deleteMyNotification;
export const deleteAllMyNotifications = notificationService.deleteAllMyNotifications;

// Re-export the compatibility push (implemented in notificationService to avoid cycles
// and to write to the unified MySQL table).
export const { pushFreelancerNotification } = notificationService;

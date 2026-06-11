

import * as notificationService from "./notificationService.js";
export const getMyNotifications = notificationService.getMyNotifications;
export const getMyUnreadCount = notificationService.getMyUnreadCount;
export const markNotificationRead = notificationService.markNotificationRead;
export const markAllNotificationsRead = notificationService.markAllNotificationsRead;
export const deleteMyNotification = notificationService.deleteMyNotification;
export const deleteAllMyNotifications = notificationService.deleteAllMyNotifications;
export const { pushFreelancerNotification } = notificationService;

import { db } from "../config/db.js";

export async function getNotificationsByUserId(userID) {
  const [rows] = await db.execute(
    `SELECT id, types, title, msg, isRead, createdAt
         FROM Notifications
         WHERE receiverID = ?
         ORDER BY createdAt DESC`,
    [userID],
  );
  return rows;
}

export async function getUnreadCount(userID) {
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS count
         FROM Notifications
         WHERE receiverID = ? AND isRead = FALSE`,
    [userID],
  );
  return Number(rows[0]?.count ?? 0);
}

export async function markAsRead(id, userID) {
  const [result] = await db.execute(
    `UPDATE Notifications
         SET isRead = TRUE
         WHERE id = ? AND receiverID = ?`,
    [id, userID],
  );
  if (result.affectedRows === 0) {
    const err = new Error("Notification not found.");
    err.statusCode = 404;
    throw err;
  }
  return { id };
}

export async function markAllAsRead(userID) {
  const [result] = await db.execute(
    `UPDATE Notifications
         SET isRead = TRUE
         WHERE receiverID = ? AND isRead = FALSE`,
    [userID],
  );
  return { affected: result.affectedRows };
}

export async function deleteNotification(id, userID) {
  const [result] = await db.execute(
    `DELETE FROM Notifications
         WHERE id = ? AND receiverID = ?`,
    [id, userID],
  );
  if (result.affectedRows === 0) {
    const err = new Error("Notification not found.");
    err.statusCode = 404;
    throw err;
  }
  return { id };
}

export async function deleteAllNotifications(userID) {
  const [result] = await db.execute(
    `DELETE FROM Notifications WHERE receiverID = ?`,
    [userID],
  );
  return { affected: result.affectedRows };
}

export async function createNotification({ types, receiverID, title, msg }) {
  const safeTitle = String(title).slice(0, 20);
  const safeMsg = msg == null ? null : String(msg).slice(0, 255);
  const [result] = await db.execute(
    `INSERT INTO Notifications (types, receiverID, title, msg)
         VALUES (?, ?, ?, ?)`,
    [types, receiverID, safeTitle, safeMsg],
  );
  return { id: result.insertId };
}

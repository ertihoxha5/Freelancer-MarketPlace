import { db } from "../config/db.js";

export async function createTestimonial({
  userID,
  fullName,
  roleTitle,
  rating,
  comment,
  isPublished = true,
}) {
  const [result] = await db.execute(
    `INSERT INTO Testimonials (userID, fullName, roleTitle, rating, comment, isPublished)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userID, fullName, roleTitle, rating, comment, Boolean(isPublished)],
  );
  return getTestimonialById(result.insertId);
}

export async function getTestimonialById(id) {
  const [rows] = await db.execute(
    `SELECT *
     FROM Testimonials
     WHERE id = ?
     LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function listTestimonials({ limit = 6, includeUnpublished = false } = {}) {
  const [rows] = await db.execute(
    `SELECT *
     FROM Testimonials
     WHERE ${includeUnpublished ? "1=1" : "isPublished = TRUE"}
     ORDER BY createdAt DESC
     LIMIT ${Number(limit)}`,
  );
  return rows;
}

export async function setPublicationStatus(id, isPublished) {
  const [result] = await db.execute(
    `UPDATE Testimonials
     SET isPublished = ?
     WHERE id = ?`,
    [Boolean(isPublished), id],
  );
  return result.affectedRows > 0;
}

export async function getTestimonialsByUser(userID) {
  const [rows] = await db.execute(
    `SELECT * FROM Testimonials WHERE userID = ? ORDER BY createdAt DESC`,
    [userID],
  );
  return rows;
}

export async function updateTestimonial(id, userID, { fullName, roleTitle, rating, comment }) {
  const [result] = await db.execute(
    `UPDATE Testimonials
     SET fullName = ?, roleTitle = ?, rating = ?, comment = ?
     WHERE id = ? AND userID = ?`,
    [fullName, roleTitle, rating, comment, id, userID],
  );
  if (result.affectedRows === 0) return null;
  return getTestimonialById(id);
}

export async function deleteTestimonial(id, userID) {
  const [result] = await db.execute(
    `DELETE FROM Testimonials WHERE id = ? AND userID = ?`,
    [id, userID],
  );
  return result.affectedRows > 0;
}

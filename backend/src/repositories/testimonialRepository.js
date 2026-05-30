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


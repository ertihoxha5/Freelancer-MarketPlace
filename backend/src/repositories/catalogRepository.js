import { db } from "../config/db.js";

export async function getCategories({ includeInactive = false } = {}) {
  const where = includeInactive ? "1=1" : "isActive = TRUE";
  const [rows] = await db.execute(
    `SELECT id, cName, slug, cDesc, isActive, createdAt
     FROM Categories
     WHERE ${where}
     ORDER BY cName ASC`,
  );
  return rows;
}

export async function getCategoryById(id) {
  const [rows] = await db.execute(
    `SELECT id, cName, slug, cDesc, isActive, createdAt
     FROM Categories
     WHERE id = ?
     LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

export async function createCategory({ cName, slug, cDesc }) {
  const [result] = await db.execute(
    `INSERT INTO Categories (cName, slug, cDesc, isActive)
     VALUES (?, ?, ?, TRUE)`,
    [cName, slug, cDesc],
  );
  return getCategoryById(result.insertId);
}

export async function updateCategory(id, { cName, slug, cDesc, isActive }) {
  const [result] = await db.execute(
    `UPDATE Categories
     SET cName = ?, slug = ?, cDesc = ?, isActive = ?
     WHERE id = ?`,
    [cName, slug, cDesc, Boolean(isActive), id],
  );
  return result.affectedRows > 0 ? getCategoryById(id) : null;
}

export async function deactivateCategory(id) {
  const [result] = await db.execute(
    `UPDATE Categories SET isActive = FALSE WHERE id = ?`,
    [id],
  );
  return result.affectedRows > 0;
}

export async function getSkills({ includeInactive = false } = {}) {
  const where = includeInactive ? "1=1" : "s.isActive = TRUE";
  const [rows] = await db.execute(
    `SELECT s.id, s.skillName, s.slug, s.isActive, s.createdAt, s.categoryID,
            c.cName AS categoryName
     FROM Skills s
     INNER JOIN Categories c ON c.id = s.categoryID
     WHERE ${where}
     ORDER BY c.cName ASC, s.skillName ASC`,
  );
  return rows;
}

export async function getSkillById(id) {
  const [rows] = await db.execute(
    `SELECT s.id, s.skillName, s.slug, s.isActive, s.createdAt, s.categoryID,
            c.cName AS categoryName
     FROM Skills s
     INNER JOIN Categories c ON c.id = s.categoryID
     WHERE s.id = ?
     LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

export async function createSkill({ skillName, slug, categoryID }) {
  const [result] = await db.execute(
    `INSERT INTO Skills (skillName, slug, categoryID, isActive)
     VALUES (?, ?, ?, TRUE)`,
    [skillName, slug, categoryID],
  );
  return getSkillById(result.insertId);
}

export async function updateSkill(id, { skillName, slug, categoryID, isActive }) {
  const [result] = await db.execute(
    `UPDATE Skills
     SET skillName = ?, slug = ?, categoryID = ?, isActive = ?
     WHERE id = ?`,
    [skillName, slug, categoryID, Boolean(isActive), id],
  );
  return result.affectedRows > 0 ? getSkillById(id) : null;
}

export async function deactivateSkill(id) {
  const [result] = await db.execute(
    `UPDATE Skills SET isActive = FALSE WHERE id = ?`,
    [id],
  );
  return result.affectedRows > 0;
}

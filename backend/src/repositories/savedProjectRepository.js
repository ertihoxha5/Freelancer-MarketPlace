import { randomUUID } from "node:crypto";
import { db } from "../config/db.js";

function resolveSort(sort) {
  switch (sort) {
    case "oldest":
      return "sp.savedAt ASC";
    case "popular":
      return "saveCount DESC, sp.savedAt DESC";
    default:
      return "sp.savedAt DESC";
  }
}

function baseSelectClause() {
  return `
    SELECT
      sp.savedProjectID,
      p.id AS id,
      p.id AS projectID,
      p.title,
      p.pDesc,
      p.budget,
      p.deadline,
      p.pStatus,
      u.fullName AS clientName,
      c.cName AS categoryName,
      sp.folder,
      sp.priority,
      sp.notes,
      sp.savedAt,
      COUNT(DISTINCT spAll.id) AS saveCount
  `;
}

function baseFromClause() {
  return `
    FROM SavedProjects sp
    INNER JOIN Project p ON p.id = sp.projectID
    INNER JOIN Users u ON u.id = p.clientID
    LEFT JOIN Categories c ON c.id = p.categoryID
    LEFT JOIN SavedProjects spAll ON spAll.projectID = p.id
  `;
}

function baseWhereClause() {
  return `WHERE sp.freelancerID = ?`;
}

export async function createSavedProject(userID, projectID) {
  const savedProjectID = randomUUID();
  await db.execute(
    `INSERT INTO SavedProjects
      (savedProjectID, freelancerID, projectID, folder, priority, notes)
     VALUES (?, ?, ?, 'default', 'medium', '')`,
    [savedProjectID, userID, projectID],
  );
  return findSavedProject(userID, projectID);
}

export async function findSavedProject(userID, projectID) {
  const [rows] = await db.execute(
    `
      ${baseSelectClause()}
      ${baseFromClause()}
      ${baseWhereClause()} AND sp.projectID = ?
      GROUP BY sp.id, sp.savedProjectID, p.id, p.title, p.pDesc, p.budget, p.deadline, p.pStatus, u.fullName, c.cName, sp.folder, sp.priority, sp.notes, sp.savedAt
      LIMIT 1
    `,
    [userID, projectID],
  );
  return rows[0] ?? null;
}

export async function deleteSavedProject(userID, projectID) {
  const [result] = await db.execute(
    `DELETE FROM SavedProjects
     WHERE freelancerID = ? AND projectID = ?`,
    [userID, projectID],
  );
  return result.affectedRows;
}

export async function listSavedProjects(userID, options = {}) {
  const page = Number(options.page) || 1;
  const limit = Math.min(Math.max(Number(options.limit) || 20, 1), 100);
  const offset = (page - 1) * limit;
  const sortSql = resolveSort(options.sort);

  const [rows] = await db.execute(
    `
      ${baseSelectClause()}
      ${baseFromClause()}
      ${baseWhereClause()}
      GROUP BY sp.id, sp.savedProjectID, p.id, p.title, p.pDesc, p.budget, p.deadline, p.pStatus, u.fullName, c.cName, sp.folder, sp.priority, sp.notes, sp.savedAt
      ORDER BY ${sortSql}
      LIMIT ${limit} OFFSET ${offset}
    `,
    [userID],
  );

  const [countRows] = await db.execute(
    `SELECT COUNT(*) AS total FROM SavedProjects WHERE freelancerID = ?`,
    [userID],
  );

  return {
    projects: rows,
    page,
    limit,
    total: Number(countRows[0]?.total || 0),
    totalPages: Math.ceil(Number(countRows[0]?.total || 0) / limit),
  };
}

export async function listSavedFolders(userID) {
  const [rows] = await db.execute(
    `
      SELECT folder, COUNT(*) AS count
      FROM SavedProjects
      WHERE freelancerID = ?
      GROUP BY folder
      ORDER BY folder ASC
    `,
    [userID],
  );
  return rows;
}

export async function updateSavedProject(userID, projectID, updates) {
  const existing = await findSavedProject(userID, projectID);
  if (!existing) {
    return null;
  }

  const next = {
    folder: updates.folder ?? existing.folder ?? "default",
    priority: updates.priority ?? existing.priority ?? "medium",
    notes: updates.notes ?? existing.notes ?? "",
  };

  await db.execute(
    `UPDATE SavedProjects
     SET folder = ?, priority = ?, notes = ?
     WHERE freelancerID = ? AND projectID = ?`,
    [next.folder, next.priority, next.notes, userID, projectID],
  );

  return findSavedProject(userID, projectID);
}

export async function bulkDeleteSavedProjects(userID, projectIDs) {
  if (!projectIDs.length) {
    return 0;
  }

  const placeholders = projectIDs.map(() => "?").join(",");
  const [result] = await db.execute(
    `DELETE FROM SavedProjects
     WHERE freelancerID = ?
       AND projectID IN (${placeholders})`,
    [userID, ...projectIDs],
  );
  return result.affectedRows;
}

export async function isSaved(userID, projectID) {
  const [rows] = await db.execute(
    `SELECT 1 FROM SavedProjects WHERE freelancerID = ? AND projectID = ? LIMIT 1`,
    [userID, projectID],
  );
  return rows.length > 0;
}

export async function getSavedCount(userID) {
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS total FROM SavedProjects WHERE freelancerID = ?`,
    [userID],
  );
  return Number(rows[0]?.total || 0);
}

export async function getSaveTimestamp(userID, projectID) {
  const [rows] = await db.execute(
    `SELECT savedAt
     FROM SavedProjects
     WHERE freelancerID = ? AND projectID = ?
     LIMIT 1`,
    [userID, projectID],
  );
  return rows[0]?.savedAt ?? null;
}

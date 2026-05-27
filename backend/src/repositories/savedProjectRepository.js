import { randomUUID } from "crypto";
import { db } from "../config/db.js";

function buildSavedProjectConditions(options = {}) {
  const conditions = ["sp.freelancerID = ?"];
  const params = [];

  if (options.categoryID != null) {
    conditions.push("p.categoryID = ?");
    params.push(options.categoryID);
  }

  if (options.minBudget != null) {
    conditions.push("p.budget >= ?");
    params.push(options.minBudget);
  }

  if (options.maxBudget != null) {
    conditions.push("p.budget <= ?");
    params.push(options.maxBudget);
  }

  if (options.from) {
    conditions.push("p.deadline >= ?");
    params.push(options.from);
  }

  if (options.to) {
    conditions.push("p.deadline <= ?");
    params.push(options.to);
  }

  if (options.q) {
    const queryValue = `%${options.q}%`;
    conditions.push(
      `(p.title LIKE ? OR p.pDesc LIKE ? OR c.cName LIKE ? OR u.fullName LIKE ? OR sp.notes LIKE ?)`,
    );
    params.push(queryValue, queryValue, queryValue, queryValue, queryValue);
  }

  return {
    where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

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

export async function createSavedProject(userID, projectID) {
  const savedProjectID = randomUUID();
  await db.execute(
    `INSERT INTO SavedProjects (savedProjectID, freelancerID, projectID, folder, priority) VALUES (?, ?, ?, 'default', 'medium')`,
    [savedProjectID, userID, projectID],
  );

  const [rows] = await db.execute(
    `SELECT sp.savedProjectID, sp.projectID, sp.notes, sp.folder, sp.priority, sp.savedAt,
            p.title, p.pDesc, p.budget, p.deadline, p.categoryID,
            c.cName AS categoryName, u.fullName AS clientName,
            (SELECT COUNT(*) FROM SavedProjects sp2 WHERE sp2.projectID = p.id) AS saveCount
     FROM SavedProjects sp
     INNER JOIN Project p ON p.id = sp.projectID
     INNER JOIN Users u ON u.id = p.clientID
     LEFT JOIN Categories c ON c.id = p.categoryID
     WHERE sp.savedProjectID = ?
     LIMIT 1`,
    [savedProjectID],
  );

  return rows[0] ?? null;
}

export async function findSavedProject(userID, projectID) {
  const [rows] = await db.execute(
    `SELECT * FROM SavedProjects WHERE freelancerID = ? AND projectID = ? LIMIT 1`,
    [userID, projectID],
  );
  return rows[0] ?? null;
}

export async function deleteSavedProject(userID, projectID) {
  const [result] = await db.execute(
    `DELETE FROM SavedProjects WHERE freelancerID = ? AND projectID = ?`,
    [userID, projectID],
  );
  return result.affectedRows;
}

export async function listSavedProjects(userID, options = {}) {
  const page = Number(options.page) || 1;
  const limit = Math.min(Math.max(Number(options.limit) || 20, 1), 100);
  const offset = (page - 1) * limit;
  const sort = resolveSort(options.sort);
  const { where, params } = buildSavedProjectConditions(options);

  params.unshift(userID);

  const [countRows] = await db.execute(
    `SELECT COUNT(*) AS total
     FROM SavedProjects sp
     INNER JOIN Project p ON p.id = sp.projectID
     INNER JOIN Users u ON u.id = p.clientID
     LEFT JOIN Categories c ON c.id = p.categoryID
     ${where}`,
    params,
  );

  const [rows] = await db.execute(
    `SELECT
        sp.savedProjectID,
        sp.projectID,
        sp.notes,
        sp.folder,
        sp.priority,
        sp.savedAt,
        p.title,
        p.pDesc,
        p.budget,
        p.deadline,
        p.categoryID,
        c.cName AS categoryName,
        u.fullName AS clientName,
        (SELECT COUNT(*) FROM SavedProjects sp2 WHERE sp2.projectID = p.id) AS saveCount
     FROM SavedProjects sp
     INNER JOIN Project p ON p.id = sp.projectID
     INNER JOIN Users u ON u.id = p.clientID
     LEFT JOIN Categories c ON c.id = p.categoryID
     ${where}
     ORDER BY ${sort}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return {
    projects: rows,
    page,
    limit,
    total: Number(countRows[0]?.total ?? 0),
    totalPages: Math.ceil(Number(countRows[0]?.total ?? 0) / limit),
  };
}

export async function listSavedFolders(userID) {
  const [rows] = await db.execute(
    `SELECT folder, COUNT(*) AS count
     FROM SavedProjects
     WHERE freelancerID = ?
     GROUP BY folder
     ORDER BY folder ASC`,
    [userID],
  );
  return rows;
}

export async function updateSavedProject(userID, projectID, updates) {
  const sets = [];
  const params = [];

  if (updates.notes !== undefined) {
    sets.push("notes = ?");
    params.push(updates.notes);
  }
  if (updates.priority !== undefined) {
    sets.push("priority = ?");
    params.push(updates.priority);
  }
  if (updates.folder !== undefined) {
    sets.push("folder = ?");
    params.push(updates.folder);
  }

  if (!sets.length) {
    return findSavedProject(userID, projectID);
  }

  params.push(userID, projectID);
  await db.execute(
    `UPDATE SavedProjects SET ${sets.join(", ")} WHERE freelancerID = ? AND projectID = ?`,
    params,
  );

  return findSavedProject(userID, projectID);
}

export async function bulkDeleteSavedProjects(userID, projectIDs) {
  if (!projectIDs.length) {
    return 0;
  }

  const placeholders = projectIDs.map(() => "?").join(",");
  const [result] = await db.execute(
    `DELETE FROM SavedProjects WHERE freelancerID = ? AND projectID IN (${placeholders})`,
    [userID, ...projectIDs],
  );
  return result.affectedRows;
}

export async function isSaved(userID, projectID) {
  return Boolean(await findSavedProject(userID, projectID));
}

export async function getSavedCount(userID) {
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS count FROM SavedProjects WHERE freelancerID = ?`,
    [userID],
  );
  return Number(rows[0]?.count ?? 0);
}

export async function getSaveTimestamp(userID, projectID) {
  const [rows] = await db.execute(
    `SELECT savedAt FROM SavedProjects WHERE freelancerID = ? AND projectID = ? LIMIT 1`,
    [userID, projectID],
  );
  return rows[0]?.savedAt ?? null;
}

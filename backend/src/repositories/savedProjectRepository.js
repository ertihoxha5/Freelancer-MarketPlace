import { db } from "../config/db.js";

export async function saveProject(freelancerID, projectID) {
  await db.execute(
    `INSERT IGNORE INTO SavedProjects (freelancerID, projectID) VALUES (?, ?)`,
    [freelancerID, projectID]
  );
}

export async function removeSavedProject(freelancerID, projectID) {
  await db.execute(
    `DELETE FROM SavedProjects WHERE freelancerID = ? AND projectID = ?`,
    [freelancerID, projectID]
  );
}

export async function getSavedProjects(freelancerID) {
  const [rows] = await db.execute(`
    SELECT 
      p.id,
      p.title,
      p.pDesc,
      p.budget,
      p.deadline,
      u.fullName AS clientName
    FROM SavedProjects sp
    INNER JOIN Project p ON p.id = sp.projectID
    INNER JOIN Users u ON u.id = p.clientID
    WHERE sp.freelancerID = ?
    ORDER BY p.createdAt DESC
  `, [freelancerID]);

  return rows;
}
import { db } from "../config/db.js";


export async function getProjectsWithFreelancer() {
  const [rows] = await db.execute(`
        SELECT
            p.id,
            p.title,
            p.pDesc,
            p.budget,
            p.pStatus,
            p.deadline,
            uc.id        AS clientID,
            uc.fullName  AS clientName,
            uc.email     AS clientEmail,
            uf.id        AS freelancerID,
            uf.fullName  AS freelancerName,
            uf.email     AS freelancerEmail,
            pr.id        AS proposalID,
            pr.propStatus
        FROM Project p
        INNER JOIN Users       uc ON uc.id = p.clientID
        INNER JOIN Proposal    pr ON pr.projectID = p.id AND pr.propStatus = 'accepted'
        INNER JOIN Users       uf ON uf.id = pr.userID
        ORDER BY p.id ASC
    `);
  return rows;
}


export async function getProjectsWithoutFreelancer() {
  const [rows] = await db.execute(`
        SELECT
            p.id,
            p.title,
            p.pDesc,
            p.budget,
            p.pStatus,
            p.deadline,
            uc.id       AS clientID,
            uc.fullName AS clientName,
            uc.email    AS clientEmail,
            COUNT(pr.id) AS proposalCount
        FROM Project p
        INNER JOIN Users   uc ON uc.id = p.clientID
        LEFT  JOIN Proposal pr ON pr.projectID = p.id
        WHERE p.id NOT IN (
            SELECT projectID FROM Proposal WHERE propStatus = 'accepted'
        )
        GROUP BY p.id, p.title, p.pDesc, p.budget, p.pStatus, p.deadline,
                 uc.id, uc.fullName, uc.email
        ORDER BY p.id ASC
    `);
  return rows;
}


export async function getProjectById(id) {
  const [rows] = await db.execute(
    `
        SELECT p.*, uc.fullName AS clientName, uc.email AS clientEmail
        FROM Project p
        INNER JOIN Users uc ON uc.id = p.clientID
        WHERE p.id = ?
        LIMIT 1
    `,
    [id],
  );
  return rows[0] ?? null;
}


export async function createProject({
  title,
  pDesc,
  budget,
  deadline,
  clientID,
  pStatus,
}) {
  const [result] = await db.execute(
    `INSERT INTO Project (title, pDesc, budget, deadline, clientID, pStatus)
         VALUES (?, ?, ?, ?, ?, ?)`,
    [
      title,
      pDesc || null,
      budget ?? null,
      deadline || null,
      clientID,
      pStatus || "pending",
    ],
  );
  return {
    id: result.insertId,
    title,
    pDesc,
    budget,
    deadline,
    clientID,
    pStatus: pStatus || "pending",
  };
}


export async function updateProject(
  id,
  { title, pDesc, budget, deadline, pStatus },
) {
  const [result] = await db.execute(
    `UPDATE Project
         SET title = ?, pDesc = ?, budget = ?, deadline = ?, pStatus = ?
         WHERE id = ?`,
    [title, pDesc || null, budget ?? null, deadline || null, pStatus, id],
  );

  if (result.affectedRows === 0) {
    const err = new Error("Project not found.");
    err.statusCode = 404;
    throw err;
  }

  return { id, title, pDesc, budget, deadline, pStatus };
}


export async function deleteProject(id) {
  const [result] = await db.execute("DELETE FROM Project WHERE id = ?", [id]);

  if (result.affectedRows === 0) {
    const err = new Error("Project not found.");
    err.statusCode = 404;
    throw err;
  }

  return { id };
}


export async function getClientList() {
  const [rows] = await db.execute(`
        SELECT u.id, u.fullName, u.email
        FROM Users u
        INNER JOIN UserRole ur ON ur.userID = u.id
        INNER JOIN Roles    r  ON r.id = ur.roleID
        WHERE r.roleName = 'Client' AND u.isActive = 1
        ORDER BY u.fullName ASC
    `);
  return rows;
}


export async function getClientProjects(clientID) {
  const [rows] = await db.execute(`
        SELECT
            p.id,
            p.title,
            p.pDesc,
            p.budget,
            p.pStatus,
            p.deadline,
            COUNT(pr.id) AS proposalCount,
            COUNT(CASE WHEN pr.propStatus = 'accepted' THEN 1 END) AS acceptedProposalCount
        FROM Project p
        LEFT JOIN Proposal pr ON pr.projectID = p.id
        WHERE p.clientID = ?
        GROUP BY p.id, p.title, p.pDesc, p.budget, p.pStatus, p.deadline
        ORDER BY p.id DESC
    `, [clientID]);
  return rows;
}


export async function getClientProjectById(projectID, clientID) {
  const [rows] = await db.execute(`
        SELECT
            p.id,
            p.title,
            p.pDesc,
            p.budget,
            p.pStatus,
            p.deadline,
            p.clientID,
            COUNT(pr.id) AS proposalCount
        FROM Project p
        LEFT JOIN Proposal pr ON pr.projectID = p.id
        WHERE p.id = ? AND p.clientID = ?
        GROUP BY p.id, p.title, p.pDesc, p.budget, p.pStatus, p.deadline, p.clientID
        LIMIT 1
    `, [projectID, clientID]);
  return rows[0] ?? null;
}


export async function createClientProject({
  title,
  pDesc,
  budget,
  deadline,
  clientID,
}) {
  const [result] = await db.execute(
    `INSERT INTO Project (title, pDesc, budget, deadline, clientID, pStatus)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
    [
      title,
      pDesc || null,
      budget ?? null,
      deadline || null,
      clientID,
    ],
  );
  return {
    id: result.insertId,
    title,
    pDesc,
    budget,
    deadline,
    clientID,
    pStatus: 'pending',
  };
}


export async function updateClientProject(
  projectID,
  clientID,
  { title, pDesc, budget, deadline, pStatus },
) {
  const [result] = await db.execute(
    `UPDATE Project
         SET title = ?, pDesc = ?, budget = ?, deadline = ?, pStatus = ?
         WHERE id = ? AND clientID = ?`,
    [title, pDesc || null, budget ?? null, deadline || null, pStatus, projectID, clientID],
  );

  if (result.affectedRows === 0) {
    const err = new Error("Project not found or you don't have permission.");
    err.statusCode = 404;
    throw err;
  }

  return { id: projectID, title, pDesc, budget, deadline, pStatus };
}


export async function deleteClientProject(projectID, clientID) {
  const [result] = await db.execute(
    "DELETE FROM Project WHERE id = ? AND clientID = ?",
    [projectID, clientID],
  );

  if (result.affectedRows === 0) {
    const err = new Error("Project not found or you don't have permission.");
    err.statusCode = 404;
    throw err;
  }

  return { id: projectID };
}

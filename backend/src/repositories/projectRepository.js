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

export async function getClientApplications(clientID) {
  const [rows] = await db.execute(
    `SELECT
            pr.id AS applicationId,
            pr.projectID AS projectId,
            pr.userID AS freelancerID,
            pr.coverLetter,
            pr.bidAmount,
            pr.estimatedDays,
            pr.propStatus,
            pr.createdAt,
            pr.updatedAt,
            p.title AS projectTitle,
            p.budget AS projectBudget,
            p.pStatus AS projectStatus,
            p.deadline AS projectDeadline,
            u.fullName AS freelancerName,
            u.email AS freelancerEmail
         FROM Proposal pr
         INNER JOIN Project p ON p.id = pr.projectID
         INNER JOIN Users u ON u.id = pr.userID
         WHERE p.clientID = ? AND pr.isDeleted = FALSE
         ORDER BY pr.createdAt DESC`,
    [clientID],
  );
  return rows;
}

export async function getClientApplicationById(applicationID, clientID) {
  const [rows] = await db.execute(
    `SELECT
            pr.id AS applicationId,
            pr.projectID AS projectId,
            pr.userID AS freelancerID,
            pr.coverLetter,
            pr.bidAmount,
            pr.estimatedDays,
            pr.propStatus,
            pr.isDeleted,
            p.clientID
         FROM Proposal pr
         INNER JOIN Project p ON p.id = pr.projectID
         WHERE pr.id = ? AND p.clientID = ? AND pr.isDeleted = FALSE
         LIMIT 1`,
    [applicationID, clientID],
  );
  return rows[0] ?? null;
}

export async function updateClientApplicationStatus(
  applicationID,
  clientID,
  propStatus,
) {
  const [result] = await db.execute(
    `UPDATE Proposal pr
         INNER JOIN Project p ON p.id = pr.projectID
         SET pr.propStatus = ?
         WHERE pr.id = ? AND p.clientID = ? AND pr.isDeleted = FALSE`,
    [propStatus, applicationID, clientID],
  );

  return result.affectedRows;
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

export async function getBrowseProjectsForFreelancer(filters = {}, freelancerID) {
  const { sort, categoryID, skillIds } = filters;

  let query = `
    SELECT 
      p.id,
      p.title,
      p.pDesc,
      p.budget,
      p.deadline,
      p.pStatus,
      u.fullName AS clientName,
      CASE WHEN sp.projectID IS NOT NULL THEN 1 ELSE 0 END AS isSaved
    FROM Project p
    INNER JOIN Users u ON u.id = p.clientID
    LEFT JOIN ProjectSkills ps ON ps.projectID = p.id
    LEFT JOIN Skills s ON s.id = ps.skillID
    LEFT JOIN SavedProjects sp 
      ON sp.projectID = p.id AND sp.freelancerID = ?
    WHERE p.pStatus IN ('pending', 'active')
  `;

  const params = [freelancerID];

  if (categoryID) {
    query += ` AND s.categoryID = ?`;
    params.push(Number(categoryID));
  }

  if (skillIds) {
    const ids = skillIds.split(",").map((id) => Number(id.trim()));
    query += ` AND s.id IN (${ids.map(() => "?").join(",")})`;
    params.push(...ids);
  }

  query += ` GROUP BY p.id`;

  if (sort === "budget_desc") {
    query += ` ORDER BY p.budget DESC`;
  } else if (sort === "budget_asc") {
    query += ` ORDER BY p.budget ASC`;
  } else {
    query += ` ORDER BY p.createdAt DESC`;
  }

  query += ` LIMIT 10`;

  const [rows] = await db.execute(query, params);
  return rows;
}

export async function getFreelancerProjectDetails(projectID, freelancerID) {
    const [rows] = await db.execute(
        `SELECT
            p.id,
            p.title,
            p.pDesc,
            p.budget,
            p.deadline,
            p.pStatus,
            p.createdAt,
            p.updatedAt,
            p.clientID,
            u.fullName AS clientName,
            u.email AS clientEmail,
            COUNT(DISTINCT allPr.id) AS proposalCount,
            MAX(CASE WHEN myPr.id IS NOT NULL THEN 1 ELSE 0 END) AS hasApplied
        FROM Project p
        INNER JOIN Users u ON u.id = p.clientID
        LEFT JOIN Proposal allPr ON allPr.projectID = p.id
        LEFT JOIN Proposal myPr ON myPr.projectID = p.id AND myPr.userID = ? AND myPr.isDeleted = FALSE
        WHERE p.id = ?
          AND (p.pStatus IN ('pending', 'active') OR myPr.id IS NOT NULL)
        GROUP BY p.id, p.title, p.pDesc, p.budget, p.deadline, p.pStatus,
                 p.createdAt, p.updatedAt, p.clientID, u.fullName, u.email
        LIMIT 1`,
        [freelancerID, projectID],
    );

    return rows[0] ?? null;
}

export async function createApplication(freelancerID, projectID, coverLetter, bidAmount, estimatedDays) {
    const [result] = await db.execute(
        `INSERT INTO Proposal (projectID, userID, coverLetter, bidAmount, estimatedDays, propStatus)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [projectID, freelancerID, coverLetter, bidAmount || null, estimatedDays || null]
    );
    return { id: result.insertId };
}

export async function getApplicationByIdForFreelancer(applicationID, freelancerID) {
  const [rows] = await db.execute(
    `SELECT id, projectID, userID, coverLetter, bidAmount, estimatedDays, propStatus, isDeleted, createdAt, updatedAt
     FROM Proposal
     WHERE id = ? AND userID = ? AND isDeleted = FALSE
     LIMIT 1`,
    [applicationID, freelancerID],
  );
  return rows[0] ?? null;
}

export async function updateApplicationForFreelancer(
  applicationID,
  freelancerID,
  { coverLetter, bidAmount, estimatedDays },
) {
  const [result] = await db.execute(
    `UPDATE Proposal
     SET coverLetter = ?, bidAmount = ?, estimatedDays = ?
     WHERE id = ? AND userID = ? AND propStatus = 'pending' AND isDeleted = FALSE`,
    [coverLetter, bidAmount ?? null, estimatedDays ?? null, applicationID, freelancerID],
  );

  return result.affectedRows;
}

export async function softDeleteApplicationForFreelancer(applicationID, freelancerID) {
  const [result] = await db.execute(
    `UPDATE Proposal
     SET isDeleted = TRUE
     WHERE id = ? AND userID = ?`,
    [applicationID, freelancerID],
  );

  return result.affectedRows;
}

export async function getMyApplications(freelancerID) {
    const [rows] = await db.execute(`
        SELECT 
            p.id AS projectId,
            p.title,
      p.pDesc,
            p.budget,
      p.deadline,
      p.pStatus AS projectStatus,
      u.fullName AS clientName,
            pr.id AS applicationId,
          pr.isDeleted,
            pr.coverLetter,
            pr.bidAmount,
            pr.estimatedDays,
            pr.propStatus,
            pr.createdAt
        FROM Proposal pr
        INNER JOIN Project p ON p.id = pr.projectID
    INNER JOIN Users u ON u.id = p.clientID
        WHERE pr.userID = ? AND pr.isDeleted = FALSE
        ORDER BY pr.createdAt DESC
    `, [freelancerID]);
    return rows;
}
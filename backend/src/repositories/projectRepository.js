import { db } from "../config/db.js";
import { validationError } from "../utils/errors.js";


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
  maxFreelancers,
  pStatus,
}) {
  const [result] = await db.execute(
    `INSERT INTO Project (title, pDesc, budget, deadline, clientID, maxFreelancers, pStatus)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      title,
      pDesc || null,
      budget ?? null,
      deadline || null,
      clientID,
      maxFreelancers ?? 1,
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
    maxFreelancers: maxFreelancers ?? 1,
    pStatus: pStatus || "pending",
  };
}


export async function updateProject(
  id,
  { title, pDesc, budget, deadline, maxFreelancers, pStatus },
) {
  const [result] = await db.execute(
    `UPDATE Project
         SET title = ?, pDesc = ?, budget = ?, deadline = ?, maxFreelancers = ?, pStatus = ?
         WHERE id = ?`,
    [
      title,
      pDesc || null,
      budget ?? null,
      deadline || null,
      maxFreelancers ?? 1,
      pStatus,
      id,
    ],
  );

  if (result.affectedRows === 0) {
    const err = new Error("Project not found.");
    err.statusCode = 404;
    throw err;
  }

  return { id, title, pDesc, budget, deadline, maxFreelancers, pStatus };
}

export async function updateProjectStatus(projectID, pStatus) {
  const [result] = await db.execute(
    `UPDATE Project SET pStatus = ? WHERE id = ?`,
    [pStatus, projectID],
  );
  return result.affectedRows > 0;
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


function safeParsePhases(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
            p.phases,
            p.experienceLevel,
            p.skills,
            p.projectType,
            COUNT(pr.id) AS proposalCount,
            COUNT(CASE WHEN pr.propStatus = 'accepted' THEN 1 END) AS acceptedProposalCount
        FROM Project p
        LEFT JOIN Proposal pr ON pr.projectID = p.id
        WHERE p.clientID = ?
        GROUP BY p.id, p.title, p.pDesc, p.budget, p.pStatus, p.deadline, p.phases, p.experienceLevel, p.skills, p.projectType
        ORDER BY p.id DESC
    `, [clientID]);
  return rows.map((r) => ({
    ...r,
    phases: safeParsePhases(r.phases),
  }));
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
            p.phases,
            p.experienceLevel,
            p.skills,
            p.projectType,
            COUNT(pr.id) AS proposalCount
        FROM Project p
        LEFT JOIN Proposal pr ON pr.projectID = p.id
        WHERE p.id = ? AND p.clientID = ?
        GROUP BY p.id, p.title, p.pDesc, p.budget, p.pStatus, p.deadline, p.clientID, p.phases, p.experienceLevel, p.skills, p.projectType
        LIMIT 1
    `, [projectID, clientID]);
  const row = rows[0] ?? null;
  if (!row) return null;
  return {
    ...row,
    phases: safeParsePhases(row.phases),
  };
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
            p.maxFreelancers,
            (SELECT COUNT(*) FROM Proposal pr2 WHERE pr2.projectID = p.id AND pr2.propStatus = 'accepted' AND pr2.isDeleted = FALSE) AS acceptedCount,
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
            p.clientID,
            p.title AS projectTitle,
            p.pStatus AS projectStatus,
            p.maxFreelancers
         FROM Proposal pr
         INNER JOIN Project p ON p.id = pr.projectID
         WHERE pr.id = ? AND p.clientID = ? AND pr.isDeleted = FALSE
         LIMIT 1`,
    [applicationID, clientID],
  );
  return rows[0] ?? null;
}

export async function getAcceptedProposalCount(projectID) {
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS acceptedCount
     FROM Proposal
     WHERE projectID = ? AND propStatus = 'accepted' AND isDeleted = FALSE`,
    [projectID],
  );
  return rows[0]?.acceptedCount || 0;
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

export async function rejectOtherProposals(projectID, acceptedProposalID) {
  const [rows] = await db.execute(
    `SELECT
        id AS applicationID,
        userID AS freelancerID,
        bidAmount,
        estimatedDays
     FROM Proposal
     WHERE projectID = ?
       AND id != ?
       AND propStatus = 'pending'
       AND isDeleted = FALSE`,
    [projectID, acceptedProposalID],
  );

  await db.execute(
    `UPDATE Proposal
     SET propStatus = 'rejected'
     WHERE projectID = ?
       AND id != ?
       AND propStatus = 'pending'
       AND isDeleted = FALSE`,
    [projectID, acceptedProposalID],
  );

  return rows;
}

export async function acceptProposalAndCreateContract({
  applicationID,
  clientID,
  projectID,
  freelancerID,
  totalAmount,
}) {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [acceptedResult] = await conn.execute(
      `UPDATE Proposal pr
       INNER JOIN Project p ON p.id = pr.projectID
       SET pr.propStatus = 'accepted',
           pr.reviewedAt = NOW(),
           pr.reviewedBy = ?
       WHERE pr.id = ?
         AND p.clientID = ?
         AND p.id = ?
         AND pr.isDeleted = FALSE
         AND pr.propStatus <> 'accepted'
         AND p.pStatus IN ('pending', 'active')`,
      [clientID, applicationID, clientID, projectID],
    );

    if (acceptedResult.affectedRows === 0) {
      const err = new Error("Unable to accept proposal. It may no longer be pending or the project limits have been reached.");
      err.statusCode = 409;
      throw err;
    }

    // Fetch maxFreelancers for this project
    const [projRows] = await conn.execute(
      `SELECT maxFreelancers FROM Project WHERE id = ?`,
      [projectID]
    );
    const maxFreelancers = projRows[0]?.maxFreelancers || 1;

    // Count how many are accepted now (after this one)
    const [countRows] = await conn.execute(
      `SELECT COUNT(*) AS cnt FROM Proposal WHERE projectID = ? AND propStatus = 'accepted' AND isDeleted = FALSE`,
      [projectID]
    );
    const acceptedNow = countRows[0].cnt;

    let rejectedApplications = [];
    if (acceptedNow >= maxFreelancers) {
      // Only reject remaining pending when the limit is reached
      const [rejRows] = await conn.execute(
        `SELECT
            id AS applicationID,
            userID AS freelancerID,
            bidAmount,
            estimatedDays
         FROM Proposal
         WHERE projectID = ?
           AND id != ?
           AND propStatus = 'pending'
           AND isDeleted = FALSE`,
        [projectID, applicationID],
      );
      rejectedApplications = rejRows;

      await conn.execute(
        `UPDATE Proposal
         SET propStatus = 'rejected',
             reviewedAt = NOW(),
             reviewedBy = ?
         WHERE projectID = ?
           AND id != ?
           AND propStatus = 'pending'
           AND isDeleted = FALSE`,
        [clientID, projectID, applicationID],
      );
    }

    const [contractResult] = await conn.execute(
      `INSERT INTO Contracts
         (proposalID, clientID, freelancerID, totalAmount, cStatus, startDate)
       VALUES (?, ?, ?, ?, 'active', CURDATE())`,
      [applicationID, clientID, freelancerID, totalAmount ?? 0],
    );

    const [contractRows] = await conn.execute(
      `${contractSelectSql("WHERE c.id = ?")} LIMIT 1`,
      [contractResult.insertId],
    );

    await conn.commit();

    return {
      rejectedApplications,
      contract: contractRows[0] ?? {
        id: contractResult.insertId,
        proposalID: applicationID,
        clientID,
        freelancerID,
        totalAmount,
        cStatus: "active",
      },
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function createContract({
  proposalID,
  clientID,
  freelancerID,
  totalAmount,
}) {
  const [result] = await db.execute(
    `INSERT INTO Contracts
       (proposalID, clientID, freelancerID, totalAmount, cStatus, startDate)
     VALUES (?, ?, ?, ?, 'active', CURDATE())`,
    [proposalID, clientID, freelancerID, totalAmount ?? 0],
  );

  const contract = await getContractByProposalId(proposalID);
  return contract ?? {
    id: result.insertId,
    proposalID,
    clientID,
    freelancerID,
    totalAmount,
    cStatus: "active",
  };
}

export async function getContractByProposalId(proposalID) {
  const [rows] = await db.execute(
    `SELECT
        c.*,
        p.id AS projectID,
        p.title AS projectTitle,
        p.pStatus AS projectStatus,
        uc.fullName AS clientName,
        uf.fullName AS freelancerName
     FROM Contracts c
     INNER JOIN Proposal pr ON pr.id = c.proposalID
     INNER JOIN Project p ON p.id = pr.projectID
     INNER JOIN Users uc ON uc.id = c.clientID
     INNER JOIN Users uf ON uf.id = c.freelancerID
     WHERE c.proposalID = ?
     LIMIT 1`,
    [proposalID],
  );
  return rows[0] ?? null;
}

function contractSelectSql(whereClause) {
  return `
    SELECT
      c.id,
      c.proposalID,
      c.clientID,
      c.freelancerID,
      c.totalAmount,
      c.cStatus,
      c.startDate,
      c.endDate,
      c.clientSignedAt,
      c.freelancerSignedAt,
      p.id AS projectID,
      p.title AS projectTitle,
      p.pDesc AS projectDescription,
      p.pStatus AS projectStatus,
      p.deadline AS projectDeadline,
      uc.fullName AS clientName,
      uc.email AS clientEmail,
      uf.fullName AS freelancerName,
      uf.email AS freelancerEmail
    FROM Contracts c
    INNER JOIN Proposal pr ON pr.id = c.proposalID
    INNER JOIN Project p ON p.id = pr.projectID
    INNER JOIN Users uc ON uc.id = c.clientID
    INNER JOIN Users uf ON uf.id = c.freelancerID
    ${whereClause}
  `;
}

export async function getContractsByFreelancerId(freelancerID) {
  const [rows] = await db.execute(
    `${contractSelectSql("WHERE c.freelancerID = ?")} ORDER BY c.id DESC`,
    [freelancerID],
  );
  return rows;
}

export async function getContractsByClientId(clientID) {
  const [rows] = await db.execute(
    `${contractSelectSql("WHERE c.clientID = ?")} ORDER BY c.id DESC`,
    [clientID],
  );
  return rows;
}

export async function getContractById(contractID) {
  const [rows] = await db.execute(
    `${contractSelectSql("WHERE c.id = ?")} LIMIT 1`,
    [contractID],
  );
  return rows[0] ?? null;
}

export async function getAllContractsForAdmin(params = {}) {
  const { page = 1, limit = 20, status, search } = params;

  let where = '1=1';
  const queryParams = [];

  if (status) {
    where += ' AND c.cStatus = ?';
    queryParams.push(status);
  }

  if (search) {
    where += ' AND (p.title LIKE ? OR uc.fullName LIKE ? OR uf.fullName LIKE ?)';
    const like = `%${search}%`;
    queryParams.push(like, like, like);
  }

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeOffset = (safePage - 1) * safeLimit;

  // Use template literals for LIMIT/OFFSET to avoid mysql2 ER_WRONG_ARGUMENTS
  const sql = `${contractSelectSql(`WHERE ${where}`)} ORDER BY c.id DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;
  const [rows] = await db.execute(sql, queryParams);

  const countSql = `
    SELECT COUNT(*) as total 
    FROM Contracts c 
    INNER JOIN Proposal pr ON pr.id = c.proposalID
    INNER JOIN Project p ON p.id = pr.projectID
    INNER JOIN Users uc ON uc.id = c.clientID
    INNER JOIN Users uf ON uf.id = c.freelancerID
    WHERE ${where}
  `;
  const [countRows] = await db.execute(countSql, queryParams);

  return {
    contracts: rows,
    total: countRows[0]?.total || 0,
    page: safePage,
    limit: safeLimit,
  };
}

export async function getContractByProjectId(projectID) {
  const [rows] = await db.execute(
    `${contractSelectSql("WHERE p.id = ?")} ORDER BY c.id DESC LIMIT 1`,
    [projectID],
  );
  return rows[0] ?? null;
}

export async function getFreelancerContractByProjectId(projectID, freelancerID) {
  const [rows] = await db.execute(
    `${contractSelectSql("WHERE p.id = ? AND c.freelancerID = ?")} ORDER BY c.id DESC LIMIT 1`,
    [projectID, freelancerID],
  );
  return rows[0] ?? null;
}

export async function updateContractStatus(contractID, cStatus) {
  const endDateSql = cStatus === "completed" || cStatus === "terminated"
    ? ", endDate = COALESCE(endDate, CURDATE())"
    : "";
  const [result] = await db.execute(
    `UPDATE Contracts SET cStatus = ?${endDateSql} WHERE id = ?`,
    [cStatus, contractID],
  );
  return result.affectedRows > 0;
}

export async function updateContractSignature(contractID, role, signedAt = new Date()) {
  const column = role === "client" ? "clientSignedAt" : "freelancerSignedAt";
  const [result] = await db.execute(
    `UPDATE Contracts
     SET ${column} = ?,
         cStatus = CASE
           WHEN cStatus IN ('draft', 'pending') THEN 'active'
           ELSE cStatus
         END
     WHERE id = ?`,
    [signedAt, contractID],
  );
  return result.affectedRows > 0;
}


export async function createClientProject({
  title,
  pDesc,
  budget,
  deadline,
  categoryID,
  clientID,
  maxFreelancers,
  phases = [],
  experienceLevel = null,
  skills = null,
  projectType = null,
}) {
  const phasesJson = Array.isArray(phases) && phases.length > 0 ? JSON.stringify(phases) : null;
  const [result] = await db.execute(
    `INSERT INTO Project (title, pDesc, budget, deadline, categoryID, clientID, maxFreelancers, pStatus, phases, experienceLevel, skills, projectType)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
    [
      title,
      pDesc || null,
      budget ?? null,
      deadline || null,
      categoryID ?? null,
      clientID,
      maxFreelancers ?? 1,
      phasesJson,
      experienceLevel || null,
      skills || null,
      projectType || null,
    ],
  );
  return {
    id: result.insertId,
    title,
    pDesc,
    budget,
    deadline,
    categoryID,
    clientID,
    maxFreelancers: maxFreelancers ?? 1,
    pStatus: 'pending',
    phases: Array.isArray(phases) ? phases : [],
    experienceLevel,
    skills,
    projectType,
  };
}


export async function updateClientProject(
  projectID,
  clientID,
  { title, pDesc, budget, deadline, categoryID, maxFreelancers, pStatus, phases, experienceLevel, skills, projectType },
) {
  const phasesJson = Array.isArray(phases) && phases.length > 0 ? JSON.stringify(phases) : null;

  // Build dynamic SET for optional phase fields
  const sets = [
    "title = ?",
    "pDesc = ?",
    "budget = ?",
    "deadline = ?",
    "categoryID = ?",
    "maxFreelancers = ?",
    "pStatus = ?",
  ];
  const values = [
    title,
    pDesc || null,
    budget ?? null,
    deadline || null,
    categoryID ?? null,
    maxFreelancers ?? 1,
    pStatus,
  ];

  if (phasesJson !== undefined) {
    sets.push("phases = ?");
    values.push(phasesJson);
  }
  if (experienceLevel !== undefined) {
    sets.push("experienceLevel = ?");
    values.push(experienceLevel || null);
  }
  if (skills !== undefined) {
    sets.push("skills = ?");
    values.push(skills || null);
  }
  if (projectType !== undefined) {
    sets.push("projectType = ?");
    values.push(projectType || null);
  }

  values.push(projectID, clientID);

  const [result] = await db.execute(
    `UPDATE Project SET ${sets.join(", ")} WHERE id = ? AND clientID = ?`,
    values,
  );

  if (result.affectedRows === 0) {
    const err = new Error("Project not found or you don't have permission.");
    err.statusCode = 404;
    throw err;
  }

  return { id: projectID, title, pDesc, budget, deadline, categoryID, maxFreelancers, pStatus, phases: Array.isArray(phases) ? phases : [], experienceLevel, skills, projectType };
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

export async function getBrowseProjectsForFreelancer(
  filters = {},
  freelancerID,
  paging = { page: 1, limit: 10 },
) {
  const { sort, categoryID, skillIds } = filters;
  const page = Number(paging.page) || 1;
  const limit = Number(paging.limit) || 10;

  if (!Number.isInteger(page) || page < 1) {
    throw validationError("Invalid page value.");
  }
  if (!Number.isInteger(limit) || limit < 1) {
    throw validationError("Invalid limit value.");
  }

  const safePage = Math.max(1, page);
  const safeLimit = Math.min(50, Math.max(1, limit));
  const offset = (safePage - 1) * safeLimit;

  const joins = `
    FROM Project p
    INNER JOIN Users u ON u.id = p.clientID
    LEFT JOIN ProjectSkills ps ON ps.projectID = p.id
    LEFT JOIN Skills s ON s.id = ps.skillID
    LEFT JOIN SavedProjects sp
      ON sp.projectID = p.id AND sp.freelancerID = ?
  `;
  let where = `
    WHERE p.pStatus IN ('pending', 'active')
  `;
  const params = [freelancerID];

  if (categoryID) {
    where += ` AND s.categoryID = ?`;
    params.push(Number(categoryID));
  }

  if (skillIds) {
    const ids = skillIds
      .split(",")
      .map((id) => Number(id.trim()))
      .filter((id) => Number.isInteger(id) && id > 0);
    if (ids.length > 0) {
      where += ` AND s.id IN (${ids.map(() => "?").join(",")})`;
      params.push(...ids);
    }
  }

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
    ${joins}
    ${where}
    GROUP BY p.id
  `;

  if (sort === "budget_desc") {
    query += ` ORDER BY p.budget DESC`;
  } else if (sort === "budget_asc") {
    query += ` ORDER BY p.budget ASC`;
  } else {
    query += ` ORDER BY p.createdAt DESC`;
  }

  query += ` LIMIT ${safeLimit} OFFSET ${offset}`;

  const [rows] = await db.execute(query, params);
  const [[countRow]] = await db.execute(
    `SELECT COUNT(DISTINCT p.id) AS totalItems ${joins} ${where}`,
    params,
  );

  return {
    data: rows,
    totalItems: Number(countRow?.totalItems ?? 0),
  };
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

export async function createApplication(
  freelancerID,
  projectID,
  coverLetter,
  bidAmount,
  estimatedDays,
  attachmentID = null,
) {
    const [result] = await db.execute(
        `INSERT INTO Proposal (projectID, userID, coverLetter, bidAmount, estimatedDays, attachmentID, propStatus)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [projectID, freelancerID, coverLetter, bidAmount || null, estimatedDays || null, attachmentID]
    );
    return { id: result.insertId };
}

export async function getExistingApplication(freelancerID, projectID) {
  const [rows] = await db.execute(
    `SELECT id
     FROM Proposal
     WHERE projectID = ?
       AND userID = ?
       AND isDeleted = FALSE
     LIMIT 1`,
    [projectID, freelancerID],
  );
  return rows[0] ?? null;
}

export async function getApplicationByIdForFreelancer(applicationID, freelancerID) {
  const [rows] = await db.execute(
    `SELECT id, projectID, userID, coverLetter, bidAmount, estimatedDays, attachmentID, propStatus, isDeleted, createdAt, updatedAt
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

/**
 * Admin: Get all proposals/applications across the platform
 */
export async function getAllProposals({ limit = 50, offset = 0, propStatus = null } = {}) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);

  const params = [];
  let where = '';
  if (propStatus) {
    where = 'WHERE pr.propStatus = ?';
    params.push(propStatus);
  }

  const [rows] = await db.execute(
    `SELECT 
        pr.id AS proposalId,
        pr.projectID,
        pr.userID AS freelancerID,
        pr.coverLetter,
        pr.bidAmount,
        pr.estimatedDays,
        pr.propStatus,
        pr.createdAt,
        pr.updatedAt,
        pr.isDeleted,
        p.title AS projectTitle,
        p.budget AS projectBudget,
        p.pStatus AS projectStatus,
        uf.fullName AS freelancerName,
        uf.email AS freelancerEmail,
        uc.fullName AS clientName,
        uc.email AS clientEmail
     FROM Proposal pr
     INNER JOIN Project p ON p.id = pr.projectID
     INNER JOIN Users uf ON uf.id = pr.userID
     INNER JOIN Users uc ON uc.id = p.clientID
     ${where}
     ORDER BY pr.createdAt DESC
     LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    params
  );
  return rows;
}

export async function countAllProposals({ propStatus = null } = {}) {
  const params = [];
  let where = '';
  if (propStatus) {
    where = 'WHERE propStatus = ?';
    params.push(propStatus);
  }

  const [rows] = await db.execute(
    `SELECT COUNT(*) AS total FROM Proposal ${where}`,
    params
  );
  return rows[0]?.total || 0;
}

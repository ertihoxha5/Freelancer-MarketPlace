import { db } from "../config/db.js";

export async function createMilestone({
  title,
  mDesc,
  amountPayable,
  dueDate,
  contractID,
  projectID = null,
  projectPhase = [],
  deadline = null,
  budget = null,
  status = "pending",
  completionDate = null,
  comments = null,
  attachments = [],
}) {
  const [result] = await db.execute(
    `INSERT INTO Milestones
       (title, mDesc, amountPayable, dueDate, contractID, projectID, projectPhase, deadline, budget, status, completionDate, comments, attachments, mStatus)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      title,
      mDesc,
      amountPayable,
      dueDate || null,
      contractID,
      projectID,
      JSON.stringify(projectPhase ?? []),
      deadline || null,
      budget ?? null,
      status,
      completionDate || null,
      comments,
      JSON.stringify(attachments ?? []),
    ],
  );

  return getMilestoneById(result.insertId);
}

export async function getMilestonesByContractId(contractID) {
  const [rows] = await db.execute(
    `SELECT *
     FROM Milestones
     WHERE contractID = ?
     ORDER BY dueDate IS NULL, dueDate ASC, id ASC`,
    [contractID],
  );
  return rows;
}

export async function getMilestoneById(id) {
  const [rows] = await db.execute(
    `SELECT *
     FROM Milestones
     WHERE id = ?
     LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function updateMilestoneStatus(id, mStatus) {
  const [result] = await db.execute(
    `UPDATE Milestones
     SET mStatus = ?
     WHERE id = ?`,
    [mStatus, id],
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return getMilestoneById(id);
}

export async function updateMilestoneProjectStatus(
  id,
  { status, completionDate = null, comments = null },
) {
  const [result] = await db.execute(
    `UPDATE Milestones
     SET status = ?,
         completionDate = ?,
         comments = COALESCE(?, comments)
     WHERE id = ?`,
    [status, completionDate, comments, id],
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return getMilestoneById(id);
}

export async function getMilestonesByProjectId(
  projectID,
  {
    status,
    from,
    to,
    sortBy = "deadline",
    sortOrder = "asc",
  } = {},
) {
  const conditions = ["m.projectID = ?"];
  const params = [projectID];

  if (status) {
    conditions.push("m.status = ?");
    params.push(status);
  }

  if (from) {
    conditions.push("m.deadline >= ?");
    params.push(from);
  }

  if (to) {
    conditions.push("m.deadline <= ?");
    params.push(to);
  }

  const orderColumn = sortBy === "createdAt" ? "m.createdAt" : "m.deadline";
  const orderDirection = sortOrder === "desc" ? "DESC" : "ASC";

  const [rows] = await db.execute(
    `SELECT m.*
     FROM Milestones m
     WHERE ${conditions.join(" AND ")}
     ORDER BY ${orderColumn} ${orderDirection}, m.id ASC`,
    params,
  );
  return rows;
}

export async function getFreelancerMilestones(
  freelancerID,
  {
    status,
    from,
    to,
    sortBy = "deadline",
    sortOrder = "asc",
  } = {},
) {
  const conditions = ["c.freelancerID = ?"];
  const params = [freelancerID];

  if (status) {
    conditions.push("m.status = ?");
    params.push(status);
  }
  if (from) {
    conditions.push("m.deadline >= ?");
    params.push(from);
  }
  if (to) {
    conditions.push("m.deadline <= ?");
    params.push(to);
  }

  const orderColumn = sortBy === "createdAt" ? "m.createdAt" : "m.deadline";
  const orderDirection = sortOrder === "desc" ? "DESC" : "ASC";

  const [rows] = await db.execute(
    `SELECT
       m.*,
       p.id AS projectID,
       p.title AS projectTitle,
       p.pStatus AS projectStatus
     FROM Milestones m
     INNER JOIN Contracts c ON c.id = m.contractID
     INNER JOIN Project p ON p.id = COALESCE(m.projectID, (
       SELECT pr.projectID
       FROM Proposal pr
       WHERE pr.id = c.proposalID
       LIMIT 1
     ))
     WHERE ${conditions.join(" AND ")}
     ORDER BY p.id ASC, ${orderColumn} ${orderDirection}, m.id ASC`,
    params,
  );
  return rows;
}

export async function getOverdueMilestonesByFreelancer(freelancerID) {
  const [rows] = await db.execute(
    `SELECT
       m.*,
       p.id AS projectID,
       p.title AS projectTitle
     FROM Milestones m
     INNER JOIN Contracts c ON c.id = m.contractID
     INNER JOIN Project p ON p.id = COALESCE(m.projectID, (
       SELECT pr.projectID
       FROM Proposal pr
       WHERE pr.id = c.proposalID
       LIMIT 1
     ))
     WHERE c.freelancerID = ?
       AND m.deadline IS NOT NULL
       AND m.deadline < UTC_TIMESTAMP()
       AND m.status <> 'completed'
     ORDER BY m.deadline ASC, m.id ASC`,
    [freelancerID],
  );
  return rows;
}

export async function deleteMilestone(id) {
  const [result] = await db.execute(
    `DELETE FROM Milestones
     WHERE id = ?`,
    [id],
  );
  return result.affectedRows > 0;
}

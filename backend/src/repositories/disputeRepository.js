import { db } from "../config/db.js";

export async function createDispute({
  contractID,
  reason,
  raisedBy,
  raisedAgainst,
}) {
  const [result] = await db.execute(
    `INSERT INTO Disputes (contractID, reason, raisedBy, raisedAgainst)
     VALUES (?, ?, ?, ?)`,
    [contractID, reason, raisedBy, raisedAgainst],
  );

  return getDisputeById(result.insertId);
}

export async function getDisputeById(id) {
  const [rows] = await db.execute(
    `SELECT
        d.id,
        d.contractID,
        d.reason,
        d.dStatus,
        d.resolution,
        d.createdAt,
        d.updatedAt,
        d.resolvedBy,
        d.raisedBy,
        d.raisedAgainst,
        rb.fullName AS raisedByName,
        ra.fullName AS raisedAgainstName
     FROM Disputes d
     INNER JOIN Users rb ON rb.id = d.raisedBy
     INNER JOIN Users ra ON ra.id = d.raisedAgainst
     WHERE d.id = ?
     LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function getDisputesByContractId(contractID) {
  const [rows] = await db.execute(
    `SELECT
        d.id,
        d.contractID,
        d.reason,
        d.dStatus,
        d.resolution,
        d.createdAt,
        d.updatedAt,
        d.resolvedBy,
        d.raisedBy,
        d.raisedAgainst,
        rb.fullName AS raisedByName,
        ra.fullName AS raisedAgainstName
     FROM Disputes d
     INNER JOIN Users rb ON rb.id = d.raisedBy
     INNER JOIN Users ra ON ra.id = d.raisedAgainst
     WHERE d.contractID = ?
     ORDER BY d.createdAt DESC, d.id DESC`,
    [contractID],
  );
  return rows;
}

export async function getAllDisputes({ status } = {}) {
  const params = [];
  const where = status ? "WHERE d.dStatus = ?" : "";
  if (status) params.push(status);

  const [rows] = await db.execute(
    `SELECT
        d.id,
        d.contractID,
        d.reason,
        d.dStatus,
        d.resolution,
        d.createdAt,
        d.updatedAt,
        d.resolvedBy,
        d.raisedBy,
        d.raisedAgainst,
        rb.fullName AS raisedByName,
        rb.email AS raisedByEmail,
        ra.fullName AS raisedAgainstName,
        ra.email AS raisedAgainstEmail,
        ru.fullName AS resolvedByName,
        c.cStatus AS contractStatus,
        p.id AS projectID,
        p.title AS projectTitle
     FROM Disputes d
     INNER JOIN Users rb ON rb.id = d.raisedBy
     INNER JOIN Users ra ON ra.id = d.raisedAgainst
     LEFT JOIN Users ru ON ru.id = d.resolvedBy
     LEFT JOIN Contracts c ON c.id = d.contractID
     LEFT JOIN Proposal pr ON pr.id = c.proposalID
     LEFT JOIN Project p ON p.id = pr.projectID
     ${where}
     ORDER BY d.createdAt DESC, d.id DESC`,
    params,
  );
  return rows;
}

export async function updateDisputeStatus({
  id,
  status,
  resolution,
  resolvedBy,
}) {
  const [result] = await db.execute(
    `UPDATE Disputes
     SET dStatus = ?,
         resolution = ?,
         resolvedBy = CASE
           WHEN ? IN ('resolved', 'rejected') THEN ?
           ELSE resolvedBy
         END
     WHERE id = ?`,
    [status, resolution ?? null, status, resolvedBy, id],
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return getDisputeById(id);
}

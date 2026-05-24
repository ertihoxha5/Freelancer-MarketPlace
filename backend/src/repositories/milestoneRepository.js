import { db } from "../config/db.js";

export async function createMilestone({
  title,
  mDesc,
  amountPayable,
  dueDate,
  contractID,
}) {
  const [result] = await db.execute(
    `INSERT INTO Milestones
       (title, mDesc, amountPayable, dueDate, contractID, mStatus)
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [title, mDesc, amountPayable, dueDate || null, contractID],
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

export async function deleteMilestone(id) {
  const [result] = await db.execute(
    `DELETE FROM Milestones
     WHERE id = ?`,
    [id],
  );
  return result.affectedRows > 0;
}

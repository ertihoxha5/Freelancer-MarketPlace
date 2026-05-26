import { db } from "../config/db.js";

function parseMetadata(row) {
  if (!row) return row;
  if (row.metadata && typeof row.metadata === "string") {
    try {
      row.metadata = JSON.parse(row.metadata);
    } catch {
      row.metadata = null;
    }
  }
  return row;
}

export async function insertPayment({
  contractID,
  milestoneID,
  amount,
  currency,
  pStatus,
  stripePaymentIntentId,
  metadata,
}) {
  const [result] = await db.execute(
    `INSERT INTO Payment
       (contractID, milestoneID, amount, currency, pStatus, stripePaymentIntentId, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      contractID,
      milestoneID ?? null,
      amount,
      currency,
      pStatus,
      stripePaymentIntentId,
      metadata ? JSON.stringify(metadata) : null,
    ],
  );
  return findPaymentById(result.insertId);
}

export async function findPaymentById(id) {
  const [rows] = await db.execute(
    `SELECT *
     FROM Payment
     WHERE id = ?
     LIMIT 1`,
    [id],
  );
  return parseMetadata(rows[0] ?? null);
}

export async function findPaymentByStripeIntentId(stripePaymentIntentId) {
  const [rows] = await db.execute(
    `SELECT *
     FROM Payment
     WHERE stripePaymentIntentId = ?
     LIMIT 1`,
    [stripePaymentIntentId],
  );
  return parseMetadata(rows[0] ?? null);
}

export async function updatePaymentStatus(id, pStatus, metadata = null) {
  const metadataJson = metadata ? JSON.stringify(metadata) : null;
  await db.execute(
    `UPDATE Payment
     SET pStatus = ?,
         metadata = COALESCE(?, metadata),
         updatedAt = NOW()
     WHERE id = ?`,
    [pStatus, metadataJson, id],
  );
  return findPaymentById(id);
}

export async function updatePaymentByStripeIntentId(
  stripePaymentIntentId,
  pStatus,
  metadata = null,
) {
  const payment = await findPaymentByStripeIntentId(stripePaymentIntentId);
  if (!payment) return null;
  return updatePaymentStatus(payment.id, pStatus, metadata);
}

export async function findPaymentsForUser(userID, { limit = 50, offset = 0 } = {}) {
  const [rows] = await db.execute(
    `SELECT p.*,
            c.clientID,
            c.freelancerID,
            pr.title AS projectTitle,
            m.title AS milestoneTitle
     FROM Payment p
     INNER JOIN Contracts c ON c.id = p.contractID
     INNER JOIN Proposal prop ON prop.id = c.proposalID
     INNER JOIN Project pr ON pr.id = prop.projectID
     LEFT JOIN Milestones m ON m.id = p.milestoneID
     WHERE c.clientID = ? OR c.freelancerID = ?
     ORDER BY p.createdAt DESC
     LIMIT ? OFFSET ?`,
    [userID, userID, limit, offset],
  );
  return rows.map(parseMetadata);
}

export async function insertMilestonePayment({
  milestoneID,
  paymentID,
  amount,
  pStatus = "held",
}) {
  const [result] = await db.execute(
    `INSERT INTO MilestonePayment (milestoneID, paymentID, amount, pStatus)
     VALUES (?, ?, ?, ?)`,
    [milestoneID, paymentID, amount, pStatus],
  );
  return findMilestonePaymentById(result.insertId);
}

export async function findMilestonePaymentById(id) {
  const [rows] = await db.execute(
    `SELECT *
     FROM MilestonePayment
     WHERE id = ?
     LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function findMilestonePaymentByMilestoneId(milestoneID) {
  const [rows] = await db.execute(
    `SELECT *
     FROM MilestonePayment
     WHERE milestoneID = ?
     LIMIT 1`,
    [milestoneID],
  );
  return rows[0] ?? null;
}

export async function releaseMilestonePayment(milestoneID, releasedBy) {
  const [result] = await db.execute(
    `UPDATE MilestonePayment
     SET pStatus = 'released',
         releasedAt = NOW(),
         releasedBy = ?,
         updatedAt = NOW()
     WHERE milestoneID = ? AND pStatus = 'held'`,
    [releasedBy, milestoneID],
  );
  if (result.affectedRows === 0) return null;
  return findMilestonePaymentByMilestoneId(milestoneID);
}

export async function refundMilestonePayment(milestoneID) {
  const [result] = await db.execute(
    `UPDATE MilestonePayment
     SET pStatus = 'refunded',
         updatedAt = NOW()
     WHERE milestoneID = ?`,
    [milestoneID],
  );
  if (result.affectedRows === 0) return null;
  return findMilestonePaymentByMilestoneId(milestoneID);
}

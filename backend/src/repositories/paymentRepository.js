import { db } from "../config/db.js";
import { validationError } from "../utils/errors.js";

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

/**
 * @param {{
 *   contractID: number;
 *   milestoneID?: number | null;
 *   amount: number;
 *   currency?: string;
 *   pStatus: string;
 *   stripePaymentIntentId: string;
 *   metadata?: object | null;
 * }} data
 */
export async function createPayment(data) {
  const [result] = await db.execute(
    `INSERT INTO Payment
       (contractID, milestoneID, amount, currency, pStatus, stripePaymentIntentId, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.contractID,
      data.milestoneID ?? null,
      data.amount,
      data.currency ?? "usd",
      data.pStatus,
      data.stripePaymentIntentId,
      data.metadata ? JSON.stringify(data.metadata) : null,
    ],
  );
  return getPaymentById(result.insertId);
}

export async function getPaymentById(paymentID) {
  const [rows] = await db.execute(
    `SELECT *
     FROM Payment
     WHERE id = ?
     LIMIT 1`,
    [paymentID],
  );
  return parseMetadata(rows[0] ?? null);
}

export async function getPaymentByStripeId(stripePaymentIntentId) {
  const [rows] = await db.execute(
    `SELECT *
     FROM Payment
     WHERE stripePaymentIntentId = ?
     LIMIT 1`,
    [stripePaymentIntentId],
  );
  return parseMetadata(rows[0] ?? null);
}

export async function updatePaymentStatus(paymentID, status, metadata = null) {
  const metadataJson = metadata ? JSON.stringify(metadata) : null;
  await db.execute(
    `UPDATE Payment
     SET pStatus = ?,
         metadata = COALESCE(?, metadata),
         updatedAt = NOW()
     WHERE id = ?`,
    [status, metadataJson, paymentID],
  );
  return getPaymentById(paymentID);
}

export async function updatePaymentStatusByStripeId(
  stripePaymentIntentId,
  status,
  metadata = null,
) {
  const payment = await getPaymentByStripeId(stripePaymentIntentId);
  if (!payment) return null;
  return updatePaymentStatus(payment.id, status, metadata);
}

export async function getPaymentHistory(userID, limit = 20, offset = 0) {
  const pageSize = Number(limit);
  const pageOffset = Number(offset);

  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw validationError("Invalid limit value.");
  }
  if (!Number.isInteger(pageOffset) || pageOffset < 0) {
    throw validationError("Invalid offset value.");
  }

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
     LIMIT ${pageSize} OFFSET ${pageOffset}`,
    [userID, userID],
  );
  return rows.map(parseMetadata);
}

export async function getMilestonePayments(contractID) {
  const [rows] = await db.execute(
    `SELECT mp.*,
            m.title AS milestoneTitle,
            m.mStatus AS milestoneStatus,
            m.amountPayable,
            p.stripePaymentIntentId,
            p.pStatus AS paymentStatus,
            p.contractID
     FROM MilestonePayment mp
     INNER JOIN Milestones m ON m.id = mp.milestoneID
     INNER JOIN Payment p ON p.id = mp.paymentID
     WHERE m.contractID = ?
     ORDER BY mp.createdAt DESC`,
    [contractID],
  );
  return rows;
}

export async function createMilestonePayment({
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
  return getMilestonePaymentById(result.insertId);
}

export async function getMilestonePaymentById(id) {
  const [rows] = await db.execute(
    `SELECT *
     FROM MilestonePayment
     WHERE id = ?
     LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function getMilestonePaymentByMilestoneId(milestoneID) {
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
  return getMilestonePaymentByMilestoneId(milestoneID);
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
  return getMilestonePaymentByMilestoneId(milestoneID);
}

// Backward-compatible aliases
export const insertPayment = createPayment;
export const findPaymentById = getPaymentById;
export const findPaymentByStripeIntentId = getPaymentByStripeId;
export const findPaymentsForUser = (userID, { limit, offset }) =>
  getPaymentHistory(userID, limit, offset);
export const insertMilestonePayment = createMilestonePayment;
export const findMilestonePaymentByMilestoneId = getMilestonePaymentByMilestoneId;
export const updatePaymentByStripeIntentId = updatePaymentStatusByStripeId;

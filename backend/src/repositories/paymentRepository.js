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
 *   transactionID?: string | null;
 *   notes?: string | null;
 *   metadata?: object | null;
 * }} data
 */
export async function createPayment(data) {
  const [result] = await db.execute(
    `INSERT INTO Payment
       (contractID, milestoneID, amount, currency, pStatus, transactionID, notes, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.contractID,
      data.milestoneID ?? null,
      data.amount,
      data.currency ?? "USD",
      data.pStatus,
      data.transactionID ?? null,
      data.notes ?? null,
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

export async function getPaymentByTransactionId(transactionID) {
  const [rows] = await db.execute(
    `SELECT *
     FROM Payment
     WHERE transactionID = ?
     LIMIT 1`,
    [transactionID],
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
export const findPaymentsForUser = (userID, { limit, offset }) =>
  getPaymentHistory(userID, limit, offset);
export const insertMilestonePayment = createMilestonePayment;
export const findMilestonePaymentByMilestoneId = getMilestonePaymentByMilestoneId;

/**
 * Admin: Get all payments with rich joins (IDs focused + details)
 */
export async function getAllPayments({ limit = 50, offset = 0, pStatus = null } = {}) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);

  const params = [];
  let where = '';
  if (pStatus) {
    where = 'WHERE p.pStatus = ?';
    params.push(pStatus);
  }

  const [rows] = await db.execute(
    `SELECT 
        p.id,
        p.contractID,
        p.milestoneID,
        p.amount,
        p.currency,
        p.pStatus,
        p.transactionID,
        p.notes,
        p.createdAt,
        p.updatedAt,
        c.clientID,
        c.freelancerID,
        pr.title AS projectTitle,
        m.title AS milestoneTitle,
        uc.fullName AS clientName,
        uf.fullName AS freelancerName,
        mp.pStatus AS milestonePaymentStatus,
        mp.releasedAt
     FROM Payment p
     INNER JOIN Contracts c ON c.id = p.contractID
     INNER JOIN Proposal prop ON prop.id = c.proposalID
     INNER JOIN Project pr ON pr.id = prop.projectID
     INNER JOIN Users uc ON uc.id = c.clientID
     INNER JOIN Users uf ON uf.id = c.freelancerID
     LEFT JOIN Milestones m ON m.id = p.milestoneID
     LEFT JOIN MilestonePayment mp ON mp.paymentID = p.id
     ${where}
     ORDER BY p.createdAt DESC
     LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    params
  );

  return rows.map(parseMetadata);
}

export async function countAllPayments({ pStatus = null } = {}) {
  const params = [];
  let where = '';
  if (pStatus) {
    where = 'WHERE p.pStatus = ?';
    params.push(pStatus);
  }

  const [rows] = await db.execute(
    `SELECT COUNT(*) AS total
     FROM Payment p
     INNER JOIN Contracts c ON c.id = p.contractID
     ${where}`,
    params
  );
  return rows[0]?.total || 0;
}

/* =========================
   payment_legacy (ARCHIVE) helpers
   =========================
   The payment_legacy table is created automatically by the migration in db.js
   when an old Stripe-based Payment table (with stripePaymentIntentId) is detected.
   It is an immutable historical archive. New payments should NEVER be inserted here.
*/

// Detect which identifier column the legacy row actually has
function getLegacyIdentifierColumn(row) {
  if (!row) return null;
  if (row.stripePaymentIntentId) return { key: 'stripePaymentIntentId', value: row.stripePaymentIntentId };
  if (row.transactionID) return { key: 'transactionID', value: row.transactionID };
  return null;
}

export async function getLegacyPayments(limit = 50, offset = 0) {
  const pageSize = Number(limit);
  const pageOffset = Number(offset);

  const [rows] = await db.execute(
    `SELECT *
     FROM payment_legacy
     ORDER BY archivedAt DESC, id DESC
     LIMIT ${pageSize} OFFSET ${pageOffset}`
  );

  return rows.map((row) => {
    const parsed = parseMetadata(row);
    const ident = getLegacyIdentifierColumn(parsed);
    if (ident) {
      parsed.legacyTransactionId = ident.value;
      parsed.legacyIdType = ident.key;
    }
    return parsed;
  });
}

export async function getLegacyPaymentById(id) {
  const [rows] = await db.execute(
    `SELECT * FROM payment_legacy WHERE id = ? LIMIT 1`,
    [id]
  );
  const row = rows[0] ?? null;
  if (!row) return null;

  const parsed = parseMetadata(row);
  const ident = getLegacyIdentifierColumn(parsed);
  if (ident) {
    parsed.legacyTransactionId = ident.value;
    parsed.legacyIdType = ident.key;
  }
  return parsed;
}

export async function findLegacyPaymentByTransactionId(txId) {
  // Try both possible old identifier columns
  const [rows] = await db.execute(
    `SELECT * FROM payment_legacy 
     WHERE transactionID = ? OR stripePaymentIntentId = ? 
     LIMIT 1`,
    [txId, txId]
  );
  const row = rows[0] ?? null;
  if (!row) return null;

  const parsed = parseMetadata(row);
  const ident = getLegacyIdentifierColumn(parsed);
  if (ident) {
    parsed.legacyTransactionId = ident.value;
    parsed.legacyIdType = ident.key;
  }
  return parsed;
}

export async function getLegacyPaymentsForUser(userID, limit = 20, offset = 0) {
  // Join through Contracts so we can filter by client or freelancer
  const pageSize = Number(limit);
  const pageOffset = Number(offset);

  const [rows] = await db.execute(
    `SELECT pl.*,
            c.clientID,
            c.freelancerID,
            pr.title AS projectTitle,
            m.title AS milestoneTitle
     FROM payment_legacy pl
     INNER JOIN Contracts c ON c.id = pl.contractID
     INNER JOIN Proposal prop ON prop.id = c.proposalID
     INNER JOIN Project pr ON pr.id = prop.projectID
     LEFT JOIN Milestones m ON m.id = pl.milestoneID
     WHERE c.clientID = ? OR c.freelancerID = ?
     ORDER BY pl.archivedAt DESC, pl.id DESC
     LIMIT ${pageSize} OFFSET ${pageOffset}`,
    [userID, userID]
  );

  return rows.map((row) => {
    const parsed = parseMetadata(row);
    const ident = getLegacyIdentifierColumn(parsed);
    if (ident) {
      parsed.legacyTransactionId = ident.value;
      parsed.legacyIdType = ident.key;
    }
    return parsed;
  });
}

/**
 * Optional one-time backfill helper.
 * Copies a legacy record into the modern Payment table (if a matching transactionID doesn't already exist).
 * Returns the new Payment row or null if nothing was copied.
 */
export async function backfillLegacyPaymentToModern(legacyId) {
  const legacy = await getLegacyPaymentById(legacyId);
  if (!legacy) return null;

  const txId = legacy.legacyTransactionId || legacy.transactionID || legacy.stripePaymentIntentId;
  if (!txId) return null;

  // Check if we already have it in the modern table
  const existing = await getPaymentByTransactionId(txId);
  if (existing) return existing;

  const insertData = {
    contractID: legacy.contractID,
    milestoneID: legacy.milestoneID,
    amount: legacy.amount,
    currency: legacy.currency || 'USD',
    pStatus: legacy.pStatus || 'succeeded',   // most old payments were successful
    transactionID: txId,
    notes: 'Backfilled from payment_legacy',
    metadata: {
      ...(legacy.metadata || {}),
      backfilledFromLegacyId: legacy.id,
      originalArchivedAt: legacy.archivedAt,
      originalCreatedAt: legacy.originalCreatedAt,
    },
  };

  const newPayment = await createPayment(insertData);

  // Optionally also create a MilestonePayment record if one doesn't exist
  if (legacy.milestoneID && newPayment) {
    const existingMilestonePayment = await getMilestonePaymentByMilestoneId(legacy.milestoneID);
    if (!existingMilestonePayment) {
      await createMilestonePayment({
        milestoneID: legacy.milestoneID,
        paymentID: newPayment.id,
        amount: legacy.amount,
        pStatus: 'held', // or 'released' if you have evidence it was already paid out
      });
    }
  }

  return newPayment;
}

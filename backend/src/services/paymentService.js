// backend/src/services/paymentService.js
import { createHash } from "node:crypto";
import * as paymentRepository from "../repositories/paymentRepository.js";
import * as projectRepository from "../repositories/projectRepository.js";
import * as milestoneRepository from "../repositories/milestoneRepository.js";
import * as userRepository from "../repositories/userRepository.js";
import { db } from "../config/db.js";
import { sendPaymentConfirmationEmail } from "./emailService.js";
import {
  conflictError,
  forbiddenError,
  notFoundError,
  validationError,
} from "../utils/errors.js";

const DEFAULT_CURRENCY = "USD";

function logTransaction(action, details) {
  console.info(
    `[payment] ${action}`,
    JSON.stringify({ ...details, at: new Date().toISOString() }),
  );
}

// ==================== FUNKSIONET E REJA (PA STRIPE) ====================

/**
 * POST /api/payment/intent  → Krijo intent (SIMULIM)
 */
export async function createPaymentIntent(userID, body) {
  const { 
    amount, 
    currency = DEFAULT_CURRENCY, 
    projectId, 
    milestoneID, 
    contractID, 
    description 
  } = body;

  if (!amount || amount <= 0) {
    throw validationError("Amount duhet të jetë më i madh se 0");
  }

  // Kontrollo pronësinë nëse ka contract
  if (contractID) {
    await assertClientOwnsContract(contractID, userID);
  }

  const mockTransactionId = `pi_mock_${Date.now()}`;

  const paymentData = {
    contractID: contractID || null,
    milestoneID: milestoneID || null,
    amount: parseFloat(amount),
    currency,
    pStatus: "pending",
    transactionID: mockTransactionId,
    notes: description || "Payment for freelance project",
    metadata: { 
      projectId: projectId || null,
      createdBy: "mock_intent",
      userID 
    }
  };

  const payment = await paymentRepository.createPayment(paymentData);

  logTransaction("create_intent", { 
    paymentId: payment.id, 
    amount, 
    transactionID: mockTransactionId,
    userID 
  });

  return {
    clientSecret: `mock_client_secret_${payment.id}`,
    paymentIntentId: mockTransactionId,
    paymentId: payment.id,
    status: "pending"
  };
}

/**
 * POST /api/payment/confirm
 */
export async function confirmPayment(userID, body) {
  const { paymentIntentId } = body;

  const payment = await paymentRepository.getPaymentByTransactionId(paymentIntentId);
  if (!payment) {
    throw notFoundError("Payment not found");
  }

  if (payment.contractID) {
    await assertClientOwnsContract(payment.contractID, userID);
  }

  const updated = await paymentRepository.updatePaymentStatus(payment.id, "succeeded");

  await holdMilestoneFundsOnSuccess(updated);
  await notifyPaymentSucceeded(updated);

  logTransaction("confirm_payment", { paymentId: payment.id, status: "succeeded" });

  return {
    success: true,
    status: "succeeded",
    payment: updated
  };
}

/**
 * POST /api/payment/refund
 */
export async function refundPayment(userID, body) {
  const { paymentIntentId } = body;

  const payment = await paymentRepository.getPaymentByTransactionId(paymentIntentId);
  if (!payment) {
    throw notFoundError("Payment not found");
  }

  if (payment.contractID) {
    await assertClientOwnsContract(payment.contractID, userID);
  }

  const refunded = await paymentRepository.updatePaymentStatus(payment.id, "refunded");

  logTransaction("refund_payment", { paymentId: payment.id });

  return {
    success: true,
    status: "refunded",
    payment: refunded
  };
}

// ==================== FUNKSIONET EKZISTUESE ====================

async function assertClientOwnsContract(contractID, clientID) {
  const contract = await projectRepository.getContractById(contractID);
  if (!contract) throw notFoundError("Contract not found.");
  if (Number(contract.clientID) !== Number(clientID)) {
    throw forbiddenError("You do not own this contract.");
  }
  if (contract.cStatus !== "active") {
    throw conflictError("Payments are only allowed on active contracts.");
  }
  return contract;
}

async function holdMilestoneFundsOnSuccess(payment) {
  if (!payment?.milestoneID || payment.pStatus !== "succeeded") return;

  const existing = await paymentRepository.getMilestonePaymentByMilestoneId(
    payment.milestoneID,
  );
  if (existing) return existing;

  const record = await paymentRepository.createMilestonePayment({
    milestoneID: payment.milestoneID,
    paymentID: payment.id,
    amount: payment.amount,
    pStatus: "held",
  });

  logTransaction("milestone_hold", {
    milestoneID: payment.milestoneID,
    paymentId: payment.id,
    milestonePaymentId: record.id,
  });

  return record;
}

async function notifyPaymentSucceeded(payment) {
  if (!payment || payment.pStatus !== "succeeded") return;

  const contract = await projectRepository.getContractById(payment.contractID);
  if (!contract) return;

  let milestoneTitle = null;
  if (payment.milestoneID) {
    const milestone = await milestoneRepository.getMilestoneById(
      payment.milestoneID,
    );
    milestoneTitle = milestone?.title ?? null;
  }

  const projectTitle = contract.projectTitle || "Project";
  const isMilestoneHold = Boolean(payment.milestoneID);

  const [client, freelancer] = await Promise.all([
    userRepository.findUserContactById(contract.clientID),
    userRepository.findUserContactById(contract.freelancerID),
  ]);

  const sends = [];

  if (client?.email) {
    sends.push(
      sendPaymentConfirmationEmail({
        email: client.email,
        fullName: client.fullName,
        role: "client",
        amountCents: payment.amount,
        projectTitle,
        milestoneTitle,
        isMilestoneHold,
      }),
    );
  }

  if (freelancer?.email) {
    sends.push(
      sendPaymentConfirmationEmail({
        email: freelancer.email,
        fullName: freelancer.fullName,
        role: "freelancer",
        amountCents: payment.amount,
        projectTitle,
        milestoneTitle,
        isMilestoneHold,
      }),
    );
  }

  await Promise.allSettled(sends);
}

/**
 * @param {number} userID
 * @param {{ page?: number; limit?: number }} pagination
 */
export async function getPaymentHistory(userID, pagination = {}) {
  const page = Math.max(1, Number(pagination.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(pagination.limit) || 20));
  const offset = (page - 1) * limit;

  const payments = await paymentRepository.getPaymentHistory(
    userID,
    limit,
    offset,
  );

  return { payments, page, limit };
}

export async function releaseMilestoneFunds(milestoneID, releasedBy) {
  const milestone = await milestoneRepository.getMilestoneById(milestoneID);
  if (!milestone) throw notFoundError("Milestone not found.");

  const contract = await projectRepository.getContractById(milestone.contractID);
  if (Number(contract?.clientID) !== Number(releasedBy)) {
    throw forbiddenError("Only the contract client can release milestone funds.");
  }

  const milestonePayment =
    await paymentRepository.getMilestonePaymentByMilestoneId(milestoneID);

  if (!milestonePayment) {
    logTransaction("release_skipped", {
      milestoneID,
      reason: "no_milestone_payment",
    });
    return null;
  }

  if (milestonePayment.pStatus === "released") return milestonePayment;
  if (milestonePayment.pStatus !== "held") {
    throw conflictError("Milestone funds cannot be released in the current state.");
  }

  const released = await paymentRepository.releaseMilestonePayment(
    milestoneID,
    releasedBy,
  );

  logTransaction("milestone_released", {
    milestoneID,
    releasedBy,
    milestonePaymentId: released?.id,
  });

  return released;
}

/**
 * Get payment history for freelancer (earnings from completed milestones)
 */
export async function getFreelancerPaymentHistory(freelancerID, pagination = {}) {
  // Support both {page, limit} (from validation schema) and {limit, offset}
  const rawLimit = Number(pagination.limit) || Number(pagination.pageSize) || 20;
  const limit = Math.min(Math.max(Math.floor(rawLimit), 1), 100);

  let offset;
  if (pagination.offset != null) {
    offset = Math.max(Math.floor(Number(pagination.offset) || 0), 0);
  } else {
    const page = Math.max(Math.floor(Number(pagination.page) || 1), 1);
    offset = (page - 1) * limit;
  }

  // Use template literals for LIMIT/OFFSET to avoid mysql2 prepared statement binding issues
  // (ER_WRONG_ARGUMENTS / "Incorrect arguments to mysqld_stmt_execute" is common with ? for pagination)
  const safeLimit = limit;
  const safeOffset = offset;

  const [rows] = await db.execute(
    `SELECT 
        p.id,
        p.contractID,
        p.amount,
        p.currency,
        p.pStatus,
        p.createdAt,
        p.updatedAt,
        mp.releasedAt,
        mp.pStatus AS milestonePaymentStatus,
        m.title AS milestoneTitle,
        m.amountPayable,
        pr.title AS projectTitle,
        c.clientID,
        u.fullName AS clientName,
        u.email AS clientEmail
     FROM Payment p
     INNER JOIN Contracts c ON c.id = p.contractID
     INNER JOIN Proposal prop ON prop.id = c.proposalID
     INNER JOIN Project pr ON pr.id = prop.projectID
     INNER JOIN Users u ON u.id = c.clientID
     LEFT JOIN MilestonePayment mp ON mp.paymentID = p.id
     LEFT JOIN Milestones m ON m.id = p.milestoneID
     WHERE c.freelancerID = ? AND p.pStatus IN ('succeeded', 'processing')
     ORDER BY p.createdAt DESC
     LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    [freelancerID],
  );

  const [countResult] = await db.execute(
    `SELECT COUNT(*) AS total
     FROM Payment p
     INNER JOIN Contracts c ON c.id = p.contractID
     WHERE c.freelancerID = ? AND p.pStatus IN ('succeeded', 'processing')`,
    [freelancerID],
  );

  return {
    total: countResult[0]?.total || 0,
    limit: safeLimit,
    offset: safeOffset,
    payments: rows,
  };
}

/**
 * Get freelancer payment detail
 */
export async function getFreelancerPaymentDetail(paymentID, freelancerID) {
  const payment = await paymentRepository.getPaymentById(paymentID);
  
  if (!payment) {
    throw notFoundError("Payment not found.");
  }

  const [contracts] = await db.execute(
    `SELECT id, freelancerID FROM Contracts WHERE id = ? AND freelancerID = ?`,
    [payment.contractID, freelancerID],
  );

  if (contracts.length === 0) {
    throw forbiddenError("You do not have access to this payment.");
  }

  const [details] = await db.execute(
    `SELECT 
        p.*,
        mp.releasedAt,
        mp.pStatus AS milestonePaymentStatus,
        m.title AS milestoneTitle,
        m.amountPayable,
        m.mStatus AS milestoneStatus,
        pr.title AS projectTitle,
        c.clientID,
        u.fullName AS clientName,
        u.email AS clientEmail
     FROM Payment p
     LEFT JOIN MilestonePayment mp ON mp.paymentID = p.id
     LEFT JOIN Milestones m ON m.id = p.milestoneID
     INNER JOIN Contracts c ON c.id = p.contractID
     INNER JOIN Proposal prop ON prop.id = c.proposalID
     INNER JOIN Project pr ON pr.id = prop.projectID
     INNER JOIN Users u ON u.id = c.clientID
     WHERE p.id = ? AND c.freelancerID = ?`,
    [paymentID, freelancerID],
  );

  if (details.length === 0) {
    throw forbiddenError("You do not have access to this payment.");
  }

  return details[0];
}
import { createHash } from "node:crypto";
import * as paymentRepository from "../repositories/paymentRepository.js";
import * as projectRepository from "../repositories/projectRepository.js";
import * as milestoneRepository from "../repositories/milestoneRepository.js";
import { getStripe, isStripeConfigured } from "../utils/stripeClient.js";
import {
  conflictError,
  forbiddenError,
  notFoundError,
  validationError,
} from "../utils/errors.js";

const DEFAULT_CURRENCY = "usd";

function logTransaction(action, details) {
  console.info(
    `[payment] ${action}`,
    JSON.stringify({ ...details, at: new Date().toISOString() }),
  );
}

function mapStripeStatus(status) {
  const map = {
    requires_payment_method: "pending",
    requires_confirmation: "pending",
    requires_action: "processing",
    processing: "processing",
    requires_capture: "processing",
    succeeded: "succeeded",
    canceled: "canceled",
  };
  return map[status] || "processing";
}

function amountToCents(amount) {
  const cents = Math.round(Number(amount) * 100);
  if (!Number.isFinite(cents) || cents < 50) {
    throw validationError("Amount must be at least $0.50.");
  }
  return cents;
}

function buildIdempotencyKey(contractID, amountCents, milestoneID) {
  const raw = `intent:${contractID}:${milestoneID ?? "contract"}:${amountCents}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

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

async function applyPaymentIntentStatus(paymentIntent) {
  const payment = await paymentRepository.getPaymentByStripeId(paymentIntent.id);
  if (!payment) {
    logTransaction("orphan_intent", {
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    });
    return null;
  }

  const pStatus = mapStripeStatus(paymentIntent.status);
  const updated = await paymentRepository.updatePaymentStatus(
    payment.id,
    pStatus,
    {
      ...(payment.metadata || {}),
      stripeStatus: paymentIntent.status,
      lastEventAt: new Date().toISOString(),
    },
  );

  logTransaction("status_updated", {
    paymentId: payment.id,
    paymentIntentId: paymentIntent.id,
    pStatus,
  });

  if (pStatus === "succeeded") {
    await holdMilestoneFundsOnSuccess(updated);
  }

  return updated;
}

/**
 * @param {number} contractID
 * @param {number} amount Major currency units (e.g. dollars)
 * @param {string} [description]
 * @param {number} clientID
 * @param {{ milestoneID?: number }} [options]
 */
export async function createPaymentIntent(
  contractID,
  amount,
  description,
  clientID,
  options = {},
) {
  if (!isStripeConfigured()) {
    throw validationError("Stripe is not configured on the server.");
  }

  const contract = await assertClientOwnsContract(contractID, clientID);
  const cents = amountToCents(amount);
  const milestoneID = options.milestoneID ?? null;

  if (milestoneID) {
    const milestone = await milestoneRepository.getMilestoneById(milestoneID);
    if (!milestone || Number(milestone.contractID) !== Number(contractID)) {
      throw notFoundError("Milestone not found for this contract.");
    }
    const existingMp =
      await paymentRepository.getMilestonePaymentByMilestoneId(milestoneID);
    if (existingMp && existingMp.pStatus !== "refunded") {
      throw conflictError("This milestone already has an active payment.");
    }
    const milestoneCents = Math.round(Number(milestone.amountPayable) * 100);
    if (cents !== milestoneCents) {
      throw validationError(
        `Amount must match milestone payable amount ($${milestone.amountPayable}).`,
      );
    }
  }

  const stripe = getStripe();
  const metadata = {
    contractID: String(contractID),
    clientID: String(clientID),
    freelancerID: String(contract.freelancerID),
    projectTitle: contract.projectTitle || "",
  };
  if (milestoneID) metadata.milestoneID = String(milestoneID);

  const idempotencyKey = buildIdempotencyKey(contractID, cents, milestoneID);
  const paymentDescription =
    description ||
    (milestoneID
      ? `Milestone payment for contract #${contractID}`
      : `Contract payment #${contractID}`);

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: cents,
      currency: DEFAULT_CURRENCY,
      automatic_payment_methods: { enabled: true },
      metadata,
      description: paymentDescription,
    },
    { idempotencyKey },
  );

  const payment = await paymentRepository.createPayment({
    contractID,
    milestoneID,
    amount: cents,
    currency: DEFAULT_CURRENCY,
    pStatus: mapStripeStatus(paymentIntent.status),
    stripePaymentIntentId: paymentIntent.id,
    metadata: { ...metadata, stripeStatus: paymentIntent.status },
  });

  logTransaction("intent_created", {
    paymentId: payment.id,
    contractID,
    milestoneID,
    amount: cents,
    paymentIntentId: paymentIntent.id,
    idempotencyKey,
    clientID,
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    paymentId: payment.id,
    amount: cents,
    currency: DEFAULT_CURRENCY,
  };
}

/**
 * @param {string} paymentIntentId
 * @param {number} [userID] Optional access check
 */
export async function confirmPayment(paymentIntentId, userID = null) {
  if (!isStripeConfigured()) {
    throw validationError("Stripe is not configured on the server.");
  }

  const payment = await paymentRepository.getPaymentByStripeId(paymentIntentId);
  if (!payment) throw notFoundError("Payment not found.");

  if (userID != null) {
    const contract = await projectRepository.getContractById(payment.contractID);
    if (
      Number(contract?.clientID) !== Number(userID) &&
      Number(contract?.freelancerID) !== Number(userID)
    ) {
      throw forbiddenError("You do not have access to this payment.");
    }
  }

  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  const updated = await applyPaymentIntentStatus(paymentIntent);

  logTransaction("confirm", {
    paymentIntentId,
    userID,
    pStatus: updated?.pStatus,
  });

  return { payment: updated, status: paymentIntent.status };
}

/**
 * @param {string} paymentIntentId
 * @param {number} [amount] Refund amount in major units; full refund if omitted
 * @param {string} [reason]
 * @param {number} clientID
 */
export async function refundPayment(
  paymentIntentId,
  amount = null,
  reason = null,
  clientID = null,
) {
  if (!isStripeConfigured()) {
    throw validationError("Stripe is not configured on the server.");
  }

  const payment = await paymentRepository.getPaymentByStripeId(paymentIntentId);
  if (!payment) throw notFoundError("Payment not found.");

  if (clientID != null) {
    await assertClientOwnsContract(payment.contractID, clientID);
  }

  if (payment.pStatus !== "succeeded") {
    throw conflictError("Only succeeded payments can be refunded.");
  }

  const stripe = getStripe();
  const refundParams = {
    payment_intent: paymentIntentId,
    reason: reason === "fraudulent" ? "fraudulent" : "requested_by_customer",
    metadata: {
      refundReason: reason || "requested_by_customer",
      clientID: clientID != null ? String(clientID) : "",
    },
  };

  if (amount != null) {
    refundParams.amount = amountToCents(amount);
  }

  const idempotencyKey = createHash("sha256")
    .update(`refund:${paymentIntentId}:${refundParams.amount ?? "full"}`)
    .digest("hex")
    .slice(0, 32);

  const refund = await stripe.refunds.create(refundParams, { idempotencyKey });

  const updated = await paymentRepository.updatePaymentStatus(
    payment.id,
    "refunded",
    {
      ...(payment.metadata || {}),
      refundId: refund.id,
      refundReason: reason || null,
      refundedAt: new Date().toISOString(),
    },
  );

  if (payment.milestoneID) {
    await paymentRepository.refundMilestonePayment(payment.milestoneID);
  }

  logTransaction("refund", {
    paymentId: payment.id,
    paymentIntentId,
    refundId: refund.id,
    amount,
    reason,
  });

  return { payment: updated, refundId: refund.id };
}

/**
 * @param {import('stripe').Stripe.Event} event
 */
export async function handleStripeWebhook(event) {
  logTransaction("webhook_received", { type: event.type, id: event.id });

  switch (event.type) {
    case "payment_intent.succeeded":
    case "payment_intent.processing":
    case "payment_intent.payment_failed":
    case "payment_intent.canceled":
      await applyPaymentIntentStatus(event.data.object);
      break;
    case "charge.refunded": {
      const charge = event.data.object;
      const paymentIntentId = charge.payment_intent;
      if (typeof paymentIntentId === "string") {
        await paymentRepository.updatePaymentStatusByStripeId(
          paymentIntentId,
          "refunded",
          { refundedAt: new Date().toISOString(), chargeId: charge.id },
        );
        const payment =
          await paymentRepository.getPaymentByStripeId(paymentIntentId);
        if (payment?.milestoneID) {
          await paymentRepository.refundMilestonePayment(payment.milestoneID);
        }
        logTransaction("webhook_refund", { paymentIntentId });
      }
      break;
    }
    default:
      logTransaction("webhook_ignored", { type: event.type });
  }

  return { received: true, type: event.type };
}

/**
 * Verify Stripe signature and return the event object.
 * @param {Buffer|string} rawBody
 * @param {string} signature
 */
export function constructStripeWebhookEvent(rawBody, signature) {
  if (!isStripeConfigured()) {
    throw validationError("Stripe is not configured.");
  }
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw validationError("STRIPE_WEBHOOK_SECRET is not configured.");
  }

  const stripe = getStripe();
  try {
    return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    logTransaction("webhook_invalid", { error: err.message });
    throw validationError(
      `Webhook signature verification failed: ${err.message}`,
    );
  }
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

/** @deprecated use constructStripeWebhookEvent + handleStripeWebhook */
export async function handleStripeWebhookRaw(rawBody, signature) {
  const event = constructStripeWebhookEvent(rawBody, signature);
  return handleStripeWebhook(event);
}

export async function createPaymentIntentFromBody(body, clientID) {
  const { contractID, amount, milestoneID, description } = body;
  return createPaymentIntent(contractID, amount, description, clientID, {
    milestoneID,
  });
}

export async function confirmPaymentFromBody(body, userID) {
  return confirmPayment(body.paymentIntentId, userID);
}

export async function refundPaymentFromBody(body, clientID) {
  return refundPayment(
    body.paymentIntentId,
    body.amount ?? null,
    body.reason ?? null,
    clientID,
  );
}

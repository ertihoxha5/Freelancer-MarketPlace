import * as paymentRepository from "../repositories/paymentRepository.js";
import * as projectRepository from "../repositories/projectRepository.js";
import * as milestoneRepository from "../repositories/milestoneRepository.js";
import { getStripe, isStripeConfigured } from "../utils/stripeClient.js";
import { validate } from "../validation/validate.js";
import { paymentSchemas } from "../validation/schemas.js";
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
    JSON.stringify({
      ...details,
      at: new Date().toISOString(),
    }),
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

async function assertClientOwnsContract(contractID, clientID) {
  const contract = await projectRepository.getContractById(contractID);
  if (!contract) {
    throw notFoundError("Contract not found.");
  }
  if (Number(contract.clientID) !== Number(clientID)) {
    throw forbiddenError("You do not own this contract.");
  }
  if (contract.cStatus !== "active") {
    throw conflictError("Payments are only allowed on active contracts.");
  }
  return contract;
}

async function syncPaymentFromIntent(paymentIntent) {
  const payment = await paymentRepository.findPaymentByStripeIntentId(
    paymentIntent.id,
  );
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

  logTransaction("sync", {
    paymentId: payment.id,
    paymentIntentId: paymentIntent.id,
    pStatus,
  });

  if (pStatus === "succeeded" && payment.milestoneID) {
    const existing = await paymentRepository.findMilestonePaymentByMilestoneId(
      payment.milestoneID,
    );
    if (!existing) {
      await paymentRepository.insertMilestonePayment({
        milestoneID: payment.milestoneID,
        paymentID: payment.id,
        amount: payment.amount,
        pStatus: "held",
      });
      logTransaction("milestone_hold", {
        milestoneID: payment.milestoneID,
        paymentId: payment.id,
      });
    }
  }

  return updated;
}

/**
 * @param {number} contractID
 * @param {number} amount Major currency units (e.g. dollars)
 * @param {number} clientID
 * @param {{ milestoneID?: number }} [options]
 */
export async function createPaymentIntent(
  contractID,
  amount,
  clientID,
  options = {},
) {
  if (!isStripeConfigured()) {
    throw validationError("Stripe is not configured on the server.");
  }

  const contract = await assertClientOwnsContract(contractID, clientID);
  const cents = amountToCents(amount);
  let milestoneID = options.milestoneID ?? null;

  if (milestoneID) {
    const milestone = await milestoneRepository.getMilestoneById(milestoneID);
    if (!milestone || Number(milestone.contractID) !== Number(contractID)) {
      throw notFoundError("Milestone not found for this contract.");
    }
    const existingPay =
      await paymentRepository.findMilestonePaymentByMilestoneId(milestoneID);
    if (existingPay && existingPay.pStatus !== "refunded") {
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
  if (milestoneID) {
    metadata.milestoneID = String(milestoneID);
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: cents,
    currency: DEFAULT_CURRENCY,
    automatic_payment_methods: { enabled: true },
    metadata,
    description: milestoneID
      ? `Milestone payment for contract #${contractID}`
      : `Contract payment #${contractID}`,
  });

  const payment = await paymentRepository.insertPayment({
    contractID,
    milestoneID,
    amount: cents,
    currency: DEFAULT_CURRENCY,
    pStatus: mapStripeStatus(paymentIntent.status),
    stripePaymentIntentId: paymentIntent.id,
    metadata: {
      ...metadata,
      stripeStatus: paymentIntent.status,
    },
  });

  logTransaction("intent_created", {
    paymentId: payment.id,
    contractID,
    milestoneID,
    amount: cents,
    paymentIntentId: paymentIntent.id,
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
 * @param {number} userID
 */
export async function confirmPayment(paymentIntentId, userID) {
  if (!isStripeConfigured()) {
    throw validationError("Stripe is not configured on the server.");
  }

  const payment = await paymentRepository.findPaymentByStripeIntentId(
    paymentIntentId,
  );
  if (!payment) {
    throw notFoundError("Payment not found.");
  }

  const contract = await projectRepository.getContractById(payment.contractID);
  if (
    Number(contract?.clientID) !== Number(userID) &&
    Number(contract?.freelancerID) !== Number(userID)
  ) {
    throw forbiddenError("You do not have access to this payment.");
  }

  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  const updated = await syncPaymentFromIntent(paymentIntent);

  logTransaction("confirm", {
    paymentIntentId,
    userID,
    pStatus: updated?.pStatus,
  });

  return {
    payment: updated,
    status: paymentIntent.status,
  };
}

/**
 * @param {string} paymentIntentId
 * @param {string} [reason]
 * @param {number} clientID
 */
export async function refundPayment(paymentIntentId, reason, clientID) {
  if (!isStripeConfigured()) {
    throw validationError("Stripe is not configured on the server.");
  }

  const payment = await paymentRepository.findPaymentByStripeIntentId(
    paymentIntentId,
  );
  if (!payment) {
    throw notFoundError("Payment not found.");
  }

  await assertClientOwnsContract(payment.contractID, clientID);

  if (payment.pStatus !== "succeeded") {
    throw conflictError("Only succeeded payments can be refunded.");
  }

  const stripe = getStripe();
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    reason: reason === "fraudulent" ? "fraudulent" : "requested_by_customer",
    metadata: {
      refundReason: reason || "requested_by_customer",
      clientID: String(clientID),
    },
  });

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
    clientID,
    reason,
  });

  return { payment: updated, refundId: refund.id };
}

export async function handleStripeWebhook(rawBody, signature) {
  if (!isStripeConfigured()) {
    throw validationError("Stripe is not configured.");
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw validationError("STRIPE_WEBHOOK_SECRET is not configured.");
  }

  const stripe = getStripe();
  let event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    logTransaction("webhook_invalid", { error: err.message });
    throw validationError(`Webhook signature verification failed: ${err.message}`);
  }

  logTransaction("webhook_received", { type: event.type, id: event.id });

  switch (event.type) {
    case "payment_intent.succeeded":
    case "payment_intent.processing":
    case "payment_intent.payment_failed":
    case "payment_intent.canceled": {
      await syncPaymentFromIntent(event.data.object);
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object;
      const paymentIntentId = charge.payment_intent;
      if (paymentIntentId) {
        await paymentRepository.updatePaymentByStripeIntentId(
          paymentIntentId,
          "refunded",
          { refundedAt: new Date().toISOString(), chargeId: charge.id },
        );
        const payment = await paymentRepository.findPaymentByStripeIntentId(
          paymentIntentId,
        );
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

  return { received: true };
}

export async function getPaymentHistory(userID, query = {}) {
  const { page, limit } = validate(paymentSchemas.historyQuery, query ?? {});
  const offset = (page - 1) * limit;
  const payments = await paymentRepository.findPaymentsForUser(userID, {
    limit,
    offset,
  });
  return { payments, page, limit };
}

export async function releaseMilestoneFunds(milestoneID, releasedBy) {
  const milestone = await milestoneRepository.getMilestoneById(milestoneID);
  if (!milestone) {
    throw notFoundError("Milestone not found.");
  }

  const contract = await projectRepository.getContractById(milestone.contractID);
  if (Number(contract?.clientID) !== Number(releasedBy)) {
    throw forbiddenError("Only the contract client can release milestone funds.");
  }

  const milestonePayment =
    await paymentRepository.findMilestonePaymentByMilestoneId(milestoneID);

  if (!milestonePayment) {
    logTransaction("release_skipped", {
      milestoneID,
      reason: "no_milestone_payment",
    });
    return null;
  }

  if (milestonePayment.pStatus === "released") {
    return milestonePayment;
  }

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

export async function createPaymentIntentFromBody(body, clientID) {
  const { contractID, amount, milestoneID } = validate(
    paymentSchemas.createIntent,
    body ?? {},
  );
  return createPaymentIntent(contractID, amount, clientID, { milestoneID });
}

export async function confirmPaymentFromBody(body, userID) {
  const { paymentIntentId } = validate(paymentSchemas.confirm, body ?? {});
  return confirmPayment(paymentIntentId, userID);
}

export async function refundPaymentFromBody(body, clientID) {
  const { paymentIntentId, reason } = validate(paymentSchemas.refund, body ?? {});
  return refundPayment(paymentIntentId, reason, clientID);
}

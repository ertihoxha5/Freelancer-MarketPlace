import * as paymentService from "../services/paymentService.js";

function getValidatedBody(req) {
  return req.validated?.body ?? {};
}

function getValidatedQuery(req) {
  return req.validated?.query ?? {};
}

function handleError(err, res, next) {
  if (err.statusCode) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  return next(err);
}

/**
 * POST /api/payment/intent
 */
export async function createIntent(req, res, next) {
  try {
    const body = getValidatedBody(req);
    const result = await paymentService.createPaymentIntentFromBody(
      body,
      req.user.id,
    );
    return res.status(201).json(result);
  } catch (err) {
    return handleError(err, res, next);
  }
}

/**
 * POST /api/payment/confirm
 */
export async function confirm(req, res, next) {
  try {
    const { paymentIntentId } = getValidatedBody(req);
    const result = await paymentService.confirmPayment(
      paymentIntentId,
      req.user.id,
    );
    return res.status(200).json(result);
  } catch (err) {
    return handleError(err, res, next);
  }
}

/**
 * POST /api/payment/refund
 */
export async function refund(req, res, next) {
  try {
    const body = getValidatedBody(req);
    const result = await paymentService.refundPaymentFromBody(
      body,
      req.user.id,
    );
    return res.status(200).json(result);
  } catch (err) {
    return handleError(err, res, next);
  }
}

/**
 * POST /api/payment/webhook
 */
export async function webhook(req, res, next) {
  try {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      return res.status(400).json({ message: "Missing Stripe signature." });
    }

    const event = paymentService.constructStripeWebhookEvent(
      req.body,
      signature,
    );
    const result = await paymentService.handleStripeWebhook(event);
    return res.status(200).json(result);
  } catch (err) {
    return handleError(err, res, next);
  }
}

/**
 * GET /api/payment/history
 */
export async function history(req, res, next) {
  try {
    const query = getValidatedQuery(req);
    const result = await paymentService.getPaymentHistory(req.user.id, query);
    return res.status(200).json(result);
  } catch (err) {
    return handleError(err, res, next);
  }
}

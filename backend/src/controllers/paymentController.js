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

/** POST /api/payment/intent */
export async function createIntent(req, res, next) {
  try {
    const body = getValidatedBody(req);
    const result = await paymentService.createPaymentIntent(req.user.id, body);
    return res.status(200).json(result);
  } catch (err) {
    return handleError(err, res, next);
  }
}

/** POST /api/payment/confirm */
export async function confirm(req, res, next) {
  try {
    const body = getValidatedBody(req);
    const result = await paymentService.confirmPayment(req.user.id, body);
    return res.status(200).json(result);
  } catch (err) {
    return handleError(err, res, next);
  }
}

/** POST /api/payment/refund */
export async function refund(req, res, next) {
  try {
    const body = getValidatedBody(req);
    const result = await paymentService.refundPayment(req.user.id, body);
    return res.status(200).json(result);
  } catch (err) {
    return handleError(err, res, next);
  }
}

/** GET /api/payment/history */
export async function history(req, res, next) {
  try {
    const query = getValidatedQuery(req);
    const result = await paymentService.getPaymentHistory(req.user.id, query);
    return res.status(200).json(result);
  } catch (err) {
    return handleError(err, res, next);
  }
}

/** GET /api/freelancer/payments */
export async function getFreelancerPayments(req, res, next) {
  try {
    const query = getValidatedQuery(req);
    const result = await paymentService.getFreelancerPaymentHistory(req.user.id, query);
    return res.status(200).json(result);
  } catch (err) {
    return handleError(err, res, next);
  }
}

/** GET /api/freelancer/payments/:id */
export async function getFreelancerPaymentDetail(req, res, next) {
  try {
    const { id } = req.params;
    const result = await paymentService.getFreelancerPaymentDetail(id, req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    return handleError(err, res, next);
  }
}
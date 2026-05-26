import * as paymentService from "../services/paymentService.js";
import { validatedBody, validatedQuery } from "../middleware/validateRequest.js";

export async function createIntent(req, res, next) {
  try {
    const result = await paymentService.createPaymentIntentFromBody(
      validatedBody(req),
      req.user.id,
    );
    return res.status(201).json(result);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
}

export async function confirm(req, res, next) {
  try {
    const result = await paymentService.confirmPaymentFromBody(
      validatedBody(req),
      req.user.id,
    );
    return res.status(200).json(result);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
}

export async function refund(req, res, next) {
  try {
    const result = await paymentService.refundPaymentFromBody(
      validatedBody(req),
      req.user.id,
    );
    return res.status(200).json(result);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
}

export async function webhook(req, res, next) {
  try {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      return res.status(400).json({ message: "Missing Stripe signature." });
    }
    const result = await paymentService.handleStripeWebhook(
      req.body,
      signature,
    );
    return res.status(200).json(result);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
}

export async function history(req, res, next) {
  try {
    const result = await paymentService.getPaymentHistory(
      req.user.id,
      validatedQuery(req),
    );
    return res.status(200).json(result);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
}

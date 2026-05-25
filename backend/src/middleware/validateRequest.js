import { validate } from "../validation/validate.js";

/**
 * Express middleware: validates body, params, and/or query with Zod schemas.
 * Parsed values are stored on req.validated — controllers must use these, not req.body.
 */
export function validateRequest({ body, params, query } = {}) {
  return (req, res, next) => {
    try {
      req.validated = req.validated ?? {};
      if (body) {
        req.validated.body = validate(body, req.body ?? {});
      }
      if (params) {
        req.validated.params = validate(params, req.params ?? {});
      }
      if (query) {
        req.validated.query = validate(query, req.query ?? {});
      }
      next();
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      next(err);
    }
  };
}

export function validatedBody(req) {
  return req.validated?.body ?? {};
}

export function validatedParams(req) {
  return req.validated?.params ?? req.params ?? {};
}

export function validatedQuery(req) {
  return req.validated?.query ?? req.query ?? {};
}

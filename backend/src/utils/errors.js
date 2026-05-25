export function validationError(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

export function notFoundError(message) {
  const err = new Error(message);
  err.statusCode = 404;
  return err;
}

export function forbiddenError(message = "Forbidden") {
  const err = new Error(message);
  err.statusCode = 403;
  return err;
}

export function conflictError(message) {
  const err = new Error(message);
  err.statusCode = 409;
  return err;
}

export function unauthorizedError(message = "Unauthorized") {
  const err = new Error(message);
  err.statusCode = 401;
  return err;
}

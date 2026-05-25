import csrf from "csurf";

/**
 * Cookie-based CSRF protection for routes that set or use httpOnly refresh cookies.
 * Clients must call GET /api/auth/csrf-token first and send the token via X-CSRF-Token.
 */
export const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  },
});

export function csrfTokenHandler(req, res) {
  res.json({ csrfToken: req.csrfToken() });
}

export function csrfErrorHandler(err, req, res, next) {
  if (err?.code === "EBADCSRFTOKEN") {
    return res.status(403).json({ message: "Invalid or missing CSRF token." });
  }
  next(err);
}

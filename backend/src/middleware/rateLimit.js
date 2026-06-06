import rateLimit from "express-rate-limit";

const authRateLimitDefaults = {
  windowMs: 15 * 60 * 1000,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
};

const defaultLoginLimit = process.env.NODE_ENV === "production" ? 5 : 10;
const loginMax = Math.max(
  1,
  Number(process.env.AUTH_LOGIN_MAX_ATTEMPTS) || defaultLoginLimit,
);
const loginWindowMs =
  Math.max(
    1,
    Number(process.env.AUTH_LOGIN_WINDOW_MINUTES) || 15,
  ) * 60 * 1000;

export const authLoginLimiter = rateLimit({
  ...authRateLimitDefaults,
  windowMs: loginWindowMs,
  max: loginMax,
  message: {
    message: `Too many login attempts. Try again in ${Math.round(loginWindowMs / 60000)} minutes.`,
  },
});

export const authRegisterLimiter = rateLimit({
  ...authRateLimitDefaults,
  max: 5,
  message: { message: "Too many registration attempts. Try again in 15 minutes." },
});

export const authRefreshLimiter = rateLimit({
  ...authRateLimitDefaults,
  max: 10,
  message: { message: "Too many token refresh attempts. Try again in 15 minutes." },
});

const isProduction = process.env.NODE_ENV === "production";

// Much more permissive in development to avoid "Too many requests." during testing,
// multiple tab usage, rapid admin list loads (payments, applications, hired freelancers, search, etc.),
// and import/export operations.
const apiMax = isProduction
  ? Number(process.env.API_RATE_LIMIT_MAX) || 100
  : Number(process.env.API_RATE_LIMIT_MAX) || 2000;

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: apiMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests." },
  // Skip rate limiting for admins in non-production (dev/staging convenience)
  skip: (req) => !isProduction && Number(req.user?.roleID) === 1,
});

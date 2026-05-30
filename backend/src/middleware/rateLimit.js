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

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests." },
});

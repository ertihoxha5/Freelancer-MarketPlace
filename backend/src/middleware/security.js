import helmet from "helmet";

const isProduction = process.env.NODE_ENV === "production";

export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  hsts: isProduction
    ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
    : false,
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true,
});

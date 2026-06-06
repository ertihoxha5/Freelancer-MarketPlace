import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import freelancerRoutes from "./routes/freelancerRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import savedProjectRoutes from "./routes/savedProjectRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import exportRoutes from "./routes/exportRoutes.js";
import importRoutes from "./routes/importRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";

import { connectMongoDB } from "./config/mongodb.js";
import { db } from "./config/db.js";
import { helmetMiddleware } from "./middleware/security.js";
import { corsMiddleware } from "./middleware/cors.js";
import {
  apiLimiter,
  authLoginLimiter,
  authRegisterLimiter,
  authRefreshLimiter,
} from "./middleware/rateLimit.js";
import { csrfErrorHandler } from "./middleware/csrf.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

connectMongoDB();

// Request → RateLimit → Helmet → CORS → body/cookies → routes → CSRF (auth) → Validate → Controller
app.use(helmetMiddleware);
app.use(corsMiddleware);

// Webhook duhet të vijë PARA express.json() sepse Stripe dërgon raw body
app.post(
  "/api/payment/webhook",
  express.raw({ type: "application/json" }),
  // webhook handler do ta shtojmë në paymentController
  // Për momentin do ta vendosim më vonë pasi të kemi controller-in
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.use("/api/auth/login", authLoginLimiter);
app.use("/api/auth/register", authRegisterLimiter);
app.use("/api/auth/refresh", authRefreshLimiter);
app.use("/api", apiLimiter);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => res.send("API is running"));

app.get("/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({
      status: "ok",
      db: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res
      .status(503)
      .json({ status: "error", db: "disconnected", error: err.message });
  }
});

app.use("/api", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/client", clientRoutes);
app.use("/api/freelancer", freelancerRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/saved-projects", savedProjectRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/import", importRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/payment", paymentRoutes);

app.use(csrfErrorHandler);

// Error handler global
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) {
    return next(err);
  }
  const status = err.statusCode || 500;
  res.status(status).json({ message: err.message || "Internal server error." });
});

export default app;
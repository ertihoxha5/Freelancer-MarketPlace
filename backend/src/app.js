import "dotenv/config";
import express from "express";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import freelancerRoutes from "./routes/freelancerRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import savedProjectRoutes from "./routes/savedProjectRoutes.js";
import { connectMongoDB } from "./config/mongodb.js";
import { db } from "./config/db.js";
import rateLimit from "express-rate-limit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" })); // për /uploads imazhet
app.disable("x-powered-by");

connectMongoDB();

const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((o) => o.trim()),
);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Vary", "Origin");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Try again in 15 minutes." },
});

const apiLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { message: "Too many requests." },
});

app.use("/api/auth/login", loginLimit);
app.use("/api/auth/refresh", loginLimit);
app.use("/api", apiLimit);

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
app.use("/api/chat", chatRoutes);
app.use("/api/saved-projects", savedProjectRoutes);

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) {
    return next(err);
  }
  const status = err.statusCode || 500;
  res.status(status).json({ message: err.message || "Internal server error." });
});

export default app;

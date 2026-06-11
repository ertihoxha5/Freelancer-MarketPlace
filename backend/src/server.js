import http from "http";
import app from "./app.js";
import { db } from "./config/db.js";
import { connectMongoDB } from "./config/mongodb.js";
import { initSocketServer } from "./socket/index.js";
import { registerCqrsHandlers } from "./cqrs/registry.js";

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const httpServer = http.createServer(app);
  registerCqrsHandlers();

  try {
    console.info("Connecting to MongoDB...");
    await connectMongoDB();
    console.info("✅ MongoDB ready for reviews.");
  } catch (err) {
    console.error("⚠️  MongoDB connection failed during startup.");
    console.error("   Reviews will return errors until MongoDB is available.");
    console.error("   Check your MONGO_URI and that MongoDB is running.");
  }

  initSocketServer(httpServer);

  httpServer.listen(PORT, () => {
    console.info(`🚀 Server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

function gracefulShutdown(signal) {
  console.info(`\n${signal} received. Shutting down gracefully...`);
  httpServer.close(async () => {
    try {
      await db.end();
      console.info("MySQL pool closed.");
    } catch (e) {
      console.error("Error closing MySQL:", e.message);
    }
    process.exit(0);
  });
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

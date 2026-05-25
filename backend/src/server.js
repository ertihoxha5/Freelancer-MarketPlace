import http from "http";
import app from "./app.js";
import { db } from "./config/db.js";
import { initSocketServer } from "./socket/index.js";

const PORT = Number(process.env.PORT) || 3000;

const httpServer = http.createServer(app);
initSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.info(`Server listening on port ${PORT}`);
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

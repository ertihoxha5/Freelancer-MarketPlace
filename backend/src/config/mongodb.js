import mongoose from "mongoose";
import "dotenv/config";

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/freelancerMarketplace";
mongoose.set("bufferCommands", false);

let isConnected = false;
let connectionPromise = null;

export async function connectMongoDB() {
  if (isConnected) return;
  if (connectionPromise) return connectionPromise;

  connectionPromise = (async () => {
    try {
      await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        retryWrites: true,
        w: "majority",
      });

      const dbName =
        mongoose.connection.db?.databaseName || "freelancerMarketplace";

      console.info(`✅ MongoDB connected: ${dbName}`);
      console.info(`   Host: ${mongoose.connection.host || "atlas cluster"}`);
      isConnected = true;
    } catch (err) {
      console.error("❌ MongoDB connection failed:", err.message);
      console.error("   Ensure MONGO_URI in .env is valid and MongoDB is reachable.");
      console.error("   Reviews will not work until MongoDB is connected.");
      isConnected = false;
      throw err;
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
}

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected. Attempting to reconnect...");
  isConnected = false;
});

mongoose.connection.on("reconnected", () => {
  console.info("MongoDB reconnected.");
  isConnected = true;
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB error:", err.message);
  isConnected = false;
});

export function getMongoStatus() {
  return {
    connected: isConnected,
    state: mongoose.connection.readyState,
    stateLabel: ["disconnected", "connected", "connecting", "disconnecting"][
      mongoose.connection.readyState
    ],
    host: mongoose.connection.host || null,
    dbName: mongoose.connection.name || null,
  };
}

export default mongoose;

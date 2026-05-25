import mongoose from "mongoose";
import "dotenv/config";

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/freelancerMarketplace";

let isConnected = false;

export async function connectMongoDB() {
  if (isConnected) return;

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

    console.info(`MongoDB connected: ${dbName}`);
    console.info(`Host: ${mongoose.connection.host || "atlas cluster"}`);
    isConnected = true;
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    console.error("Ensure MONGO_URI in .env is valid for Atlas or local MongoDB.");
  }
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
    // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    stateLabel: ["disconnected", "connected", "connecting", "disconnecting"][
      mongoose.connection.readyState
    ],
    host: mongoose.connection.host || null,
    dbName: mongoose.connection.name || null,
  };
}

export default mongoose;

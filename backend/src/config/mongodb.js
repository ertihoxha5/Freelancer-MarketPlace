import mongoose from "mongoose";
import "dotenv/config";

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/freelancerMarketplace";

let isConnected = false;

export async function connectMongoDB() {
  if (isConnected) return;

  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log("MongoDB connected successfully.");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    // Nuk e ndal serverin nëse MongoDB nuk lidhet (graceful degradation)
  }
}

export function getMongoStatus() {
  return {
    connected: isConnected,
    state: mongoose.connection.readyState,
    // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  };
}

export default mongoose;

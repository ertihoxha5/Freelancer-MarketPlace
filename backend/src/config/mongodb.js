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

    console.log(`✅ MongoDB connected: ${dbName}`);
    console.log(`   Host: ${mongoose.connection.host || "atlas cluster"}`);
    isConnected = true;
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    console.error(
      "   Sigurohuni që MONGO_URI në .env është i saktë (Atlas ose lokal).",
    );
  }
}

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️  MongoDB disconnected. Duke u përpjekur të rilidhemi...");
  isConnected = false;
});

mongoose.connection.on("reconnected", () => {
  console.log("✅ MongoDB reconnected.");
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

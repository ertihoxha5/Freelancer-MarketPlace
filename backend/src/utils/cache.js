import "dotenv/config";

const REDIS_URL = process.env.REDIS_URL;
let redisClient = null;
let redisConnected = false;
const inMemoryCache = new Map();

async function getRedisClient() {
  if (!REDIS_URL) {
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  try {
    const redis = await import("redis");
    redisClient = redis.createClient({ url: REDIS_URL });
    redisClient.on("error", (err) => {
      console.warn("Redis client error:", err.message);
      redisConnected = false;
    });
    await redisClient.connect();
    redisConnected = true;
    return redisClient;
  } catch (err) {
    console.warn(
      "Redis is unavailable, falling back to in-memory cache.",
      err.message,
    );
    redisClient = null;
    redisConnected = false;
    return null;
  }
}

function cleanMemoryCache() {
  const now = Date.now();
  for (const [key, entry] of inMemoryCache.entries()) {
    if (entry.expiresAt != null && entry.expiresAt <= now) {
      inMemoryCache.delete(key);
    }
  }
}

export async function getCache(key) {
  if (REDIS_URL) {
    const client = await getRedisClient();
    if (client) {
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    }
  }

  cleanMemoryCache();
  const entry = inMemoryCache.get(key);
  return entry?.value ?? null;
}

export async function setCache(key, value, ttlSeconds = 300) {
  if (REDIS_URL) {
    const client = await getRedisClient();
    if (client) {
      await client.set(key, JSON.stringify(value), {
        EX: ttlSeconds,
      });
      return;
    }
  }

  const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
  inMemoryCache.set(key, { value, expiresAt });
}

export async function deleteCache(key) {
  if (REDIS_URL) {
    const client = await getRedisClient();
    if (client) {
      await client.del(key);
      return;
    }
  }

  inMemoryCache.delete(key);
}

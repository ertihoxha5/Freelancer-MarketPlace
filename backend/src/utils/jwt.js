import jwt from "jsonwebtoken";
import "dotenv/config";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ISSUER = process.env.JWT_ISSUER || "freelancer-marketplace";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "freelancer-marketplace-api";
const JWT_ALGORITHM = "HS256";
const JWT_EXPIRES_IN = "15m";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required.");
}

const signOptions = {
  expiresIn: JWT_EXPIRES_IN,
  issuer: JWT_ISSUER,
  audience: JWT_AUDIENCE,
  algorithm: JWT_ALGORITHM,
};

const verifyOptions = {
  issuer: JWT_ISSUER,
  audience: JWT_AUDIENCE,
  algorithms: [JWT_ALGORITHM],
};

export function signAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, signOptions);
}

export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET, verifyOptions);
}

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-set-JWT_SECRET-in-production';
/** Short-lived access token when using refresh tokens (override via env). */
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';

export function signAccessToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyAccessToken(token) {
    return jwt.verify(token, JWT_SECRET);
}

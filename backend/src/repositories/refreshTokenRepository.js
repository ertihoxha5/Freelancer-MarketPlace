import { createHash } from 'node:crypto';
import { db } from '../config/db.js';

export function hashRefreshToken(raw) {
    return createHash('sha256').update(raw, 'utf8').digest('hex');
}

export async function insertRefreshToken({ userID, tokenHash, expiresAt }) {
    const [result] = await db.execute(
        'INSERT INTO RefreshTokens (userID, tokenHash, expiresAt) VALUES (?, ?, ?)',
        [userID, tokenHash, expiresAt]
    );
    return result.insertId;
}

export async function findValidRefreshTokenByHash(tokenHash) {
    const [rows] = await db.execute(
        `SELECT id, userID FROM RefreshTokens
         WHERE tokenHash = ? AND revokedAt IS NULL AND expiresAt > NOW()
         LIMIT 1`,
        [tokenHash]
    );
    return rows[0] ?? null;
}

export async function revokeRefreshTokenById(id) {
    await db.execute('UPDATE RefreshTokens SET revokedAt = NOW() WHERE id = ?', [id]);
}

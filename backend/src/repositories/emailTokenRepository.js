import { createHash } from "node:crypto";
import { db } from "../config/db.js";

export function hashEmailToken(raw) {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export async function invalidateActiveTokensForUser(userID, type) {
  await db.execute(
    `UPDATE EmailTokens
     SET usedAt = NOW()
     WHERE userID = ? AND type = ? AND usedAt IS NULL AND expiresAt > NOW()`,
    [userID, type],
  );
}

export async function insertEmailToken({ userID, tokenHash, type, expiresAt }) {
  const [result] = await db.execute(
    `INSERT INTO EmailTokens (userID, tokenHash, type, expiresAt)
     VALUES (?, ?, ?, ?)`,
    [userID, tokenHash, type, expiresAt],
  );
  return result.insertId;
}

export async function findValidEmailTokenByHash(tokenHash, type) {
  const [rows] = await db.execute(
    `SELECT id, userID, type
     FROM EmailTokens
     WHERE tokenHash = ?
       AND type = ?
       AND usedAt IS NULL
       AND expiresAt > NOW()
     LIMIT 1`,
    [tokenHash, type],
  );
  return rows[0] ?? null;
}

export async function markEmailTokenUsed(id) {
  await db.execute("UPDATE EmailTokens SET usedAt = NOW() WHERE id = ?", [id]);
}

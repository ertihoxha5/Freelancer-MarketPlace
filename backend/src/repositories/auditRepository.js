import { db } from '../config/db.js';

export async function insertAuditLog({ entity, entityID, actionPerformed, oldValue, newValue }) {
    await db.execute(
        `INSERT INTO AuditLogs (entity, entityID, actionPerformed, oldValue, newValue)
             VALUES (?, ?, ?, ?, ?)`,
        [
            entity,
            entityID,
            actionPerformed,
            String(oldValue ?? '').slice(0, 20),
            String(newValue ?? '').slice(0, 20),
        ],
    );
}

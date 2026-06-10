import { db } from '../config/db.js';
import { validationError } from '../utils/errors.js';

export async function insertAuditLog({ entity, entityID, actionPerformed, oldValue, newValue, userID = null }) {
    await db.execute(
        `INSERT INTO AuditLogs (entity, entityID, actionPerformed, oldValue, newValue, userID)
             VALUES (?, ?, ?, ?, ?, ?)`,
        [
            entity,
            entityID,
            actionPerformed,
            String(oldValue ?? '').slice(0, 2000),
            String(newValue ?? '').slice(0, 2000),
            userID,
        ],
    );
}

export async function getAuditLogs({ page = 1, limit = 50, entity = null, actionPerformed = null, fromDate = null, toDate = null } = {}) {
    const currentPage = Number(page);
    const pageSize = Number(limit);

    if (!Number.isInteger(currentPage) || currentPage < 1) {
        throw validationError('Invalid page value.');
    }
    if (!Number.isInteger(pageSize) || pageSize < 1) {
        throw validationError('Invalid limit value.');
    }

    const offset = (currentPage - 1) * pageSize;

    let where = '1=1';
    const params = [];

    if (entity) {
        where += ' AND entity = ?';
        params.push(entity);
    }
    if (actionPerformed) {
        where += ' AND actionPerformed = ?';
        params.push(actionPerformed);
    }
    if (fromDate) {
        where += ' AND createdAt >= ?';
        params.push(fromDate);
    }
    if (toDate) {
        where += ' AND createdAt <= ?';
        params.push(toDate);
    }

    const [rows] = await db.execute(
        `SELECT * FROM AuditLogs WHERE ${where} ORDER BY createdAt DESC LIMIT ${pageSize} OFFSET ${offset}`,
        params
    );

    const [[{ total }]] = await db.execute(
        `SELECT COUNT(*) as total FROM AuditLogs WHERE ${where}`,
        params
    );

    return { logs: rows, total, page: currentPage, limit: pageSize };
}

export async function deleteAuditLog(id) {
    const [result] = await db.execute(
        'DELETE FROM AuditLogs WHERE id = ?',
        [id]
    );

    if (result.affectedRows === 0) {
        const err = new Error('Audit log not found.');
        err.statusCode = 404;
        throw err;
    }

    return { id, deleted: true };
}

export async function deleteOldAuditLogs(daysOld = 90) {
    const [result] = await db.execute(
        'DELETE FROM AuditLogs WHERE createdAt < DATE_SUB(NOW(), INTERVAL ? DAY)',
        [daysOld]
    );
    return { deleted: result.affectedRows };
}

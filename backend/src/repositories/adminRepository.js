import { db } from '../config/db.js';
import { validationError } from '../utils/errors.js';

export async function getUsers({ page = 1, limit = 50 } = {}) {
    const currentPage = Number(page);
    const pageSize = Number(limit);

    if (!Number.isInteger(currentPage) || currentPage < 1) {
        throw validationError('Invalid page value.');
    }
    if (!Number.isInteger(pageSize) || pageSize < 1) {
        throw validationError('Invalid limit value.');
    }

    const offset = (currentPage - 1) * pageSize;
    const [rows] = await db.execute(
        `SELECT u.id, u.email, u.fullName, u.createdAt, u.updatedAt, ur.roleID, r.roleName
         FROM Users u
         INNER JOIN UserRole ur ON ur.userID = u.id
         INNER JOIN Roles r ON r.id = ur.roleID
         WHERE (r.roleName = 'Freelancer' OR r.roleName = 'Client') AND u.isActive = 1
         ORDER BY u.id ASC
         LIMIT ${pageSize} OFFSET ${offset}`
    );
    const [[{ total }]] = await db.execute(
        `SELECT COUNT(*) as total FROM Users u
         INNER JOIN UserRole ur ON ur.userID = u.id
         INNER JOIN Roles r ON r.id = ur.roleID
         WHERE (r.roleName = 'Freelancer' OR r.roleName = 'Client') AND u.isActive = 1`
    );
    return { users: rows, total, page: currentPage, limit: pageSize };
}

export async function deleteUser(id){
    const [result] = await db.execute(
        'UPDATE Users SET isActive = FALSE, tokenVersion = tokenVersion + 1 WHERE id = ?',
        [id]
    );

    if (result.affectedRows === 0) {
        const err = new Error('User not found.');
        err.statusCode = 404;
        throw err;
    }

    return { id, isActive: false };
}

export async function updateUser({ id, fullName, roleID }) {
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();
        const [userResult] = await conn.execute(
            'UPDATE Users SET fullName = ? WHERE id = ?',
            [fullName, id]
        );

        if (userResult.affectedRows === 0) {
            const err = new Error('User not found.');
            err.statusCode = 404;
            throw err;
        }

        const [roleResult] = await conn.execute(
            'UPDATE UserRole SET roleID = ? WHERE userID = ?',
            [roleID, id]
        );

        if (roleResult.affectedRows === 0) {
            const err = new Error('User role not found.');
            err.statusCode = 404;
            throw err;
        }

        await conn.commit();
        return { id, fullName, roleID };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

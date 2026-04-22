import { db } from '../config/db.js';

export async function getUsers() {
    const [rows] = await db.execute(
        `SELECT u.id, u.email, u.fullName, u.createdAt, u.updatedAt, ur.roleID, r.roleName
         FROM Users u
        inner JOIN UserRole ur ON ur.userID = u.id
         inner JOIN Roles r ON r.id = ur.roleID
         where (r.roleName = 'Freelancer' OR r.roleName = 'Client') and u.isActive = 1
         order by u.id ASC`
    );
    return rows;
}

export async function deleteUser(id){
    const [result] = await db.execute(
        'UPDATE Users SET isActive = FALSE WHERE id = ?',
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
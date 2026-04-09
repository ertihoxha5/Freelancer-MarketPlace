import { db } from '../config/db.js';

export async function getUsers() {
    const [rows] = await db.execute(
        `SELECT u.id, u.email, u.fullName, u.createdAt, u.updatedAt, ur.roleID, r.roleName
         FROM Users u
        inner JOIN UserRole ur ON ur.userID = u.id
         inner JOIN Roles r ON r.id = ur.roleID
         where (r.roleName = 'freelancer' OR r.roleName = 'client') and u.isActive = 1
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

export async function updateUser({ id, fullName }) {
    const [result] = await db.execute(
        'UPDATE Users SET fullName = ? WHERE id = ?',
        [fullName, id]
    );

    if (result.affectedRows === 0) {
        const err = new Error('User not found.');
        err.statusCode = 404;
        throw err;
    }

    return { id, fullName };
}
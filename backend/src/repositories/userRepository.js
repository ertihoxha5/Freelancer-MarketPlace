import { db } from '../config/db.js';

export async function findUserByEmail(email) {
    const [rows] = await db.execute('SELECT id FROM Users WHERE email = ? LIMIT 1', [email]);
    return rows[0] ?? null;
}

/** For login: password hash + role in one row. */
export async function findUserWithPasswordByEmail(email) {
    const [rows] = await db.execute(
        `SELECT u.id, u.email, u.passwordHash, u.fullName, ur.roleID
         FROM Users u
         INNER JOIN UserRole ur ON ur.userID = u.id
         WHERE u.email = ? LIMIT 1`,
        [email]
    );
    return rows[0] ?? null;
}

/** For JWT refresh: id, email, fullName, roleID (no password). */
export async function findUserWithRoleById(id) {
    const [rows] = await db.execute(
        `SELECT u.id, u.email, u.fullName, ur.roleID
         FROM Users u
         INNER JOIN UserRole ur ON ur.userID = u.id
         WHERE u.id = ? LIMIT 1`,
        [id]
    );
    return rows[0] ?? null;
}

/**
 * Inserts Users row and UserRole in one transaction.
 */
export async function createUserWithRole({ email, passwordHash, fullName, roleID }) {
    await db.beginTransaction();
    try {
        const [result] = await db.execute(
            'INSERT INTO Users (email, passwordHash, fullName) VALUES (?, ?, ?)', [email, passwordHash, fullName]
        );
        const userID = result.insertId;
        await db.execute('INSERT INTO UserRole (userID, roleID) VALUES (?, ?)', [userID, roleID]);
        await db.commit();
        return { userID, email, fullName, roleID };
    } catch (err) {
        await db.rollback();
        throw err;
    }
}

/**
 * Updates user password
 */

export async function changePassword({email, passwordHash}){
    try{
        const [result] = await db.execute('UPDATE Users SET passwordHash = ? WHERE email = ?', [passwordHash, email])
        
        if (result.affectedRows === 0) {
            const err = new Error('No matching user to update.');
            err.statusCode = 404; // or 409, whatever matches your API
            throw err;
        }
        return { email };
    } catch (err) {
        throw err;
    }
}

import { db } from '../config/db.js';

export async function findUserByEmail(email) {
    const [rows] = await db.execute('SELECT id FROM Users WHERE email = ? LIMIT 1', [email]);
    return rows[0] ?? null;
}

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


export async function createUserWithRole({ email, passwordHash, fullName, roleID }) {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const [result] = await conn.execute(
            'INSERT INTO Users (email, passwordHash, fullName) VALUES (?, ?, ?)', [email, passwordHash, fullName]
        );
        const userID = result.insertId;
        await conn.execute('INSERT INTO UserRole (userID, roleID) VALUES (?, ?)', [userID, roleID]);
        await conn.execute(
            `INSERT INTO Profiles (userID, pictureID, hourlyRate, portofoliUrl, bio)
             VALUES (?, NULL, NULL, NULL, NULL)`,
            [userID],
        );
        await conn.commit();
        return { userID, email, fullName, roleID };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}



export async function changePassword({email, passwordHash}){
    try{
        const [result] = await db.execute('UPDATE Users SET passwordHash = ? WHERE email = ?', [passwordHash, email])
        
        if (result.affectedRows === 0) {
            const err = new Error('No matching user to update.');
            err.statusCode = 404; 
            throw err;
        }
        return { email };
    } catch (err) {
        throw err;
    }
}

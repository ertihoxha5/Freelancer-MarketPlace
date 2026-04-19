import { db } from '../config/db.js';

export async function findProfileByUserId(userID) {
    const [rows] = await db.execute(
        `SELECT
             p.id,
             p.userID,
             p.pictureID,
             p.hourlyRate,
             p.portofoliUrl,
             p.bio,
             f.filePath AS picturePath
         FROM Profiles p
         LEFT JOIN Files f ON f.id = p.pictureID
         WHERE p.userID = ?
         LIMIT 1`,
        [userID],
    );
    return rows[0] ?? null;
}

export async function createProfileForUser(userID) {
    const [result] = await db.execute(
        `INSERT INTO Profiles (userID, pictureID, hourlyRate, portofoliUrl, bio)
             VALUES (?, NULL, NULL, NULL, NULL)`,
        [userID],
    );
    return {
        id: result.insertId,
        userID,
        pictureID: null,
        hourlyRate: null,
        portofoliUrl: null,
        bio: null,
    };
}

export async function updateProfileByUserId(userID, { pictureID, hourlyRate, portofoliUrl, bio }) {
    const [result] = await db.execute(
        `UPDATE Profiles
             SET pictureID = ?,
                 hourlyRate = ?,
                 portofoliUrl = ?,
                 bio = ?
             WHERE userID = ?`,
        [
            pictureID ?? null,
            hourlyRate ?? null,
            portofoliUrl ?? null,
            bio ?? null,
            userID,
        ],
    );

    if (result.affectedRows === 0) {
        const err = new Error('Profile not found.');
        err.statusCode = 404;
        throw err;
    }

    return findProfileByUserId(userID);
}

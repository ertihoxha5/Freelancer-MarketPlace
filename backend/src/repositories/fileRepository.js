import { db } from '../config/db.js';

export async function createFile({ entity, entityID, nameFile, filePath, fileSize, uploadedBy }) {
    const [result] = await db.execute(
        `INSERT INTO Files (entity, entityID, nameFile, filePath, fileSize, uploadedBy)
             VALUES (?, ?, ?, ?, ?, ?)`,
        [entity, entityID, nameFile, filePath, fileSize, uploadedBy],
    );
    return {
        id: result.insertId,
        entity,
        entityID,
        nameFile,
        filePath,
        fileSize,
        uploadedBy,
    };
}

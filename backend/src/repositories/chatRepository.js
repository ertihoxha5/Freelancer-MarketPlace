import { db } from '../config/db.js';

export async function findProjectParties(projectID) {
    const [rows] = await db.execute(
        `SELECT p.id, p.clientID, pr.userID AS freelancerID
         FROM Project p
         INNER JOIN Proposal pr ON pr.projectID = p.id AND pr.propStatus = 'accepted'
         WHERE p.id = ?
         LIMIT 1`,
        [projectID],
    );
    return rows[0] ?? null;
}

export async function findConversationByProjectAndParties(projectID, clientID, freelancerID) {
    const [rows] = await db.execute(
        `SELECT id,
                CASE WHEN projectID IS NULL THEN 'direct' ELSE 'project' END AS conversationType,
                projectID, clientID, freelancerID, cStatus, createdAt, lastMessageAt
         FROM Conversations
         WHERE projectID = ? AND clientID = ? AND freelancerID = ?
         LIMIT 1`,
        [projectID, clientID, freelancerID],
    );
    return rows[0] ?? null;
}

export async function createConversation({ projectID, clientID, freelancerID }) {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const [result] = await conn.execute(
            `INSERT INTO Conversations (projectID, clientID, freelancerID, cStatus, lastMessageAt)
             VALUES (?, ?, ?, 'active', NOW())`,
            [projectID, clientID, freelancerID],
        );
        const conversationID = result.insertId;

        await conn.execute(
            `INSERT IGNORE INTO ConversationParticipants (conversationID, userID, roleInConversation)
             VALUES (?, ?, 'owner'), (?, ?, 'member')`,
            [conversationID, clientID, conversationID, freelancerID],
        );
        await conn.commit();
        return conversationID;
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

export async function findActiveUserById(userID) {
    const [rows] = await db.execute(
        `SELECT id, fullName, email
         FROM Users
         WHERE id = ? AND isActive = 1
         LIMIT 1`,
        [userID],
    );
    return rows[0] ?? null;
}

export async function searchUsersByNameOrEmail({ requesterID, query }) {
    const pattern = `%${query}%`;
    const [rows] = await db.execute(
        `SELECT u.id, u.fullName, u.email, ur.roleID
         FROM Users u
         INNER JOIN UserRole ur ON ur.userID = u.id
         WHERE u.isActive = 1
           AND u.id <> ?
           AND (u.fullName LIKE ? OR u.email LIKE ?)
         ORDER BY u.fullName ASC
         LIMIT 15`,
        [requesterID, pattern, pattern],
    );
    return rows;
}

export async function findDirectConversationBetweenUsers(userAID, userBID) {
    const [rows] = await db.execute(
        `SELECT c.id,
                CASE WHEN c.projectID IS NULL THEN 'direct' ELSE 'project' END AS conversationType,
                c.projectID, c.clientID, c.freelancerID, c.cStatus, c.createdAt, c.lastMessageAt
         FROM Conversations c
         INNER JOIN ConversationParticipants cp1 ON cp1.conversationID = c.id AND cp1.userID = ? AND cp1.leftAt IS NULL
         INNER JOIN ConversationParticipants cp2 ON cp2.conversationID = c.id AND cp2.userID = ? AND cp2.leftAt IS NULL
         WHERE c.projectID IS NULL
         LIMIT 1`,
        [userAID, userBID],
    );
    return rows[0] ?? null;
}

export async function createDirectConversation({ userAID, userBID }) {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const [result] = await conn.execute(
            `INSERT INTO Conversations (projectID, clientID, freelancerID, cStatus, lastMessageAt)
             VALUES (NULL, ?, ?, 'active', NOW())`,
            [userAID, userBID],
        );
        const conversationID = result.insertId;

        await conn.execute(
            `INSERT INTO ConversationParticipants (conversationID, userID, roleInConversation)
             VALUES (?, ?, 'owner'), (?, ?, 'member')`,
            [conversationID, userAID, conversationID, userBID],
        );

        await conn.commit();
        return conversationID;
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

export async function getConversationByIdForUser(conversationID, userID) {
    const [rows] = await db.execute(
        `SELECT c.id,
                CASE WHEN c.projectID IS NULL THEN 'direct' ELSE 'project' END AS conversationType,
                c.projectID, c.clientID, c.freelancerID, c.cStatus, c.createdAt, c.lastMessageAt
         FROM Conversations c
         INNER JOIN ConversationParticipants cp ON cp.conversationID = c.id
         WHERE c.id = ? AND cp.userID = ? AND cp.leftAt IS NULL
         LIMIT 1`,
        [conversationID, userID],
    );
    return rows[0] ?? null;
}

export async function getConversationParticipants(conversationID) {
    const [rows] = await db.execute(
        `SELECT cp.userID, u.fullName, cp.roleInConversation
         FROM ConversationParticipants cp
         INNER JOIN Users u ON u.id = cp.userID
         WHERE cp.conversationID = ? AND cp.leftAt IS NULL
         ORDER BY cp.userID ASC`,
        [conversationID],
    );
    return rows;
}

export async function listConversationsForUser(userID) {
    const [rows] = await db.execute(
        `SELECT c.id,
                CASE WHEN c.projectID IS NULL THEN 'direct' ELSE 'project' END AS conversationType,
                c.projectID, c.clientID, c.freelancerID, c.cStatus, c.createdAt, c.lastMessageAt,
                (
                    SELECT m.content
                    FROM Messages m
                    WHERE m.conversationID = c.id AND m.isDeleted = FALSE
                    ORDER BY m.id DESC
                    LIMIT 1
                ) AS lastMessagePreview,
                (
                    SELECT u2.fullName
                    FROM ConversationParticipants cp2
                    INNER JOIN Users u2 ON u2.id = cp2.userID
                    WHERE cp2.conversationID = c.id
                      AND cp2.userID <> ?
                      AND cp2.leftAt IS NULL
                    LIMIT 1
                ) AS peerName
         FROM Conversations c
         INNER JOIN ConversationParticipants cp ON cp.conversationID = c.id
         WHERE cp.userID = ? AND cp.leftAt IS NULL
         ORDER BY COALESCE(c.lastMessageAt, c.createdAt) DESC`,
        [userID, userID],
    );
    return rows;
}

export async function listMessages(conversationID, limit, beforeID) {
    const conversationIdNum = Number(conversationID);
    const limitNum = Number(limit);
    const beforeIdNum = beforeID == null ? null : Number(beforeID);

    let sql = `SELECT m.id, m.conversationID, m.senderID, m.content, m.msgType, m.\`field\` AS field, m.isDeleted, m.sentAt,
                      u.fullName AS senderName
               FROM Messages m
               INNER JOIN Users u ON u.id = m.senderID
               WHERE m.conversationID = ?`;
    const params = [conversationIdNum];

    if (beforeIdNum != null) {
        sql += ' AND m.id < ?';
        params.push(beforeIdNum);
    }

    sql += ` ORDER BY m.id DESC LIMIT ${limitNum}`;

    const [rows] = await db.query(sql, params);
    return rows.reverse();
}

export async function createMessage({ conversationID, senderID, content, msgType = 'text', field = null }) {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [result] = await conn.execute(
            `INSERT INTO Messages (conversationID, senderID, content, msgType, \`field\`, isRead, isDeleted, deliveredAt, sentAt)
             VALUES (?, ?, ?, ?, ?, FALSE, FALSE, NULL, NOW())`,
            [conversationID, senderID, content, msgType, field],
        );
        const messageID = result.insertId;

        const [participantRows] = await conn.execute(
            `SELECT userID
             FROM ConversationParticipants
             WHERE conversationID = ? AND leftAt IS NULL`,
            [conversationID],
        );

        for (const participant of participantRows) {
            await conn.execute(
                `INSERT INTO MessageStatus (messageID, userID, deliveredAt, readAt)
                 VALUES (?, ?, CASE WHEN ? = ? THEN NOW() ELSE NULL END, CASE WHEN ? = ? THEN NOW() ELSE NULL END)`,
                [messageID, participant.userID, participant.userID, senderID, participant.userID, senderID],
            );
        }

        await conn.execute(
            `UPDATE Conversations
             SET lastMessageAt = NOW()
             WHERE id = ?`,
            [conversationID],
        );

        const [rows] = await conn.execute(
            `SELECT m.id, m.conversationID, m.senderID, m.content, m.msgType, m.\`field\` AS field, m.isDeleted, m.sentAt,
                    u.fullName AS senderName
             FROM Messages m
             INNER JOIN Users u ON u.id = m.senderID
             WHERE m.id = ?
             LIMIT 1`,
            [messageID],
        );

        await conn.commit();
        return rows[0];
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

export async function markConversationRead(conversationID, userID) {
    const [result] = await db.execute(
        `UPDATE MessageStatus ms
         INNER JOIN Messages m ON m.id = ms.messageID
         SET ms.readAt = COALESCE(ms.readAt, NOW()),
             ms.deliveredAt = COALESCE(ms.deliveredAt, NOW())
         WHERE m.conversationID = ? AND ms.userID = ?`,
        [conversationID, userID],
    );
    return result.affectedRows;
}

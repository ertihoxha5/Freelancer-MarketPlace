import mysql2 from 'mysql2/promise';
import fs from 'fs/promises';
import 'dotenv/config';

const schemaUrl = new URL('./schema.sql', import.meta.url);

const {
  DB_HOST,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
} = process.env;

async function ensureDatabaseFromSchema() {
  const rootConn = await mysql2.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  });

  try {
    const [rows] = await rootConn.query(
      'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
      [DB_NAME]
    );

    if (rows.length === 0) {
      console.log(`Database "${DB_NAME}" not found. Creating from schema.sql...`);
      const schemaSql = await fs.readFile(schemaUrl, 'utf8');
      await rootConn.query(schemaSql);
      console.log(`Database "${DB_NAME}" created and initialized.`);
    } else {
      console.log(`Database "${DB_NAME}" already exists.`);
    }
  } finally {
    await rootConn.end();
  }
}

async function ensureChatSchema(pool) {
  async function columnExists(tableName, columnName) {
    const [rows] = await pool.query(
      `SELECT 1
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = ?
         AND COLUMN_NAME = ?
       LIMIT 1`,
      [DB_NAME, tableName, columnName]
    );
    return rows.length > 0;
  }

  async function indexExists(tableName, indexName) {
    const [rows] = await pool.query(
      `SELECT 1
       FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = ?
         AND INDEX_NAME = ?
       LIMIT 1`,
      [DB_NAME, tableName, indexName]
    );
    return rows.length > 0;
  }

  await pool.query(`
    ALTER TABLE Messages
    MODIFY COLUMN content TEXT NOT NULL
  `);

  if (!(await columnExists('Messages', 'deliveredAt'))) {
    await pool.query(`
      ALTER TABLE Messages
      ADD COLUMN deliveredAt DATETIME NULL AFTER isDeleted
    `);
  }

  if (!(await indexExists('Messages', 'idx_messages_conversation_sent'))) {
    await pool.query(`
      ALTER TABLE Messages
      ADD INDEX idx_messages_conversation_sent (conversationID, sentAt)
    `);
  }

  if (!(await columnExists('Conversations', 'lastMessageAt'))) {
    await pool.query(`
      ALTER TABLE Conversations
      ADD COLUMN lastMessageAt DATETIME NULL AFTER createdAt
    `);
  }

  if (!(await columnExists('Conversations', 'conversationType'))) {
    await pool.query(`
      ALTER TABLE Conversations
      ADD COLUMN conversationType ENUM('project', 'direct') NOT NULL DEFAULT 'project' AFTER id
    `);
  }

  await pool.query(`
    ALTER TABLE Conversations
    MODIFY COLUMN projectID INT NULL,
    MODIFY COLUMN clientID INT NULL,
    MODIFY COLUMN freelancerID INT NULL
  `);

  if (!(await indexExists('Conversations', 'idx_conversations_status_last'))) {
    await pool.query(`
      ALTER TABLE Conversations
      ADD INDEX idx_conversations_status_last (cStatus, lastMessageAt)
    `);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ConversationParticipants (
      id INT PRIMARY KEY AUTO_INCREMENT,
      conversationID INT NOT NULL,
      userID INT NOT NULL,
      roleInConversation ENUM('owner', 'member') NOT NULL DEFAULT 'member',
      joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      leftAt DATETIME NULL,
      FOREIGN KEY (conversationID) REFERENCES Conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (userID) REFERENCES Users(id) ON DELETE CASCADE,
      UNIQUE KEY uniq_conversation_user (conversationID, userID),
      KEY idx_participants_user (userID)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS MessageStatus (
      id INT PRIMARY KEY AUTO_INCREMENT,
      messageID INT NOT NULL,
      userID INT NOT NULL,
      deliveredAt DATETIME NULL,
      readAt DATETIME NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (messageID) REFERENCES Messages(id) ON DELETE CASCADE,
      FOREIGN KEY (userID) REFERENCES Users(id) ON DELETE CASCADE,
      UNIQUE KEY uniq_message_user (messageID, userID),
      KEY idx_status_user_unread (userID, readAt)
    )
  `);

  await pool.query(`
    INSERT IGNORE INTO ConversationParticipants (conversationID, userID, roleInConversation)
    SELECT id, clientID, 'owner' FROM Conversations
  `);

  await pool.query(`
    INSERT IGNORE INTO ConversationParticipants (conversationID, userID, roleInConversation)
    SELECT id, freelancerID, 'member' FROM Conversations
  `);
}

await ensureDatabaseFromSchema();

export const db = mysql2.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
});

await ensureChatSchema(db);
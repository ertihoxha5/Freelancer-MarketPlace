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
      console.info(`Database "${DB_NAME}" not found. Creating from schema.sql...`);
      const schemaSql = await fs.readFile(schemaUrl, 'utf8');
      await rootConn.query(schemaSql);
      console.info(`Database "${DB_NAME}" created and initialized.`);
    } else {
      console.info(`Database "${DB_NAME}" already exists.`);
    }
  } finally {
    await rootConn.end();
  }
}

async function columnExists(pool, tableName, columnName) {
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

async function indexExists(pool, tableName, indexName) {
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

async function ensureProposalSchema(pool) {
  if (!(await columnExists(pool, 'Proposal', 'bidAmount'))) {
    await pool.query(`
      ALTER TABLE Proposal
      ADD COLUMN bidAmount DECIMAL(12,2) NULL
    `);
  }

  if (!(await columnExists(pool, 'Proposal', 'estimatedDays'))) {
    await pool.query(`
      ALTER TABLE Proposal
      ADD COLUMN estimatedDays INT NULL
    `);
  }

  if (!(await columnExists(pool, 'Proposal', 'isDeleted'))) {
    await pool.query(`
      ALTER TABLE Proposal
      ADD COLUMN isDeleted BOOLEAN NOT NULL DEFAULT FALSE
    `);
  }

  if (!(await columnExists(pool, 'Proposal', 'attachmentID'))) {
    await pool.query(`
      ALTER TABLE Proposal
      ADD COLUMN attachmentID INT NULL
    `);
  }

  if (!(await columnExists(pool, 'Proposal', 'reviewedAt'))) {
    await pool.query(`
      ALTER TABLE Proposal
      ADD COLUMN reviewedAt TIMESTAMP NULL
    `);
  }

  if (!(await columnExists(pool, 'Proposal', 'reviewedBy'))) {
    await pool.query(`
      ALTER TABLE Proposal
      ADD COLUMN reviewedBy INT NULL
    `);
  }

  if (!(await columnExists(pool, 'Proposal', 'notes'))) {
    await pool.query(`
      ALTER TABLE Proposal
      ADD COLUMN notes TEXT NULL
    `);
  }
}

async function ensureChatSchema(pool) {

  await pool.query(`
    ALTER TABLE Messages
    MODIFY COLUMN content TEXT NOT NULL
  `);

  if (!(await columnExists(pool, 'Messages', 'deliveredAt'))) {
    await pool.query(`
      ALTER TABLE Messages
      ADD COLUMN deliveredAt DATETIME NULL AFTER isDeleted
    `);
  }

  if (!(await indexExists(pool, 'Messages', 'idx_messages_conversation_sent'))) {
    await pool.query(`
      ALTER TABLE Messages
      ADD INDEX idx_messages_conversation_sent (conversationID, sentAt)
    `);
  }

  if (!(await columnExists(pool, 'Conversations', 'lastMessageAt'))) {
    await pool.query(`
      ALTER TABLE Conversations
      ADD COLUMN lastMessageAt DATETIME NULL AFTER createdAt
    `);
  }

  if (!(await columnExists(pool, 'Conversations', 'conversationType'))) {
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

  if (!(await indexExists(pool, 'Conversations', 'idx_conversations_status_last'))) {
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

async function ensureContractSchema(pool) {
  if (!(await columnExists(pool, 'Contracts', 'startDate'))) {
    await pool.query(`
      ALTER TABLE Contracts
      ADD COLUMN startDate DATE NULL
    `);
  }

  if (!(await columnExists(pool, 'Contracts', 'endDate'))) {
    await pool.query(`
      ALTER TABLE Contracts
      ADD COLUMN endDate DATE NULL
    `);
  }

  // Contracts.clientID and Contracts.freelancerID are expected to reference Users
  // in fresh schemas. Existing databases may already have those constraints.
}

async function ensureBusinessEntitySchema(pool) {
  await pool.query(`
    ALTER TABLE Milestones
    MODIFY title VARCHAR(100) NOT NULL,
    MODIFY mDesc TEXT NOT NULL
  `);

  await pool.query(`
    ALTER TABLE Review
    MODIFY comment TEXT NOT NULL
  `);
}

async function ensureFullTextIndexes(pool) {
  if (!(await indexExists(pool, 'Project', 'idx_project_search'))) {
    try {
      await pool.query(`
        ALTER TABLE Project
        ADD FULLTEXT idx_project_search (title, pDesc)
      `);
    } catch {}
  }

  if (!(await indexExists(pool, 'Users', 'idx_user_search'))) {
    try {
      await pool.query(`
        ALTER TABLE Users
        ADD FULLTEXT idx_user_search (fullName, email)
      `);
    } catch {}
  }
}

try {
  await ensureDatabaseFromSchema();
} catch (err) {
  console.error("❌ Failed to initialize database schema:", err.message);
  process.exit(1);
}

export const db = mysql2.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
});

try {
  await ensureProposalSchema(db);
  await ensureChatSchema(db);
  await ensureContractSchema(db);
  await ensureBusinessEntitySchema(db);
  await ensureFullTextIndexes(db);
} catch (err) {
  console.error("❌ Failed to apply database migrations:", err.message);
  process.exit(1);
}

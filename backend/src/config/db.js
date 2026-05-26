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

async function tableExists(pool, tableName) {
  const [rows] = await pool.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = ?
     LIMIT 1`,
    [DB_NAME, tableName],
  );
  return rows.length > 0;
}

async function ensureUserAuthSchema(pool) {
  if (!(await columnExists(pool, 'Users', 'tokenVersion'))) {
    await pool.query(`
      ALTER TABLE Users
      ADD COLUMN tokenVersion INT NOT NULL DEFAULT 0 AFTER isActive
    `);
  }

  if (!(await columnExists(pool, 'Users', 'emailVerified'))) {
    await pool.query(`
      ALTER TABLE Users
      ADD COLUMN emailVerified BOOLEAN NOT NULL DEFAULT FALSE AFTER isActive,
      ADD COLUMN emailVerifiedAt DATETIME NULL AFTER emailVerified
    `);
    await pool.query(`
      UPDATE Users SET emailVerified = TRUE, emailVerifiedAt = NOW()
      WHERE emailVerified = FALSE
    `);
  }

  if (!(await tableExists(pool, 'EmailTokens'))) {
    await pool.query(`
      CREATE TABLE EmailTokens(
        id INT PRIMARY KEY AUTO_INCREMENT,
        userID INT NOT NULL,
        tokenHash VARCHAR(255) NOT NULL,
        type ENUM('email_verification', 'password_reset') NOT NULL,
        expiresAt DATETIME NOT NULL,
        usedAt DATETIME NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userID) REFERENCES Users(id) ON DELETE CASCADE,
        UNIQUE KEY uq_email_tokens_hash (tokenHash),
        INDEX idx_email_tokens_user_type (userID, type)
      )
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

async function ensurePaymentSchema(pool) {
  let paymentTableExists = await tableExists(pool, "Payment");
  const hasStripeColumn = paymentTableExists
    ? await columnExists(pool, "Payment", "stripePaymentIntentId")
    : false;

  if (paymentTableExists && !hasStripeColumn) {
    await pool.query("RENAME TABLE Payment TO Payment_legacy");
    paymentTableExists = false;
  }

  if (!paymentTableExists) {
    await pool.query(`
      CREATE TABLE Payment(
        id INT PRIMARY KEY AUTO_INCREMENT,
        contractID INT NOT NULL,
        milestoneID INT NULL,
        amount INT NOT NULL,
        currency CHAR(3) NOT NULL DEFAULT 'usd',
        pStatus ENUM(
          'pending',
          'processing',
          'succeeded',
          'failed',
          'canceled',
          'refunded'
        ) NOT NULL DEFAULT 'pending',
        stripePaymentIntentId VARCHAR(255) NULL,
        metadata JSON NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (contractID) REFERENCES Contracts(id) ON DELETE CASCADE,
        FOREIGN KEY (milestoneID) REFERENCES Milestones(id) ON DELETE SET NULL,
        UNIQUE KEY uq_payment_stripe_intent (stripePaymentIntentId),
        INDEX idx_payment_status (pStatus),
        INDEX idx_payment_contract (contractID),
        INDEX idx_payment_created (createdAt DESC)
      )
    `);
  }

  if (!(await tableExists(pool, "MilestonePayment"))) {
    await pool.query(`
      CREATE TABLE MilestonePayment(
        id INT PRIMARY KEY AUTO_INCREMENT,
        milestoneID INT NOT NULL UNIQUE,
        paymentID INT NOT NULL,
        amount INT NOT NULL,
        pStatus ENUM('held', 'released', 'refunded') NOT NULL DEFAULT 'held',
        releasedAt DATETIME NULL,
        releasedBy INT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (milestoneID) REFERENCES Milestones(id) ON DELETE CASCADE,
        FOREIGN KEY (paymentID) REFERENCES Payment(id) ON DELETE CASCADE,
        FOREIGN KEY (releasedBy) REFERENCES Users(id) ON DELETE SET NULL,
        INDEX idx_milestone_payment_status (pStatus)
      )
    `);
  }
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
  await ensureUserAuthSchema(db);
  await ensureProposalSchema(db);
  await ensureChatSchema(db);
  await ensureContractSchema(db);
  await ensureBusinessEntitySchema(db);
  await ensurePaymentSchema(db);
  await ensureFullTextIndexes(db);
} catch (err) {
  console.error("❌ Failed to apply database migrations:", err.message);
  process.exit(1);
}

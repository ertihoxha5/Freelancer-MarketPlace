import mysql2 from "mysql2/promise";
import fs from "fs/promises";
import "dotenv/config";

const schemaUrl = new URL("./schema.sql", import.meta.url);

const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

async function ensureDatabaseFromSchema() {
  const rootConn = await mysql2.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  });

  try {
    const [rows] = await rootConn.query(
      "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?",
      [DB_NAME],
    );

    if (rows.length === 0) {
      console.info(
        `Database "${DB_NAME}" not found. Creating from schema.sql...`,
      );
      const schemaSql = await fs.readFile(schemaUrl, "utf8");
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
    [DB_NAME, tableName, columnName],
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
    [DB_NAME, tableName, indexName],
  );
  return rows.length > 0;
}

async function ensureProposalSchema(pool) {
  if (!(await columnExists(pool, "Proposal", "bidAmount"))) {
    await pool.query(`
      ALTER TABLE Proposal
      ADD COLUMN bidAmount DECIMAL(12,2) NULL
    `);
  }

  if (!(await columnExists(pool, "Proposal", "estimatedDays"))) {
    await pool.query(`
      ALTER TABLE Proposal
      ADD COLUMN estimatedDays INT NULL
    `);
  }

  if (!(await columnExists(pool, "Proposal", "isDeleted"))) {
    await pool.query(`
      ALTER TABLE Proposal
      ADD COLUMN isDeleted BOOLEAN NOT NULL DEFAULT FALSE
    `);
  }

  if (!(await columnExists(pool, "Proposal", "attachmentID"))) {
    await pool.query(`
      ALTER TABLE Proposal
      ADD COLUMN attachmentID INT NULL
    `);
  }

  if (!(await columnExists(pool, "Proposal", "reviewedAt"))) {
    await pool.query(`
      ALTER TABLE Proposal
      ADD COLUMN reviewedAt TIMESTAMP NULL
    `);
  }

  if (!(await columnExists(pool, "Proposal", "reviewedBy"))) {
    await pool.query(`
      ALTER TABLE Proposal
      ADD COLUMN reviewedBy INT NULL
    `);
  }

  if (!(await columnExists(pool, "Proposal", "notes"))) {
    await pool.query(`
      ALTER TABLE Proposal
      ADD COLUMN notes TEXT NULL
    `);
  }

  if (!(await columnExists(pool, "Proposal", "attachmentID"))) {
    await pool.query(`
      ALTER TABLE Proposal
      ADD COLUMN attachmentID INT NULL
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
  if (!(await columnExists(pool, "Users", "tokenVersion"))) {
    await pool.query(`
      ALTER TABLE Users
      ADD COLUMN tokenVersion INT NOT NULL DEFAULT 0 AFTER isActive
    `);
  }

  if (!(await columnExists(pool, "Users", "emailVerified"))) {
    await pool.query(`
      ALTER TABLE Users
      ADD COLUMN emailVerified BOOLEAN NOT NULL DEFAULT TRUE AFTER isActive,
      ADD COLUMN emailVerifiedAt DATETIME NULL AFTER emailVerified
    `);
  }

  await pool.query(`
    UPDATE Users SET emailVerified = TRUE, emailVerifiedAt = COALESCE(emailVerifiedAt, NOW())
    WHERE emailVerified = FALSE
  `);
  try { await pool.query(`ALTER TABLE Users MODIFY COLUMN fullName VARCHAR(255) NOT NULL`); } catch {}
  try { await pool.query(`ALTER TABLE Users MODIFY COLUMN email VARCHAR(255) UNIQUE NOT NULL`); } catch {}
  try { await pool.query(`ALTER TABLE Notifications MODIFY COLUMN title VARCHAR(255) NOT NULL`); } catch {}
  try { await pool.query(`ALTER TABLE Notifications MODIFY COLUMN msg TEXT`); } catch {}
  try { await pool.query(`ALTER TABLE Profiles MODIFY COLUMN bio TEXT`); } catch {}
  try { await pool.query(`ALTER TABLE Profiles MODIFY COLUMN portofoliUrl VARCHAR(500)`); } catch {}
  if (!(await tableExists(pool, "AuditLogs"))) {
  } else {
    if (!(await columnExists(pool, "AuditLogs", "userID"))) {
      await pool.query(`ALTER TABLE AuditLogs ADD COLUMN userID INT NULL AFTER newValue`);
    }
    try { await pool.query(`ALTER TABLE AuditLogs MODIFY COLUMN oldValue TEXT NOT NULL`); } catch {}
    try { await pool.query(`ALTER TABLE AuditLogs MODIFY COLUMN newValue TEXT NOT NULL`); } catch {}
  }

  if (!(await tableExists(pool, "EmailTokens"))) {
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

async function ensureCategorySchema(pool) {
  if (!(await columnExists(pool, "Categories", "slug"))) {
    await pool.query(`
      ALTER TABLE Categories
      ADD COLUMN slug VARCHAR(50) NULL AFTER cName
    `);
    await pool.query(`
      UPDATE Categories
      SET slug = CONCAT('category-', id)
      WHERE slug IS NULL OR slug = ''
    `);
    await pool.query(`
      ALTER TABLE Categories
      MODIFY COLUMN slug VARCHAR(50) NOT NULL
    `);
  }

  if (!(await columnExists(pool, "Categories", "iconUrl"))) {
    await pool.query(`
      ALTER TABLE Categories
      ADD COLUMN iconUrl VARCHAR(255) NULL AFTER cDesc
    `);
  }

  if (!(await columnExists(pool, "Categories", "sortOrder"))) {
    await pool.query(`
      ALTER TABLE Categories
      ADD COLUMN sortOrder INT NOT NULL DEFAULT 0 AFTER iconUrl
    `);
  }

  if (!(await columnExists(pool, "Categories", "parentCategoryID"))) {
    await pool.query(`
      ALTER TABLE Categories
      ADD COLUMN parentCategoryID INT NULL AFTER sortOrder,
      ADD INDEX idx_categories_parent (parentCategoryID)
    `);
  }

  if (!(await columnExists(pool, "Categories", "updatedAt"))) {
    await pool.query(`
      ALTER TABLE Categories
      ADD COLUMN updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER createdAt
    `);
  }

  try {
    await pool.query(`
      ALTER TABLE Categories
      ADD UNIQUE KEY uq_categories_name (cName)
    `);
  } catch {}

  try {
    await pool.query(`
      ALTER TABLE Categories
      ADD UNIQUE KEY uq_categories_slug (slug)
    `);
  } catch {}

  try {
    await pool.query(`
      ALTER TABLE Categories
      ADD CONSTRAINT fk_categories_parent
      FOREIGN KEY (parentCategoryID) REFERENCES Categories(id) ON DELETE SET NULL
    `);
  } catch {}
  try { await pool.query(`ALTER TABLE Categories MODIFY COLUMN cName VARCHAR(255) NOT NULL`); } catch {}
  try { await pool.query(`ALTER TABLE Categories MODIFY COLUMN cDesc TEXT NOT NULL`); } catch {}
  try { await pool.query(`ALTER TABLE Categories MODIFY COLUMN slug VARCHAR(255) NOT NULL`); } catch {}
}

async function ensureChatSchema(pool) {
  await pool.query(`
    ALTER TABLE Messages
    MODIFY COLUMN content TEXT NOT NULL
  `);

  if (!(await columnExists(pool, "Messages", "deliveredAt"))) {
    await pool.query(`
      ALTER TABLE Messages
      ADD COLUMN deliveredAt DATETIME NULL AFTER isDeleted
    `);
  }

  if (
    !(await indexExists(pool, "Messages", "idx_messages_conversation_sent"))
  ) {
    await pool.query(`
      ALTER TABLE Messages
      ADD INDEX idx_messages_conversation_sent (conversationID, sentAt)
    `);
  }

  if (!(await columnExists(pool, "Conversations", "lastMessageAt"))) {
    await pool.query(`
      ALTER TABLE Conversations
      ADD COLUMN lastMessageAt DATETIME NULL AFTER createdAt
    `);
  }

  if (!(await columnExists(pool, "Conversations", "conversationType"))) {
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

  if (
    !(await indexExists(pool, "Conversations", "idx_conversations_status_last"))
  ) {
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
  if (!(await columnExists(pool, "Contracts", "startDate"))) {
    await pool.query(`
      ALTER TABLE Contracts
      ADD COLUMN startDate DATE NULL
    `);
  }

  if (!(await columnExists(pool, "Contracts", "endDate"))) {
    await pool.query(`
      ALTER TABLE Contracts
      ADD COLUMN endDate DATE NULL
    `);
  }

  if (!(await columnExists(pool, "Contracts", "clientSignedAt"))) {
    await pool.query(`
      ALTER TABLE Contracts
      ADD COLUMN clientSignedAt DATETIME NULL
    `);
  }

  if (!(await columnExists(pool, "Contracts", "freelancerSignedAt"))) {
    await pool.query(`
      ALTER TABLE Contracts
      ADD COLUMN freelancerSignedAt DATETIME NULL
    `);
  }
}

async function ensureWorkspaceSchema(pool) {
  if (!(await tableExists(pool, "WorkspaceTodos"))) {
    await pool.query(`
      CREATE TABLE WorkspaceTodos (
        id INT PRIMARY KEY AUTO_INCREMENT,
        contractID INT NULL,
        projectID INT NULL,
        freelancerID INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        status ENUM('todo', 'in_progress', 'done') NOT NULL DEFAULT 'todo',
        dueDate DATE NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (contractID) REFERENCES Contracts(id) ON DELETE CASCADE,
        FOREIGN KEY (projectID) REFERENCES Project(id) ON DELETE CASCADE,
        FOREIGN KEY (freelancerID) REFERENCES Users(id) ON DELETE CASCADE
      )
    `);
  } else {
    if (!(await columnExists(pool, "WorkspaceTodos", "projectID"))) {
      await pool.query(`ALTER TABLE WorkspaceTodos ADD COLUMN projectID INT NULL AFTER contractID`);
      await pool.query(`
        UPDATE WorkspaceTodos wt
        JOIN Contracts c ON c.id = wt.contractID
        JOIN Proposal pr ON pr.id = c.proposalID
        SET wt.projectID = pr.projectID
        WHERE wt.projectID IS NULL
      `);
    }
  }
  if (!(await tableExists(pool, "WorkspaceSections"))) {
    await pool.query(`
      CREATE TABLE WorkspaceSections (
        id INT PRIMARY KEY AUTO_INCREMENT,
        contractID INT NULL,
        projectID INT NULL,
        freelancerID INT NOT NULL,
        sectionKey VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        type ENUM('note', 'checklist', 'progress', 'links') NOT NULL DEFAULT 'note',
        content TEXT NULL,
        items JSON NULL,
        visible BOOLEAN NOT NULL DEFAULT TRUE,
        sortOrder INT NOT NULL DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (contractID) REFERENCES Contracts(id) ON DELETE CASCADE,
        FOREIGN KEY (projectID) REFERENCES Project(id) ON DELETE CASCADE,
        FOREIGN KEY (freelancerID) REFERENCES Users(id) ON DELETE CASCADE,
        UNIQUE KEY uq_section (projectID, sectionKey)
      )
    `);
  } else {
    if (!(await columnExists(pool, "WorkspaceSections", "projectID"))) {
      await pool.query(`ALTER TABLE WorkspaceSections ADD COLUMN projectID INT NULL AFTER contractID`);
      await pool.query(`
        UPDATE WorkspaceSections ws
        JOIN Contracts c ON c.id = ws.contractID
        JOIN Proposal pr ON pr.id = c.proposalID
        SET ws.projectID = pr.projectID
        WHERE ws.projectID IS NULL
      `);
    }
    try {
      await pool.query(`ALTER TABLE WorkspaceSections DROP KEY uq_section`);
    } catch {}
    try {
      await pool.query(`ALTER TABLE WorkspaceSections ADD UNIQUE KEY uq_section (projectID, sectionKey)`);
    } catch {}
  }
}

async function ensureDisputeSchema(pool) {
  if (!(await tableExists(pool, "Disputes"))) {
    await pool.query(`
      CREATE TABLE Disputes(
        id INT PRIMARY KEY AUTO_INCREMENT,
        contractID INT NOT NULL,
        reason VARCHAR(255) NOT NULL,
        dStatus ENUM('open', 'under_review', 'resolved', 'rejected', 'escalated') NOT NULL DEFAULT 'open',
        resolution VARCHAR(255),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        resolvedBy INT,
        raisedBy INT NOT NULL,
        raisedAgainst INT NOT NULL,
        FOREIGN KEY (contractID) REFERENCES Contracts(id) ON DELETE CASCADE,
        FOREIGN KEY (resolvedBy) REFERENCES Users(id),
        FOREIGN KEY (raisedBy) REFERENCES Users(id),
        FOREIGN KEY (raisedAgainst) REFERENCES Users(id),
        INDEX idx_disputes_contract (contractID)
      )
    `);
    return;
  }

  if (!(await columnExists(pool, "Disputes", "contractID"))) {
    await pool.query(`
      ALTER TABLE Disputes
      ADD COLUMN contractID INT NULL AFTER id
    `);
  }

  if (!(await indexExists(pool, "Disputes", "idx_disputes_contract"))) {
    await pool.query(`
      ALTER TABLE Disputes
      ADD INDEX idx_disputes_contract (contractID)
    `);
  }

  try {
    await pool.query(`
      ALTER TABLE Disputes
      ADD CONSTRAINT fk_disputes_contract
      FOREIGN KEY (contractID) REFERENCES Contracts(id) ON DELETE CASCADE
    `);
  } catch {}
  try { await pool.query(`ALTER TABLE Disputes MODIFY COLUMN reason TEXT NOT NULL`); } catch {}
  try { await pool.query(`ALTER TABLE Disputes MODIFY COLUMN resolution TEXT`); } catch {}
}

async function ensureProjectCapacitySchema(pool) {
  if (!(await columnExists(pool, "Project", "maxFreelancers"))) {
    await pool.query(`
      ALTER TABLE Project
      ADD COLUMN maxFreelancers INT NOT NULL DEFAULT 1
    `);
  }
}

async function ensureFilesSchema(pool) {
  if (!(await tableExists(pool, "Files"))) {
    await pool.query(`
      CREATE TABLE Files(
        id INT PRIMARY KEY AUTO_INCREMENT,
        entity VARCHAR(20) NOT NULL,
        entityID INT NOT NULL,
        nameFile VARCHAR(255) NOT NULL,
        filePath VARCHAR(255) NOT NULL,
        fileSize INT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        uploadedBy INT NOT NULL,
        FOREIGN KEY (uploadedBy) REFERENCES Users(id)
      )
    `);
    return;
  }

  if (await columnExists(pool, "Files", "nameFile")) {
    try {
      await pool.query(`ALTER TABLE Files MODIFY COLUMN nameFile VARCHAR(255) NOT NULL`);
    } catch {}
  }

  if (await columnExists(pool, "Files", "filePath")) {
    try {
      await pool.query(`ALTER TABLE Files MODIFY COLUMN filePath VARCHAR(255) NOT NULL`);
    } catch {}
  }
}

async function ensureProjectPhasesSchema(pool) {
  if (!(await columnExists(pool, "Project", "phases"))) {
    await pool.query(`ALTER TABLE Project ADD COLUMN phases JSON NULL AFTER pDesc`);
  }
  if (!(await columnExists(pool, "Project", "experienceLevel"))) {
    await pool.query(`ALTER TABLE Project ADD COLUMN experienceLevel VARCHAR(20) NULL AFTER maxFreelancers`);
  }
  if (!(await columnExists(pool, "Project", "skills"))) {
    await pool.query(`ALTER TABLE Project ADD COLUMN skills VARCHAR(300) NULL AFTER experienceLevel`);
  }
  if (!(await columnExists(pool, "Project", "projectType"))) {
    await pool.query(`ALTER TABLE Project ADD COLUMN projectType VARCHAR(30) NULL AFTER skills`);
  }
  try {
    await pool.query(`ALTER TABLE Project MODIFY COLUMN pDesc TEXT`);
  } catch (e) {
  }
}

async function ensureSettingsSchema(pool) {
  if (!(await tableExists(pool, "Settings"))) {
    await pool.query(`
      CREATE TABLE Settings(
        id INT PRIMARY KEY AUTO_INCREMENT,
        sKey VARCHAR(50) NOT NULL,
        sValue TEXT NOT NULL,
        sDesc VARCHAR(255),
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_settings_key (sKey)
      )
    `);
  } else if (!(await indexExists(pool, "Settings", "uq_settings_key"))) {
    try {
      await pool.query(`ALTER TABLE Settings ADD UNIQUE KEY uq_settings_key (sKey)`);
    } catch {}
  }

  if (await columnExists(pool, "Settings", "sValue")) {
    try {
      await pool.query(`ALTER TABLE Settings MODIFY COLUMN sValue TEXT NOT NULL`);
    } catch {}
  }

  if (await columnExists(pool, "Settings", "sDesc")) {
    try {
      await pool.query(`ALTER TABLE Settings MODIFY COLUMN sDesc VARCHAR(255) NULL`);
    } catch {}
  }

  await pool.query(`
    INSERT IGNORE INTO Settings (sKey, sValue, sDesc)
    VALUES
      ('platformName', 'Freelancer MarketPlace', 'Public platform name'),
      ('supportEmail', 'support@example.com', 'Support contact email'),
      ('commissionRate', '10', 'Platform commission percent'),
      ('landingHeadline', 'Hire exceptional talent', 'Homepage hero heading'),
      ('landingSubheadline', 'Connect with verified freelancers and deliver projects with confidence.', 'Homepage hero subheading'),
      ('allowNewRegistrations', 'true', 'Allow new users to register'),
      ('maxFeaturedFreelancers', '6', 'Number of featured freelancers on the homepage'),
      ('defaultProjectFreelancers', '1', 'Default number of freelancers per project')
  `);
}

async function ensureTestimonialsSchema(pool) {
  if (!(await tableExists(pool, "Testimonials"))) {
    await pool.query(`
      CREATE TABLE Testimonials(
        id INT PRIMARY KEY AUTO_INCREMENT,
        userID INT NOT NULL,
        fullName VARCHAR(80) NOT NULL,
        roleTitle VARCHAR(80) NOT NULL,
        rating INT NOT NULL,
        comment TEXT NOT NULL,
        isPublished BOOLEAN NOT NULL DEFAULT FALSE,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userID) REFERENCES Users(id) ON DELETE CASCADE
      )
    `);
  }
  try { await pool.query(`ALTER TABLE Testimonials MODIFY COLUMN fullName VARCHAR(255) NOT NULL`); } catch {}
  try { await pool.query(`ALTER TABLE Testimonials MODIFY COLUMN roleTitle VARCHAR(255) NOT NULL`); } catch {}
}

async function ensureSavedProjectsSchema(pool) {
  if (!(await tableExists(pool, "SavedProjects"))) {
    await pool.query(`
      CREATE TABLE SavedProjects (
        id INT PRIMARY KEY AUTO_INCREMENT,
        savedProjectID VARCHAR(36) NOT NULL UNIQUE,
        freelancerID INT NOT NULL,
        projectID INT NOT NULL,
        notes VARCHAR(500) NULL,
        folder VARCHAR(100) NOT NULL DEFAULT 'default',
        priority ENUM('high','medium','low') NOT NULL DEFAULT 'medium',
        savedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (freelancerID) REFERENCES Users(id) ON DELETE CASCADE,
        FOREIGN KEY (projectID) REFERENCES Project(id) ON DELETE CASCADE,
        UNIQUE KEY unique_save (freelancerID, projectID),
        INDEX idx_saved_user_project (freelancerID, projectID),
        INDEX idx_saved_freelancer (freelancerID),
        INDEX idx_saved_project (projectID)
      )
    `);
    return;
  }

  if (!(await columnExists(pool, "SavedProjects", "savedProjectID"))) {
    await pool.query(`
      ALTER TABLE SavedProjects
      ADD COLUMN savedProjectID VARCHAR(36) NULL AFTER id
    `);
    await pool.query(`
      UPDATE SavedProjects
      SET savedProjectID = UUID()
      WHERE savedProjectID IS NULL OR savedProjectID = ''
    `);
    await pool.query(`
      ALTER TABLE SavedProjects
      MODIFY COLUMN savedProjectID VARCHAR(36) NOT NULL
    `);
  }

  if (!(await columnExists(pool, "SavedProjects", "notes"))) {
    await pool.query(`
      ALTER TABLE SavedProjects
      ADD COLUMN notes VARCHAR(500) NULL AFTER projectID
    `);
  }

  if (!(await columnExists(pool, "SavedProjects", "folder"))) {
    await pool.query(`
      ALTER TABLE SavedProjects
      ADD COLUMN folder VARCHAR(100) NOT NULL DEFAULT 'default'
    `);
  }

  if (!(await columnExists(pool, "SavedProjects", "priority"))) {
    await pool.query(`
      ALTER TABLE SavedProjects
      ADD COLUMN priority ENUM('high','medium','low') NOT NULL DEFAULT 'medium'
    `);
  }

  if (!(await columnExists(pool, "SavedProjects", "savedAt"))) {
    await pool.query(`
      ALTER TABLE SavedProjects
      ADD COLUMN savedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);
  }

  if (!(await indexExists(pool, "SavedProjects", "unique_save"))) {
    try {
      await pool.query(`
        ALTER TABLE SavedProjects
        ADD UNIQUE KEY unique_save (freelancerID, projectID)
      `);
    } catch {}
  }
  try { await pool.query(`ALTER TABLE SavedProjects MODIFY COLUMN notes TEXT NULL`); } catch {}
  try { await pool.query(`ALTER TABLE SavedProjects MODIFY COLUMN folder VARCHAR(255) NOT NULL DEFAULT 'default'`); } catch {}
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
  if (!(await columnExists(pool, "Review", "title"))) {
    await pool.query(`ALTER TABLE Review ADD COLUMN title VARCHAR(100) NULL AFTER stars`);
  }
  if (!(await columnExists(pool, "Review", "tags"))) {
    await pool.query(`ALTER TABLE Review ADD COLUMN tags JSON NULL AFTER comment`);
  }
  if (!(await columnExists(pool, "Review", "helpfulCount"))) {
    await pool.query(`ALTER TABLE Review ADD COLUMN helpfulCount INT DEFAULT 0 AFTER tags`);
  }
  if (!(await columnExists(pool, "Review", "isVerified"))) {
    await pool.query(`ALTER TABLE Review ADD COLUMN isVerified BOOLEAN DEFAULT FALSE AFTER helpfulCount`);
  }
  if (!(await columnExists(pool, "Review", "updatedAt"))) {
    await pool.query(`ALTER TABLE Review ADD COLUMN updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER createdAt`);
  }
  if (!(await columnExists(pool, "Review", "deletedAt"))) {
    await pool.query(`ALTER TABLE Review ADD COLUMN deletedAt DATETIME NULL AFTER updatedAt`);
  }
  try {
    await pool.query(`
      ALTER TABLE Review
      MODIFY COLUMN stars TINYINT NOT NULL CHECK (stars BETWEEN 1 AND 5)
    `);
  } catch (e) {
  }
  if (!(await tableExists(pool, "SavedReports"))) {
    await pool.query(`
      CREATE TABLE SavedReports (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        reportType VARCHAR(50) NOT NULL,
        criteria JSON NULL,
        formatting JSON NULL,
        personalization JSON NULL,
        dataSnapshot JSON NULL,
        createdBy INT NOT NULL,
        lastRunAt DATETIME NULL,
        runCount INT DEFAULT 0,
        isArchived BOOLEAN DEFAULT FALSE,
        tags JSON NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (createdBy) REFERENCES Users(id)
      )
    `);
  }
}

async function ensureMilestoneSchema(pool) {
  if (!(await columnExists(pool, "Milestones", "projectID"))) {
    await pool.query(`
      ALTER TABLE Milestones
      ADD COLUMN projectID INT NULL AFTER contractID
    `);
  }

  if (!(await columnExists(pool, "Milestones", "projectPhase"))) {
    await pool.query(`
      ALTER TABLE Milestones
      ADD COLUMN projectPhase JSON NULL AFTER projectID
    `);
  }

  if (!(await columnExists(pool, "Milestones", "deadline"))) {
    await pool.query(`
      ALTER TABLE Milestones
      ADD COLUMN deadline DATETIME NULL AFTER dueDate
    `);
  }

  if (!(await columnExists(pool, "Milestones", "budget"))) {
    await pool.query(`
      ALTER TABLE Milestones
      ADD COLUMN budget DECIMAL(12,2) NULL AFTER deadline
    `);
  }

  if (!(await columnExists(pool, "Milestones", "status"))) {
    await pool.query(`
      ALTER TABLE Milestones
      ADD COLUMN status ENUM('pending', 'in_progress', 'completed', 'overdue')
      NOT NULL DEFAULT 'pending' AFTER budget
    `);
  }

  if (!(await columnExists(pool, "Milestones", "completionDate"))) {
    await pool.query(`
      ALTER TABLE Milestones
      ADD COLUMN completionDate DATETIME NULL AFTER status
    `);
  }

  if (!(await columnExists(pool, "Milestones", "comments"))) {
    await pool.query(`
      ALTER TABLE Milestones
      ADD COLUMN comments TEXT NULL AFTER completionDate
    `);
  }

  if (!(await columnExists(pool, "Milestones", "attachments"))) {
    await pool.query(`
      ALTER TABLE Milestones
      ADD COLUMN attachments JSON NULL AFTER comments
    `);
  }

  await pool.query(`
    UPDATE Milestones
    SET projectPhase = COALESCE(projectPhase, JSON_ARRAY()),
        attachments = COALESCE(attachments, JSON_ARRAY()),
        budget = COALESCE(budget, amountPayable),
        deadline = COALESCE(deadline, dueDate),
        status = CASE
          WHEN status = 'completed' THEN 'completed'
          WHEN dueDate IS NOT NULL AND dueDate < UTC_DATE() THEN 'overdue'
          ELSE COALESCE(status, 'pending')
        END
  `);

  if (
    !(await indexExists(pool, "Milestones", "idx_milestones_project_deadline"))
  ) {
    await pool.query(`
      ALTER TABLE Milestones
      ADD INDEX idx_milestones_project_deadline (projectID, deadline)
    `);
  }

  if (
    !(await indexExists(pool, "Milestones", "idx_milestones_status_deadline"))
  ) {
    await pool.query(`
      ALTER TABLE Milestones
      ADD INDEX idx_milestones_status_deadline (status, deadline)
    `);
  }

  try {
    await pool.query(`
      ALTER TABLE Milestones
      ADD CONSTRAINT fk_milestones_project
      FOREIGN KEY (projectID) REFERENCES Project(id) ON DELETE SET NULL
    `);
  } catch {}
  try { await pool.query(`ALTER TABLE Milestones MODIFY COLUMN title VARCHAR(255) NOT NULL`); } catch {}
  try { await pool.query(`ALTER TABLE Milestones MODIFY COLUMN mDesc TEXT NOT NULL`); } catch {}
}

async function ensurePaymentSchema(pool) {
  let paymentTableExists = await tableExists(pool, "Payment");
  const hasTransactionId = paymentTableExists
    ? await columnExists(pool, "Payment", "transactionID")
    : false;
  const hasStripeColumn = paymentTableExists
    ? await columnExists(pool, "Payment", "stripePaymentIntentId")
    : false;
  if (paymentTableExists && hasStripeColumn && !hasTransactionId) {
    const legacyExists =
      (await tableExists(pool, "Payment_legacy")) ||
      (await tableExists(pool, "payment_legacy"));

    if (legacyExists) {
      console.info(
        "[db] Payment_legacy already exists — extending current Payment table with transactionID/notes (non-destructive)."
      );
    } else {
      try {
        await pool.query("RENAME TABLE Payment TO Payment_legacy");
        paymentTableExists = false;
      } catch (renameErr) {
        console.warn(
          "[db] RENAME Payment TO Payment_legacy failed, falling back to DROP + CREATE:",
          renameErr.message
        );
        await pool.query("DROP TABLE IF EXISTS Payment");
        paymentTableExists = false;
      }
    }
  }

  if (!paymentTableExists) {
    await pool.query("DROP TABLE IF EXISTS Payment");
    await pool.query(`
      CREATE TABLE Payment(
        id INT PRIMARY KEY AUTO_INCREMENT,
        contractID INT NOT NULL,
        milestoneID INT NULL,
        amount DECIMAL(12,2) NOT NULL,
        currency CHAR(3) NOT NULL DEFAULT 'USD',
        pStatus ENUM(
          'pending',
          'processing',
          'succeeded',
          'failed',
          'canceled',
          'refunded'
        ) NOT NULL DEFAULT 'pending',
        transactionID VARCHAR(255) NULL,
        notes TEXT NULL,
        metadata JSON NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (contractID) REFERENCES Contracts(id) ON DELETE CASCADE,
        FOREIGN KEY (milestoneID) REFERENCES Milestones(id) ON DELETE SET NULL,
        UNIQUE KEY uq_payment_transaction (transactionID),
        INDEX idx_payment_status (pStatus),
        INDEX idx_payment_contract (contractID),
        INDEX idx_payment_created (createdAt DESC)
      )
    `);
    paymentTableExists = true;
  }
  if (paymentTableExists) {
    const currentHasTransactionId = await columnExists(pool, "Payment", "transactionID");

    if (!currentHasTransactionId) {
      try {
        await pool.query(`
          ALTER TABLE Payment
          ADD COLUMN transactionID VARCHAR(255) NULL AFTER pStatus
        `);
      } catch {}
      try {
        await pool.query(`
          ALTER TABLE Payment
          ADD UNIQUE KEY uq_payment_transaction (transactionID)
        `);
      } catch {}
      try {
        await pool.query(`
          ALTER TABLE Payment
          ADD COLUMN notes TEXT NULL AFTER transactionID
        `);
      } catch {}
    }
    try {
      await pool.query(`
        ALTER TABLE Payment
        MODIFY COLUMN amount DECIMAL(12,2) NOT NULL
      `);
    } catch {}
    try {
      await pool.query(`
        ALTER TABLE Payment
        MODIFY COLUMN currency CHAR(3) NOT NULL DEFAULT 'USD'
      `);
    } catch {}
  }

  if (!(await tableExists(pool, "MilestonePayment"))) {
    await pool.query(`
      CREATE TABLE MilestonePayment(
        id INT PRIMARY KEY AUTO_INCREMENT,
        milestoneID INT NOT NULL UNIQUE,
        paymentID INT NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
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
  } else {
    try {
      await pool.query(`
        ALTER TABLE MilestonePayment
        MODIFY COLUMN amount DECIMAL(12,2) NOT NULL
      `);
    } catch {}
  }
}

async function ensureFullTextIndexes(pool) {
  if (!(await indexExists(pool, "Project", "idx_project_search"))) {
    try {
      await pool.query(`
        ALTER TABLE Project
        ADD FULLTEXT idx_project_search (title, pDesc)
      `);
    } catch {}
  }

  if (!(await indexExists(pool, "Users", "idx_user_search"))) {
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
  await ensureCategorySchema(db);
  await ensureChatSchema(db);
  await ensureContractSchema(db);
  await ensureWorkspaceSchema(db);
  await ensureDisputeSchema(db);
  await ensureProjectCapacitySchema(db);
  await ensureFilesSchema(db);
  await ensureSettingsSchema(db);
  await ensureTestimonialsSchema(db);
  await ensureSavedProjectsSchema(db);
  await ensureBusinessEntitySchema(db);
  await ensureMilestoneSchema(db);
  await ensurePaymentSchema(db);
  await ensureProjectPhasesSchema(db);
  await ensureFullTextIndexes(db);
} catch (err) {
  console.error("❌ Failed to apply database migrations:", err.message);
  process.exit(1);
}

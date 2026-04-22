CREATE DATABASE IF NOT EXISTS freelancerMarketplace;

USE freelancerMarketplace;

CREATE TABLE IF NOT EXISTS Users(
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(50) UNIQUE NOT NULL,
    passwordHash VARCHAR(255) NOT NULL,
    fullName VARCHAR(50) NOT NULL,
    isActive BOOLEAN NOT NULL DEFAULT TRUE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Roles(
    id INT PRIMARY KEY AUTO_INCREMENT,
    roleName VARCHAR(20) UNIQUE NOT NULL,
    roleDescription VARCHAR(255),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS UserRole(
    id INT PRIMARY KEY AUTO_INCREMENT,
    userID INT UNIQUE NOT NULL,
    roleID INT NOT NULL,
    assignedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (userID) REFERENCES Users(id),
    FOREIGN KEY (roleID) REFERENCES Roles(id)
);

CREATE TABLE IF NOT EXISTS Permission(
    id INT PRIMARY KEY AUTO_INCREMENT,
    permName VARCHAR(50) NOT NULL,
    permDesc VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS RolePerms(
    id INT PRIMARY KEY AUTO_INCREMENT,
    roleID INT NOT NULL,
    permissionID INT NOT NULL,

    FOREIGN KEY (roleID) REFERENCES Roles(id),
    FOREIGN KEY (permissionID) REFERENCES Permission(id),
    UNIQUE KEY uniq_role_perm (roleID, permissionID)
);

INSERT IGNORE INTO Permission (permName, permDesc) VALUES
    ('view_project', 'Can view projects'),
    ('edit_project', 'Can update projects'),
    ('delete_project', 'Can delete projects'),
    ('view_profile', 'Can view profile data'),
    ('edit_profile', 'Can update profile data'),
    ('manage_users', 'Can manage user accounts');

INSERT IGNORE INTO RolePerms (roleID, permissionID)
    SELECT r.id, p.id FROM Roles r JOIN Permission p ON r.roleName = 'Admin' AND p.permName IN ('view_project', 'edit_project', 'delete_project', 'view_profile', 'edit_profile', 'manage_users')
    UNION ALL
    SELECT r.id, p.id FROM Roles r JOIN Permission p ON r.roleName = 'Client' AND p.permName IN ('view_project', 'edit_project', 'delete_project', 'view_profile', 'edit_profile')
    UNION ALL
    SELECT r.id, p.id FROM Roles r JOIN Permission p ON r.roleName = 'Freelancer' AND p.permName IN ('view_project', 'view_profile', 'edit_profile');

CREATE TABLE IF NOT EXISTS RefreshTokens(
    id INT PRIMARY KEY AUTO_INCREMENT,
    tokenHash VARCHAR(255) NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    expiresAt DATETIME NOT NULL DEFAULT (DATE_ADD(NOW(), INTERVAL 7 DAY)),
    revokedAt DATETIME NULL,
    userID INT NOT NULL,

    FOREIGN KEY (userID) REFERENCES Users(id)
);

CREATE TABLE IF NOT EXISTS AuditLogs(
    id INT PRIMARY KEY AUTO_INCREMENT,
    entity VARCHAR(20) NOT NULL,
    entityID INT NOT NULL,
    actionPerformed VARCHAR(20) NOT NULL,
    oldValue VARCHAR(20) NOT NULL,
    newValue VARCHAR(20) NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Settings(
    id INT PRIMARY KEY AUTO_INCREMENT,
    sKey VARCHAR(50) NOT NULL,
    sValue VARCHAR(20) NOT NULL,
    sDesc VARCHAR(100),
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Files(
    id INT PRIMARY KEY AUTO_INCREMENT,
    entity VARCHAR(20) NOT NULL,
    entityID INT NOT NULL,
    nameFile VARCHAR(20) NOT NULL,
    filePath VARCHAR(100) NOT NULL,
    fileSize INT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    uploadedBy INT NOT NULL,

    FOREIGN KEY (uploadedBy) REFERENCES Users(id)
);

CREATE TABLE IF NOT EXISTS Profiles(
    id INT PRIMARY KEY AUTO_INCREMENT,
    userID INT NOT NULL UNIQUE,
    pictureID INT,
    hourlyRate DECIMAL(10,2),
    portofoliUrl VARCHAR(50),
    bio VARCHAR(255),

    FOREIGN KEY(userID) REFERENCES Users(id),
    FOREIGN KEY (pictureID) REFERENCES Files(id)
);

CREATE TABLE IF NOT EXISTS Notifications(
    id INT PRIMARY KEY AUTO_INCREMENT,
    types ENUM('message', 'system') NOT NULL,
    receiverID INT NOT NULL,
    title VARCHAR(20) NOT NULL,
    msg VARCHAR(255),
    isRead BOOLEAN DEFAULT FALSE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (receiverID) REFERENCES Users(id) 
);

CREATE TABLE IF NOT EXISTS Project(
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(20) NOT NULL,
    pDesc VARCHAR(255),
    budget INT,
    pStatus ENUM('pending', 'active', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
    deadline DATE,
    clientID INT NOT NULL,

    FOREIGN KEY (clientID) REFERENCES Users(id)
);

CREATE TABLE IF NOT EXISTS Proposal(
    id INT PRIMARY KEY AUTO_INCREMENT,
    projectID INT NOT NULL,
    userID INT NOT NULL,
    coverLetter TEXT,
    propStatus ENUM('pending', 'accepted', 'rejected', 'withdrawn') NOT NULL DEFAULT 'pending',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (projectID) REFERENCES Project(id) ON DELETE CASCADE,
    FOREIGN KEY (userID) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Contracts(
    id INT PRIMARY KEY AUTO_INCREMENT,
    proposalID INT UNIQUE NOT NULL,
    clientID INT NOT NULL,
    freelancerID INT NOT NULL,
    totalAmount INT,
    cStatus ENUM('draft', 'active', 'completed', 'terminated') NOT NULL DEFAULT 'draft',
    startDate DATE,
    endDate DATE
);

CREATE TABLE IF NOT EXISTS Payment(
    id INT PRIMARY KEY AUTO_INCREMENT,
    amount INT,
    contractID INT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    paymentMethod ENUM('card', 'paypal', 'bank_transfer', 'crypto') NOT NULL,
    
    FOREIGN KEY (contractID) REFERENCES Contracts(id)
);

CREATE TABLE IF NOT EXISTS Review(
    id INT PRIMARY KEY AUTO_INCREMENT,
    stars ENUM('1','2','3','4','5') NOT NULL,
    comment VARCHAR(255) NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    contractID INT NOT NULL,
    reviewerID INT NOT NULL,
    receiverID INT NOT NULL,

    FOREIGN KEY (contractID) REFERENCES Contracts(id),
    FOREIGN KEY (reviewerID) REFERENCES Users(id),
    FOREIGN KEY (receiverID) REFERENCES Users(id)
);

CREATE TABLE IF NOT EXISTS Conversations(
    id INT PRIMARY KEY AUTO_INCREMENT,
    conversationType ENUM('project', 'direct') NOT NULL DEFAULT 'project',
    cStatus ENUM('active', 'archived', 'closed') NOT NULL DEFAULT 'active',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    lastMessageAt DATETIME NULL,
    projectID INT NULL,
    clientID INT NULL,
    freelancerID INT NULL,

    FOREIGN KEY (clientID) REFERENCES Users(id),
    FOREIGN KEY (freelancerID) REFERENCES Users(id),
    FOREIGN KEY (projectID) REFERENCES Project(id)
);

CREATE TABLE IF NOT EXISTS Messages(
    id INT PRIMARY KEY AUTO_INCREMENT,
    conversationID INT NOT NULL,
    senderID INT NOT NULL,
    content TEXT NOT NULL,
    msgType ENUM('text', 'image', 'file', 'system') NOT NULL DEFAULT 'text',
    field VARCHAR(20),
    isRead BOOLEAN DEFAULT FALSE,
    isDeleted BOOLEAN DEFAULT FALSE,
    deliveredAt DATETIME NULL,
    sentAt DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (conversationID) REFERENCES Conversations(id),
    FOREIGN KEY (senderID) REFERENCES Users(id)
);

CREATE TABLE IF NOT EXISTS ConversationParticipants(
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
);

CREATE TABLE IF NOT EXISTS MessageStatus(
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
);

CREATE INDEX idx_messages_conversation_sent ON Messages(conversationID, sentAt);
CREATE INDEX idx_conversations_status_last ON Conversations(cStatus, lastMessageAt);

CREATE TABLE IF NOT EXISTS Categories(
    id INT PRIMARY KEY AUTO_INCREMENT,
    cName VARCHAR(20) NOT NULL,
    slug VARCHAR(20),
    cDesc VARCHAR(100) NOT NULL,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Skills(
    id INT PRIMARY KEY AUTO_INCREMENT,
    skillName VARCHAR(30) NOT NULL,
    slug VARCHAR(20),
    isActive BOOLEAN DEFAULT TRUE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    categoryID INT NOT NULL,

    FOREIGN KEY (categoryID) REFERENCES Categories(id)
);

CREATE TABLE IF NOT EXISTS FreelancerSkills(
    id INT PRIMARY KEY AUTO_INCREMENT,
    sLevel ENUM('beginner', 'intermediate', 'advanced', 'expert') NOT NULL,
    yearsOfExp INT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    skillID INT NOT NULL,
    profileID INT NOT NULL,

    FOREIGN KEY (skillID) REFERENCES Skills(id),
    FOREIGN KEY (profileID) REFERENCES Profiles(id)
);

CREATE TABLE IF NOT EXISTS ProjectSkills(
    id INT PRIMARY KEY AUTO_INCREMENT,
    projectID INT NOT NULL,
    skillID INT NOT NULL,

    FOREIGN KEY (projectID) REFERENCES Project(id),
    FOREIGN KEY (skillID) REFERENCES Skills(id)
);

CREATE TABLE IF NOT EXISTS Milestones(
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(20) NOT NULL,
    mDesc VARCHAR(255) NOT NULL,
    amountPayable DECIMAL(10,2) NOT NULL,
    dueDate DATE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    contractID INT NOT NULL,
    mStatus ENUM('pending', 'in_progress', 'submitted', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    
    FOREIGN KEY (contractID) REFERENCES Contracts(id)
);

CREATE TABLE IF NOT EXISTS Disputes(
    id INT PRIMARY KEY AUTO_INCREMENT,
    reason VARCHAR(255) NOT NULL,
    dStatus ENUM('open', 'under_review', 'resolved', 'rejected', 'escalated') NOT NULL DEFAULT 'open',
    resolution VARCHAR(255),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolvedBy INT,
    raisedBy INT NOT NULL,
    raisedAgainst INT NOT NULL,

    FOREIGN KEY (resolvedBy) REFERENCES Users(id),
    FOREIGN KEY (raisedBy) REFERENCES Users(id),
    FOREIGN KEY (raisedAgainst) REFERENCES Users(id)
);

INSERT INTO Roles(roleName, roleDescription) VALUES ('SysAdmin', 'System admin');
INSERT INTO Roles(roleName, roleDescription) VALUES ('Client', 'Client that can post projects');
INSERT INTO Roles(roleName, roleDescription) VALUES ('Freelancer', 'Freelancer that can book projects');
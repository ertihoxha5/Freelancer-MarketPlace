import { db } from "../config/db.js";

export async function findFreelancerProfileByUserId(userID) {
  const [rows] = await db.execute(
    `SELECT
        u.id AS userID,
        u.fullName,
        u.email,
        p.id AS profileID,
        p.pictureID,
        p.hourlyRate,
        p.portofoliUrl,
        p.bio,
        f.filePath AS picturePath
     FROM Users u
     INNER JOIN UserRole ur ON ur.userID = u.id
     LEFT JOIN Profiles p ON p.userID = u.id
     LEFT JOIN Files f ON f.id = p.pictureID
     WHERE u.id = ? AND ur.roleID = 3
     LIMIT 1`,
    [userID],
  );
  return rows[0] ?? null;
}

export async function listFreelancerSkillsByUserId(userID) {
  const [rows] = await db.execute(
    `SELECT
        fs.skillID,
        s.skillName,
        s.slug,
        fs.sLevel,
        fs.yearsOfExp,
        c.cName AS categoryName
     FROM Profiles p
     INNER JOIN FreelancerSkills fs ON fs.profileID = p.id
     INNER JOIN Skills s ON s.id = fs.skillID
     LEFT JOIN Categories c ON c.id = s.categoryID
     WHERE p.userID = ?
     ORDER BY s.skillName ASC`,
    [userID],
  );
  return rows;
}

export async function listAvailableSkills() {
  const [rows] = await db.execute(
    `SELECT
        s.id AS skillID,
        s.skillName,
        s.slug,
        c.cName AS categoryName
     FROM Skills s
     LEFT JOIN Categories c ON c.id = s.categoryID
     WHERE s.isActive = TRUE
     ORDER BY s.skillName ASC`,
  );
  return rows;
}

export async function replaceFreelancerSkills(profileID, skills) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(`DELETE FROM FreelancerSkills WHERE profileID = ?`, [
      profileID,
    ]);

    for (const skill of skills) {
      await conn.execute(
        `INSERT INTO FreelancerSkills (sLevel, yearsOfExp, skillID, profileID)
         VALUES (?, ?, ?, ?)`,
        [skill.sLevel, skill.yearsOfExp, skill.skillID, profileID],
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function getFreelancerStats(userID) {
  const [rows] = await db.execute(
    `SELECT
        (SELECT COUNT(*)
         FROM Proposal pr
         WHERE pr.userID = ?) AS totalApplications,
        (SELECT COUNT(*)
         FROM Proposal pr
         WHERE pr.userID = ? AND pr.propStatus = 'pending') AS pendingApplications,
        (SELECT COUNT(DISTINCT p.id)
         FROM Proposal pr
         INNER JOIN Project p ON p.id = pr.projectID
         WHERE pr.userID = ? AND pr.propStatus = 'accepted') AS totalProjects,
        (SELECT COUNT(DISTINCT p.id)
         FROM Proposal pr
         INNER JOIN Project p ON p.id = pr.projectID
         LEFT JOIN Contracts ct ON ct.proposalID = pr.id
         WHERE pr.userID = ? AND pr.propStatus = 'accepted'
           AND (ct.cStatus = 'active' OR (ct.id IS NULL AND p.pStatus = 'active'))) AS activeProjects,
        (SELECT COUNT(DISTINCT p.id)
         FROM Proposal pr
         INNER JOIN Project p ON p.id = pr.projectID
         LEFT JOIN Contracts ct ON ct.proposalID = pr.id
         WHERE pr.userID = ? AND pr.propStatus = 'accepted'
           AND (ct.cStatus = 'completed' OR p.pStatus = 'completed')) AS completedProjects,
        (SELECT ROUND(AVG(CAST(r.stars AS DECIMAL(10, 2))), 1)
         FROM Review r
         WHERE r.receiverID = ?) AS averageRating,
        (SELECT COUNT(*)
         FROM Review r
         WHERE r.receiverID = ?) AS reviewCount,
        (SELECT COALESCE(SUM(ct.totalAmount), 0)
         FROM Contracts ct
         WHERE ct.freelancerID = ? AND ct.cStatus IN ('active', 'completed')) AS totalEarnings`,
    [userID, userID, userID, userID, userID, userID, userID, userID],
  );
  return rows[0] ?? null;
}

export async function listFreelancerPreviousProjects(userID, limit = 6) {
  const [rows] = await db.execute(
    `SELECT
        p.id,
        p.title,
        p.pDesc,
        p.budget,
        p.pStatus,
        p.deadline,
        uc.fullName AS clientName,
        ct.cStatus AS contractStatus,
        ct.totalAmount
     FROM Proposal pr
     INNER JOIN Project p ON p.id = pr.projectID
     INNER JOIN Users uc ON uc.id = p.clientID
     LEFT JOIN Contracts ct ON ct.proposalID = pr.id
     WHERE pr.userID = ? AND pr.propStatus = 'accepted'
     ORDER BY
       CASE
         WHEN ct.cStatus = 'completed' OR p.pStatus = 'completed' THEN 0
         ELSE 1
       END ASC,
       COALESCE(ct.endDate, p.deadline, pr.updatedAt, pr.createdAt) DESC,
       p.id DESC
     LIMIT ?`,
    [userID, Number(limit)],
  );
  return rows;
}

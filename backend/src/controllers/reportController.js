import { db } from "../config/db.js";
import { sendRows } from "./exportController.js";
import { validatedParams, validatedQuery } from "../middleware/validateRequest.js";

function canViewUserReport(req, id) {
  return Number(req.user.roleID) === 1 || Number(req.user.id) === Number(id);
}

function monthLabelSql(column) {
  return `DATE_FORMAT(${column}, '%Y-%m')`;
}

export async function platformSummary(req, res, next) {
  try {
    const [[totals]] = await db.execute(`
      SELECT
        (SELECT COUNT(*) FROM Users WHERE isActive = TRUE) AS totalUsers,
        (SELECT COUNT(*) FROM Project) AS totalProjects,
        (SELECT COUNT(*) FROM Contracts) AS totalContracts,
        (SELECT COALESCE(SUM(totalAmount), 0) FROM Contracts WHERE cStatus IN ('active', 'completed')) AS totalRevenue,
        (SELECT COUNT(*) FROM Users WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) AS activeThisMonth
    `);
    const [projectsByStatus] = await db.execute(
      `SELECT pStatus AS status, COUNT(*) AS count FROM Project GROUP BY pStatus`,
    );
    const [usersByRole] = await db.execute(
      `SELECT r.roleName, COUNT(*) AS count
       FROM Users u INNER JOIN UserRole ur ON ur.userID = u.id
       INNER JOIN Roles r ON r.id = ur.roleID
       WHERE u.isActive = TRUE
       GROUP BY r.roleName`,
    );
    const [topFreelancers] = await db.execute(`
      SELECT u.id, u.fullName, COALESCE(SUM(c.totalAmount), 0) AS totalEarned,
             COUNT(c.id) AS contractCount,
             ROUND(AVG(CAST(rv.stars AS DECIMAL(10,2))), 1) AS avgRating
      FROM Users u
      INNER JOIN UserRole ur ON ur.userID = u.id AND ur.roleID = 3
      LEFT JOIN Contracts c ON c.freelancerID = u.id AND c.cStatus IN ('active', 'completed')
      LEFT JOIN Review rv ON rv.receiverID = u.id
      WHERE u.isActive = TRUE
      GROUP BY u.id, u.fullName
      ORDER BY totalEarned DESC, avgRating DESC
      LIMIT 5
    `);
    return res.status(200).json({
      ...totals,
      totalRevenue: Number(totals.totalRevenue || 0),
      projectsByStatus,
      usersByRole,
      topFreelancers,
      activeThisMonth: Number(totals.activeThisMonth || 0),
    });
  } catch (err) {
    next(err);
  }
}

export async function clientReport(req, res, next) {
  try {
    const { id: clientID } = validatedParams(req);
    if (!canViewUserReport(req, clientID) || Number(req.user.roleID) === 3) {
      return res.status(403).json({ message: "You cannot view this client report." });
    }
    const [[summary]] = await db.execute(
      `SELECT
        COALESCE(SUM(c.totalAmount), 0) AS totalSpent,
        COUNT(DISTINCT p.id) AS projectsPosted,
        COUNT(DISTINCT pr.id) AS proposalsReceived,
        ROUND(100 * SUM(CASE WHEN pr.propStatus = 'accepted' THEN 1 ELSE 0 END) / NULLIF(COUNT(pr.id), 0), 1) AS acceptanceRate
       FROM Project p
       LEFT JOIN Proposal pr ON pr.projectID = p.id
       LEFT JOIN Contracts c ON c.proposalID = pr.id
       WHERE p.clientID = ?`,
      [clientID],
    );
    const [projectsByStatus] = await db.execute(
      `SELECT pStatus AS status, COUNT(*) AS count FROM Project WHERE clientID = ? GROUP BY pStatus`,
      [clientID],
    );
    const [monthlyActivity] = await db.execute(
      `SELECT ${monthLabelSql("createdAt")} AS month, COUNT(*) AS projectsPosted
       FROM Project
       WHERE clientID = ? AND createdAt >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
       GROUP BY month ORDER BY month ASC`,
      [clientID],
    );
    return res.status(200).json({
      totalSpent: Number(summary.totalSpent || 0),
      projectsPosted: Number(summary.projectsPosted || 0),
      proposalsReceived: Number(summary.proposalsReceived || 0),
      acceptanceRate: Number(summary.acceptanceRate || 0),
      projectsByStatus,
      monthlyActivity,
    });
  } catch (err) {
    next(err);
  }
}

export async function freelancerReport(req, res, next) {
  try {
    const freelancerID = req.params?.id === "me"
      ? Number(req.user.id)
      : Number(validatedParams(req).id);
    if (!canViewUserReport(req, freelancerID) || Number(req.user.roleID) === 2) {
      return res.status(403).json({ message: "You cannot view this freelancer report." });
    }
    const [[summary]] = await db.execute(
      `SELECT
        COALESCE((SELECT SUM(totalAmount) FROM Contracts WHERE freelancerID = ? AND cStatus IN ('active', 'completed')), 0) AS totalEarned,
        (SELECT COUNT(*) FROM Contracts WHERE freelancerID = ? AND cStatus = 'completed') AS projectsCompleted,
        (SELECT ROUND(AVG(CAST(stars AS DECIMAL(10,2))), 1) FROM Review WHERE receiverID = ?) AS avgRating,
        (SELECT ROUND(100 * SUM(CASE WHEN propStatus = 'accepted' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1)
         FROM Proposal WHERE userID = ? AND isDeleted = FALSE) AS applicationSuccessRate`,
      [freelancerID, freelancerID, freelancerID, freelancerID],
    );
    const [earningsByMonth] = await db.execute(
      `SELECT ${monthLabelSql("COALESCE(c.endDate, c.startDate)")} AS month,
              SUM(c.totalAmount) AS amount
       FROM Contracts c
       WHERE c.freelancerID = ? AND c.startDate >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
       GROUP BY month ORDER BY month ASC`,
      [freelancerID],
    );
    const [skillDemand] = await db.execute(
      `SELECT s.skillName, COUNT(ps.projectID) AS demand
       FROM Profiles p
       INNER JOIN FreelancerSkills fs ON fs.profileID = p.id
       INNER JOIN Skills s ON s.id = fs.skillID
       LEFT JOIN ProjectSkills ps ON ps.skillID = s.id
       WHERE p.userID = ?
       GROUP BY s.id, s.skillName
       ORDER BY demand DESC`,
      [freelancerID],
    );
    return res.status(200).json({
      totalEarned: Number(summary.totalEarned || 0),
      projectsCompleted: Number(summary.projectsCompleted || 0),
      avgRating: summary.avgRating == null ? null : Number(summary.avgRating),
      applicationSuccessRate: Number(summary.applicationSuccessRate || 0),
      earningsByMonth,
      skillDemand,
    });
  } catch (err) {
    next(err);
  }
}

export async function projectReport(req, res, next) {
  try {
    const whereParts = ["1=1"];
    const params = [];
    const query = validatedQuery(req);
    if (query.from) {
      whereParts.push("p.createdAt >= ?");
      params.push(query.from);
    }
    if (query.to) {
      whereParts.push("p.createdAt <= ?");
      params.push(query.to);
    }
    if (query.status) {
      whereParts.push("p.pStatus = ?");
      params.push(query.status);
    }
    const [rows] = await db.execute(
      `SELECT p.id, p.title, p.budget, p.deadline, p.pStatus,
              u.fullName AS clientName, COUNT(pr.id) AS proposalCount,
              p.createdAt
       FROM Project p
       INNER JOIN Users u ON u.id = p.clientID
       LEFT JOIN Proposal pr ON pr.projectID = p.id
       WHERE ${whereParts.join(" AND ")}
       GROUP BY p.id, p.title, p.budget, p.deadline, p.pStatus, u.fullName, p.createdAt
       ORDER BY p.createdAt DESC`,
      params,
    );
    const format = ["csv", "xlsx", "json"].includes(query.format)
      ? query.format
      : "json";
    return sendRows(res, rows, format, "project-report");
  } catch (err) {
    next(err);
  }
}

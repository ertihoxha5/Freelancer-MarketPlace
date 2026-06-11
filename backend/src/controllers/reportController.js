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
    const data = await fetchPlatformSummaryData();
    return res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}

async function fetchPlatformSummaryData() {
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
  return {
    ...totals,
    totalRevenue: Number(totals.totalRevenue || 0),
    projectsByStatus,
    usersByRole,
    topFreelancers,
    activeThisMonth: Number(totals.activeThisMonth || 0),
  };
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

export async function saveReport(req, res, next) {
  try {
    if (Number(req.user.roleID) !== 1) {
      return res.status(403).json({ message: "Admin only." });
    }
    const { name, description, reportType, criteria, formatting, personalization, dataSnapshot, tags } = req.body;

    if (!name || !reportType) {
      return res.status(400).json({ message: "Name and reportType are required." });
    }

    const [result] = await db.execute(
      `INSERT INTO SavedReports (name, description, reportType, criteria, formatting, personalization, dataSnapshot, createdBy, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description || null,
        reportType,
        criteria ? JSON.stringify(criteria) : null,
        formatting ? JSON.stringify(formatting) : null,
        personalization ? JSON.stringify(personalization) : null,
        dataSnapshot ? JSON.stringify(dataSnapshot) : null,
        req.user.id,
        tags ? JSON.stringify(tags) : null,
      ]
    );

    const saved = await getSavedReportByIdInternal(result.insertId);
    return res.status(201).json({ message: "Report saved successfully.", report: saved });
  } catch (err) {
    next(err);
  }
}

export async function listSavedReports(req, res, next) {
  try {
    if (Number(req.user.roleID) !== 1) {
      return res.status(403).json({ message: "Admin only." });
    }

    const { page = 1, limit = 20, q, reportType, from, to, isArchived } = req.query;
    const rawLimit = Number(limit) || 20;
    const safeLimit = Math.min(Math.max(Math.floor(rawLimit), 1), 100);

    let safeOffset;
    if (req.query.offset != null) {
      safeOffset = Math.max(Math.floor(Number(req.query.offset) || 0), 0);
    } else {
      const rawPage = Number(page) || 1;
      const safePage = Math.max(Math.floor(rawPage), 1);
      safeOffset = (safePage - 1) * safeLimit;
    }

    let where = "1=1";
    const params = [];

    if (q) {
      where += " AND (name LIKE ? OR description LIKE ?)";
      const like = `%${q}%`;
      params.push(like, like);
    }
    if (reportType) {
      where += " AND reportType = ?";
      params.push(reportType);
    }
    if (from) {
      where += " AND createdAt >= ?";
      params.push(from);
    }
    if (to) {
      where += " AND createdAt <= ?";
      params.push(to);
    }
    if (isArchived !== undefined) {
      where += " AND isArchived = ?";
      params.push(Number(isArchived));
    }

    const [rows] = await db.execute(
      `SELECT sr.*, u.fullName AS createdByName
       FROM SavedReports sr
       INNER JOIN Users u ON u.id = sr.createdBy
       WHERE ${where}
       ORDER BY sr.updatedAt DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      params
    );

    const [countRes] = await db.execute(
      `SELECT COUNT(*) AS total FROM SavedReports WHERE ${where}`,
      params
    );

    const reports = rows.map(r => ({
      ...r,
      criteria: safeParseJSON(r.criteria),
      formatting: safeParseJSON(r.formatting),
      personalization: safeParseJSON(r.personalization),
      dataSnapshot: safeParseJSON(r.dataSnapshot),
      tags: safeParseJSON(r.tags),
    }));

    return res.json({
      reports,
      page: Math.max(Math.floor(Number(page) || 1), 1),
      limit: safeLimit,
      total: countRes[0]?.total || 0,
      totalPages: Math.ceil((countRes[0]?.total || 0) / safeLimit),
    });
  } catch (err) {
    next(err);
  }
}

export async function getSavedReport(req, res, next) {
  try {
    if (Number(req.user.roleID) !== 1) {
      return res.status(403).json({ message: "Admin only." });
    }
    const { id } = req.params;
    const report = await getSavedReportByIdInternal(id);
    if (!report) {
      return res.status(404).json({ message: "Report not found." });
    }
    return res.json(report);
  } catch (err) {
    next(err);
  }
}

export async function updateSavedReport(req, res, next) {
  try {
    if (Number(req.user.roleID) !== 1) {
      return res.status(403).json({ message: "Admin only." });
    }
    const { id } = req.params;
    const { name, description, formatting, personalization, notes, tags, isArchived } = req.body;

    const sets = [];
    const values = [];

    if (name !== undefined) { sets.push("name = ?"); values.push(name); }
    if (description !== undefined) { sets.push("description = ?"); values.push(description); }
    if (formatting !== undefined) { sets.push("formatting = ?"); values.push(JSON.stringify(formatting)); }
    if (personalization !== undefined) { sets.push("personalization = ?"); values.push(JSON.stringify(personalization)); }
    if (tags !== undefined) { sets.push("tags = ?"); values.push(JSON.stringify(tags)); }
    if (isArchived !== undefined) { sets.push("isArchived = ?"); values.push(!!isArchived); }

    if (sets.length === 0) {
      return res.status(400).json({ message: "No fields to update." });
    }

    sets.push("updatedAt = NOW()");
    values.push(id);

    await db.execute(`UPDATE SavedReports SET ${sets.join(", ")} WHERE id = ?`, values);

    const updated = await getSavedReportByIdInternal(id);
    return res.json({ message: "Report updated.", report: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteSavedReport(req, res, next) {
  try {
    if (Number(req.user.roleID) !== 1) {
      return res.status(403).json({ message: "Admin only." });
    }
    const { id } = req.params;
    await db.execute(`DELETE FROM SavedReports WHERE id = ?`, [id]);
    return res.json({ message: "Report deleted." });
  } catch (err) {
    next(err);
  }
}

export async function runSavedReport(req, res, next) {
  try {
    if (Number(req.user.roleID) !== 1) {
      return res.status(403).json({ message: "Admin only." });
    }
    const { id } = req.params;
    const report = await getSavedReportByIdInternal(id);
    if (!report) {
      return res.status(404).json({ message: "Report not found." });
    }
    let freshData = await fetchPlatformSummaryData();

    await db.execute(
      `UPDATE SavedReports SET lastRunAt = NOW(), runCount = COALESCE(runCount, 0) + 1, dataSnapshot = ? WHERE id = ?`,
      [JSON.stringify(freshData), id]
    );

    const updated = await getSavedReportByIdInternal(id);
    return res.json({ message: "Report re-run successfully.", report: updated });
  } catch (err) {
    next(err);
  }
}

function safeParseJSON(str) {
  if (!str) return null;
  try { return JSON.parse(str); } catch { return str; }
}

async function getSavedReportByIdInternal(id) {
  const [rows] = await db.execute(
    `SELECT sr.*, u.fullName AS createdByName
     FROM SavedReports sr
     INNER JOIN Users u ON u.id = sr.createdBy
     WHERE sr.id = ?`,
    [id]
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    ...r,
    criteria: safeParseJSON(r.criteria),
    formatting: safeParseJSON(r.formatting),
    personalization: safeParseJSON(r.personalization),
    dataSnapshot: safeParseJSON(r.dataSnapshot),
    tags: safeParseJSON(r.tags),
  };
}

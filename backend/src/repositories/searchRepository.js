import { db } from "../config/db.js";

function escapeLike(value = "") {
  return `%${String(value).replace(/[\\%_]/g, "\\$&")}%`;
}

function getPaging({ page = 1, limit = 10 } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  return {
    page: safePage,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
  };
}

async function paginate({
  baseSql,
  countSql,
  where,
  params,
  countParams = params,
  orderParams = [],
  orderBy,
  paging,
}) {
  const [rows] = await db.execute(
    `${baseSql} ${where} ${orderBy} LIMIT ${paging.limit} OFFSET ${paging.offset}`,
    [...params, ...orderParams],
  );
  const [[countRow]] = await db.execute(`${countSql} ${where}`, countParams);
  const total = Number(countRow?.total ?? 0);
  return {
    results: rows,
    pagination: {
      page: paging.page,
      limit: paging.limit,
      total,
      totalPages: Math.ceil(total / paging.limit),
    },
  };
}

export async function searchProjects(filters = {}) {
  const paging = getPaging(filters);
  const whereParts = ["1=1"];
  const params = [];

  if (filters.q) {
    whereParts.push("(p.title LIKE ? ESCAPE '\\\\' OR p.pDesc LIKE ? ESCAPE '\\\\' OR u.fullName LIKE ? ESCAPE '\\\\')");
    params.push(escapeLike(filters.q), escapeLike(filters.q), escapeLike(filters.q));
  }
  if (filters.categoryID) {
    whereParts.push("p.categoryID = ?");
    params.push(Number(filters.categoryID));
  }
  if (filters.minBudget) {
    whereParts.push("p.budget >= ?");
    params.push(Number(filters.minBudget));
  }
  if (filters.maxBudget) {
    whereParts.push("p.budget <= ?");
    params.push(Number(filters.maxBudget));
  }
  if (filters.deadline) {
    whereParts.push("p.deadline <= ?");
    params.push(filters.deadline);
  }

  const orderBy =
    filters.sort === "budget_asc"
      ? "ORDER BY p.budget ASC"
      : filters.sort === "budget_desc"
        ? "ORDER BY p.budget DESC"
        : filters.sort === "date_asc"
          ? "ORDER BY p.createdAt ASC"
          : filters.q
            ? "ORDER BY CASE WHEN p.title LIKE ? ESCAPE '\\\\' THEN 0 ELSE 1 END, p.createdAt DESC"
            : "ORDER BY p.createdAt DESC";
  const orderParams = filters.q ? [escapeLike(filters.q)] : [];

  return paginate({
    baseSql: `SELECT p.id, p.title, p.pDesc, p.budget, p.deadline, p.pStatus,
                     p.categoryID, p.createdAt, u.fullName AS clientName`,
    countSql: "SELECT COUNT(DISTINCT p.id) AS total",
    where: `FROM Project p INNER JOIN Users u ON u.id = p.clientID WHERE ${whereParts.join(" AND ")}`,
    params,
    orderParams,
    orderBy,
    paging,
  });
}

export async function searchFreelancers(filters = {}) {
  const paging = getPaging(filters);
  const whereParts = ["ur.roleID = 3", "u.isActive = TRUE"];
  const params = [];

  if (filters.q) {
    whereParts.push("(u.fullName LIKE ? ESCAPE '\\\\' OR u.email LIKE ? ESCAPE '\\\\' OR p.bio LIKE ? ESCAPE '\\\\')");
    params.push(escapeLike(filters.q), escapeLike(filters.q), escapeLike(filters.q));
  }
  if (filters.skillID) {
    whereParts.push("fs.skillID = ?");
    params.push(Number(filters.skillID));
  }
  if (filters.minRate) {
    whereParts.push("p.hourlyRate >= ?");
    params.push(Number(filters.minRate));
  }
  if (filters.maxRate) {
    whereParts.push("p.hourlyRate <= ?");
    params.push(Number(filters.maxRate));
  }

  const orderBy =
    filters.sort === "rate_asc"
      ? "ORDER BY p.hourlyRate ASC"
      : filters.sort === "rate_desc"
        ? "ORDER BY p.hourlyRate DESC"
        : filters.sort === "rating_desc"
          ? "ORDER BY averageRating DESC"
          : "ORDER BY u.createdAt DESC";

  const where = `
    FROM Users u
    INNER JOIN UserRole ur ON ur.userID = u.id
    LEFT JOIN Profiles p ON p.userID = u.id
    LEFT JOIN FreelancerSkills fs ON fs.profileID = p.id
    LEFT JOIN Review r ON r.receiverID = u.id
    WHERE ${whereParts.join(" AND ")}
  `;

  return paginate({
    baseSql: `SELECT u.id, u.fullName, u.email, p.hourlyRate, p.bio,
                     ROUND(AVG(CAST(r.stars AS DECIMAL(10,2))), 1) AS averageRating,
                     COUNT(DISTINCT r.id) AS reviewCount`,
    countSql: "SELECT COUNT(DISTINCT u.id) AS total",
    where,
    params,
    orderBy: `GROUP BY u.id, u.fullName, u.email, p.hourlyRate, p.bio ${orderBy}`,
    paging,
  });
}

export async function searchUsers(filters = {}) {
  const paging = getPaging(filters);
  const whereParts = ["u.isActive = TRUE"];
  const params = [];

  if (filters.q) {
    whereParts.push("(u.fullName LIKE ? ESCAPE '\\\\' OR u.email LIKE ? ESCAPE '\\\\')");
    params.push(escapeLike(filters.q), escapeLike(filters.q));
  }
  if (filters.roleID) {
    whereParts.push("ur.roleID = ?");
    params.push(Number(filters.roleID));
  }

  return paginate({
    baseSql: `SELECT u.id, u.fullName, u.email, u.createdAt, ur.roleID, r.roleName`,
    countSql: "SELECT COUNT(DISTINCT u.id) AS total",
    where: `FROM Users u INNER JOIN UserRole ur ON ur.userID = u.id INNER JOIN Roles r ON r.id = ur.roleID WHERE ${whereParts.join(" AND ")}`,
    params,
    orderBy: "ORDER BY u.createdAt DESC",
    paging,
  });
}

export async function searchApplications(filters = {}, actor = {}) {
  const paging = getPaging(filters);
  const whereParts = ["pr.isDeleted = FALSE"];
  const params = [];

  if (actor.roleID === 2) {
    whereParts.push("p.clientID = ?");
    params.push(actor.userID);
  } else if (actor.roleID === 3) {
    whereParts.push("pr.userID = ?");
    params.push(actor.userID);
  }

  if (filters.q) {
    whereParts.push("(p.title LIKE ? ESCAPE '\\\\' OR pr.coverLetter LIKE ? ESCAPE '\\\\' OR u.fullName LIKE ? ESCAPE '\\\\' OR u.email LIKE ? ESCAPE '\\\\')");
    params.push(escapeLike(filters.q), escapeLike(filters.q), escapeLike(filters.q), escapeLike(filters.q));
  }
  if (filters.status) {
    whereParts.push("pr.propStatus = ?");
    params.push(filters.status);
  }
  if (filters.projectID) {
    whereParts.push("pr.projectID = ?");
    params.push(Number(filters.projectID));
  }

  return paginate({
    baseSql: `SELECT pr.id, pr.projectID, pr.userID AS freelancerID, pr.coverLetter,
                     pr.bidAmount, pr.estimatedDays, pr.propStatus, pr.createdAt,
                     p.title AS projectTitle, p.clientID, u.fullName AS freelancerName, u.email AS freelancerEmail`,
    countSql: "SELECT COUNT(DISTINCT pr.id) AS total",
    where: `FROM Proposal pr INNER JOIN Project p ON p.id = pr.projectID INNER JOIN Users u ON u.id = pr.userID WHERE ${whereParts.join(" AND ")}`,
    params,
    orderBy: "ORDER BY pr.createdAt DESC",
    paging,
  });
}

export async function searchContracts(filters = {}, actor = {}) {
  const paging = getPaging(filters);
  const whereParts = ["1=1"];
  const params = [];

  if (actor.roleID === 2) {
    whereParts.push("c.clientID = ?");
    params.push(actor.userID);
  } else if (actor.roleID === 3) {
    whereParts.push("c.freelancerID = ?");
    params.push(actor.userID);
  }

  if (filters.q) {
    whereParts.push("(p.title LIKE ? ESCAPE '\\\\' OR uc.fullName LIKE ? ESCAPE '\\\\' OR uf.fullName LIKE ? ESCAPE '\\\\')");
    params.push(escapeLike(filters.q), escapeLike(filters.q), escapeLike(filters.q));
  }
  if (filters.status) {
    whereParts.push("c.cStatus = ?");
    params.push(filters.status);
  }

  return paginate({
    baseSql: `SELECT c.id, c.proposalID, c.clientID, c.freelancerID, c.totalAmount,
                     c.cStatus, c.startDate, c.endDate, p.id AS projectID,
                     p.title AS projectTitle, uc.fullName AS clientName,
                     uf.fullName AS freelancerName`,
    countSql: "SELECT COUNT(DISTINCT c.id) AS total",
    where: `FROM Contracts c INNER JOIN Proposal pr ON pr.id = c.proposalID INNER JOIN Project p ON p.id = pr.projectID INNER JOIN Users uc ON uc.id = c.clientID INNER JOIN Users uf ON uf.id = c.freelancerID WHERE ${whereParts.join(" AND ")}`,
    params,
    orderBy: filters.sort === "amount_desc" ? "ORDER BY c.totalAmount DESC" : "ORDER BY c.startDate DESC, c.id DESC",
    paging,
  });
}

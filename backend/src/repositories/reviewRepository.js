import { db } from "../config/db.js";

function parseTags(tags) {
  if (!tags) return [];
  if (typeof tags === "string") {
    try { return JSON.parse(tags); } catch { return []; }
  }
  return tags;
}

function buildReviewWhere(receiverID, options = {}) {
  const whereParts = ["receiverID = ?", "deletedAt IS NULL"];
  const params = [receiverID];

  if (options.rating !== undefined && options.rating !== null) {
    whereParts.push("stars = ?");
    params.push(Number(options.rating));
  }

  if (options.minHelpful !== undefined && options.minHelpful !== null) {
    whereParts.push("helpfulCount >= ?");
    params.push(Number(options.minHelpful));
  }

  if (options.from) {
    whereParts.push("createdAt >= ?");
    params.push(new Date(options.from));
  }
  if (options.to) {
    whereParts.push("createdAt <= ?");
    params.push(new Date(options.to));
  }

  const where = whereParts.join(" AND ");
  return { where, params };
}

function getSortClause(sortOption) {
  switch (sortOption) {
    case "newest": return "ORDER BY createdAt DESC";
    case "oldest": return "ORDER BY createdAt ASC";
    case "helpful": return "ORDER BY helpfulCount DESC, createdAt DESC";
    case "rating_desc": return "ORDER BY stars DESC, createdAt DESC";
    case "rating_asc": return "ORDER BY stars ASC, createdAt DESC";
    default: return "ORDER BY createdAt DESC";
  }
}

// ==================== MYSQL IMPLEMENTATION (reviews now stored in MySQL) ====================

export async function createReview({
  rating,
  title,
  comment,
  tags,
  contractID,
  reviewerID,
  receiverID,
}) {
  try {
    const tagsJson = tags && tags.length ? JSON.stringify(tags) : null;

    const [result] = await db.execute(
      `INSERT INTO Review 
       (stars, title, comment, tags, contractID, reviewerID, receiverID, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [rating, title || null, comment, tagsJson, contractID, reviewerID, receiverID]
    );

    const id = result.insertId;
    return {
      id,
      reviewID: id,
      rating,
      title: title || null,
      comment,
      tags: tags ?? [],
      contractID,
      reviewerID,
      receiverID,
      createdAt: new Date(),
      deletedAt: null,
      helpfulCount: 0,
      isVerified: false,
    };
  } catch (err) {
    console.error("❌ Error creating review:", err);
    throw err;
  }
}

export async function getReviewById(reviewID) {
  const [rows] = await db.execute(
    `SELECT * FROM Review WHERE id = ? AND deletedAt IS NULL LIMIT 1`,
    [reviewID]
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    ...r,
    reviewID: r.id,
    rating: r.stars,
    tags: parseTags(r.tags),
  };
}

export async function getReviewByContractAndReviewer(contractID, reviewerID) {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM Review 
       WHERE contractID = ? AND reviewerID = ? AND deletedAt IS NULL 
       LIMIT 1`,
      [contractID, reviewerID]
    );
    if (!rows[0]) return null;
    const r = rows[0];
    return {
      ...r,
      reviewID: r.id,
      rating: r.stars,
      tags: parseTags(r.tags),
    };
  } catch (err) {
    console.error("❌ Error in getReviewByContractAndReviewer:", err.message);
    throw err;
  }
}

export async function hasReviewedAlready(contractID, reviewerID) {
  try {
    const review = await getReviewByContractAndReviewer(contractID, reviewerID);
    return Boolean(review);
  } catch (err) {
    console.error(`❌ hasReviewedAlready failed for contract ${contractID}:`, err.message);
    return false;
  }
}

export async function getReviewsByReceiverId(receiverID, options = {}) {
  const page = Number(options.page) || 1;
  const limit = Math.min(Math.max(Number(options.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const { where, params } = buildReviewWhere(receiverID, options);
  const sort = getSortClause(options.sort);

  const countSql = `SELECT COUNT(*) as total FROM Review WHERE ${where}`;
  const [countRows] = await db.execute(countSql, params);
  const total = countRows[0]?.total || 0;

  const dataSql = `
    SELECT * FROM Review 
    WHERE ${where} 
    ${sort} 
    LIMIT ${limit} OFFSET ${skip}
  `;
  const [rows] = await db.execute(dataSql, params);

  const reviews = rows.map((r) => ({
    ...r,
    reviewID: r.id,
    rating: r.stars,
    tags: parseTags(r.tags),
  }));

  return {
    reviews,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function updateReviewById(reviewID, updates) {
  const sets = [];
  const values = [];

  if (updates.rating !== undefined) {
    sets.push("stars = ?");
    values.push(updates.rating);
  }
  if (updates.title !== undefined) {
    sets.push("title = ?");
    values.push(updates.title);
  }
  if (updates.comment !== undefined) {
    sets.push("comment = ?");
    values.push(updates.comment);
  }
  if (updates.tags !== undefined) {
    sets.push("tags = ?");
    values.push(updates.tags ? JSON.stringify(updates.tags) : null);
  }

  if (sets.length === 0) return null;

  sets.push("updatedAt = NOW()");
  values.push(reviewID);

  await db.execute(
    `UPDATE Review SET ${sets.join(", ")} WHERE id = ? AND deletedAt IS NULL`,
    values
  );

  return getReviewById(reviewID);
}

export async function softDeleteReview(reviewID) {
  await db.execute(
    `UPDATE Review SET deletedAt = NOW() WHERE id = ?`,
    [reviewID]
  );
  return getReviewById(reviewID);
}

export async function getAverageRatingByReceiverId(receiverID) {
  const [rows] = await db.execute(
    `SELECT AVG(stars) as averageRating, COUNT(*) as reviewCount 
     FROM Review 
     WHERE receiverID = ? AND deletedAt IS NULL`,
    [receiverID]
  );
  const result = rows[0];
  return {
    receiverID,
    averageRating: result?.averageRating ? Number(Number(result.averageRating).toFixed(2)) : null,
    reviewCount: result?.reviewCount || 0,
  };
}

export async function getRatingStatsByReceiverId(receiverID) {
  const [rows] = await db.execute(
    `SELECT stars as rating, COUNT(*) as count 
     FROM Review 
     WHERE receiverID = ? AND deletedAt IS NULL 
     GROUP BY stars 
     ORDER BY stars`,
    [receiverID]
  );

  const stats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, total: 0 };
  rows.forEach((row) => {
    stats[row.rating] = row.count;
    stats.total += row.count;
  });

  return { receiverID, stats };
}
import { db } from "../config/db.js";

export async function createReview({
  stars,
  comment,
  contractID,
  reviewerID,
  receiverID,
}) {
  const [result] = await db.execute(
    `INSERT INTO Review (stars, comment, contractID, reviewerID, receiverID)
     VALUES (?, ?, ?, ?, ?)`,
    [String(stars), comment, contractID, reviewerID, receiverID],
  );

  const [rows] = await db.execute(
    `SELECT
        r.*,
        reviewer.fullName AS reviewerName,
        receiver.fullName AS receiverName
     FROM Review r
     INNER JOIN Users reviewer ON reviewer.id = r.reviewerID
     INNER JOIN Users receiver ON receiver.id = r.receiverID
     WHERE r.id = ?
     LIMIT 1`,
    [result.insertId],
  );

  return rows[0];
}

export async function getReviewsByReceiverId(receiverID) {
  const [rows] = await db.execute(
    `SELECT
        r.*,
        reviewer.fullName AS reviewerName,
        receiver.fullName AS receiverName,
        c.cStatus AS contractStatus,
        p.id AS projectID,
        p.title AS projectTitle
     FROM Review r
     INNER JOIN Users reviewer ON reviewer.id = r.reviewerID
     INNER JOIN Users receiver ON receiver.id = r.receiverID
     INNER JOIN Contracts c ON c.id = r.contractID
     INNER JOIN Proposal pr ON pr.id = c.proposalID
     INNER JOIN Project p ON p.id = pr.projectID
     WHERE r.receiverID = ?
     ORDER BY r.createdAt DESC`,
    [receiverID],
  );
  return rows;
}

export async function getReviewByContractAndReviewer(contractID, reviewerID) {
  const [rows] = await db.execute(
    `SELECT *
     FROM Review
     WHERE contractID = ? AND reviewerID = ?
     LIMIT 1`,
    [contractID, reviewerID],
  );
  return rows[0] ?? null;
}

export async function hasReviewedAlready(contractID, reviewerID) {
  const review = await getReviewByContractAndReviewer(contractID, reviewerID);
  return Boolean(review);
}

export async function getRatingSummaryByReceiverId(receiverID) {
  const [rows] = await db.execute(
    `SELECT
        ROUND(AVG(CAST(stars AS DECIMAL(10, 2))), 2) AS averageRating,
        COUNT(*) AS reviewCount
     FROM Review
     WHERE receiverID = ?`,
    [receiverID],
  );
  return {
    receiverID,
    averageRating:
      rows[0]?.averageRating == null ? null : Number(rows[0].averageRating),
    reviewCount: Number(rows[0]?.reviewCount ?? 0),
  };
}

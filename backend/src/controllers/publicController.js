import { db } from "../config/db.js";

export async function getHomeData(req, res, next) {
  try {
    const [categories] = await db.execute(
      `SELECT c.id, c.cName, c.slug, c.cDesc, c.iconUrl, c.sortOrder
       FROM Categories c
       WHERE c.isActive = TRUE
       ORDER BY c.sortOrder ASC, c.cName ASC
       LIMIT 8`,
    );

    const [topFreelancers] = await db.execute(`
      SELECT u.id, u.fullName, u.email, p.hourlyRate, p.bio,
             ROUND(AVG(CAST(rv.stars AS DECIMAL(10,2))), 1) AS avgRating,
             COUNT(rv.id) AS reviewCount,
             COALESCE(SUM(c.totalAmount), 0) AS totalEarned
      FROM Users u
      INNER JOIN UserRole ur ON ur.userID = u.id AND ur.roleID = 3
      LEFT JOIN Profiles p ON p.userID = u.id
      LEFT JOIN Review rv ON rv.receiverID = u.id
      LEFT JOIN Contracts c ON c.freelancerID = u.id AND c.cStatus IN ('active', 'completed')
      WHERE u.isActive = TRUE
      GROUP BY u.id, u.fullName, u.email, p.hourlyRate, p.bio
      ORDER BY avgRating DESC, reviewCount DESC, totalEarned DESC
      LIMIT 6
    `);

    const [testimonials] = await db.execute(
      `SELECT t.id, t.fullName, t.roleTitle, t.rating, t.comment, t.createdAt
       FROM Testimonials t
       WHERE t.isPublished = TRUE
       ORDER BY t.createdAt DESC
       LIMIT 6`,
    );

    return res.status(200).json({
      categories,
      topFreelancers,
      testimonials,
    });
  } catch (err) {
    next(err);
  }
}

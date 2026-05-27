import { db } from "../config/db.js";

const categorySelect = `
  SELECT
    c.id,
    c.cName,
    c.slug,
    c.cDesc,
    c.iconUrl,
    c.parentCategoryID,
    c.sortOrder,
    c.isActive,
    c.createdAt,
    c.updatedAt,
    COUNT(s.id) AS skillCount
  FROM Categories c
  LEFT JOIN Skills s ON s.categoryID = c.id
`;

const categoryGroupBy = `
  GROUP BY
    c.id,
    c.cName,
    c.slug,
    c.cDesc,
    c.iconUrl,
    c.parentCategoryID,
    c.sortOrder,
    c.isActive,
    c.createdAt,
    c.updatedAt
`;

export async function getCategories({ includeInactive = false } = {}) {
  const where = includeInactive ? "1=1" : "c.isActive = TRUE";
  const [rows] = await db.execute(
    `${categorySelect}
     WHERE ${where}
     ${categoryGroupBy}
     ORDER BY c.sortOrder ASC, c.cName ASC`,
  );
  return rows;
}

export async function getCategoryTree({ includeInactive = false } = {}) {
  return getCategories({ includeInactive });
}

export async function getCategoryById(id) {
  const [rows] = await db.execute(
    `${categorySelect}
     WHERE c.id = ?
     ${categoryGroupBy}
     LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

export async function findCategoryByName(cName) {
  const [rows] = await db.execute(
    `SELECT id FROM Categories WHERE cName = ? LIMIT 1`,
    [cName],
  );
  return rows[0] || null;
}

export async function findCategoryBySlug(slug) {
  const [rows] = await db.execute(
    `SELECT id FROM Categories WHERE slug = ? LIMIT 1`,
    [slug],
  );
  return rows[0] || null;
}

export async function createCategory({
  cName,
  slug,
  cDesc,
  iconUrl,
  sortOrder,
  parentCategoryID,
  isActive,
}) {
  const [result] = await db.execute(
    `INSERT INTO Categories (cName, slug, cDesc, iconUrl, sortOrder, parentCategoryID, isActive)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      cName,
      slug,
      cDesc,
      iconUrl || null,
      sortOrder ?? 0,
      parentCategoryID || null,
      Boolean(isActive),
    ],
  );
  return getCategoryById(result.insertId);
}

export async function updateCategory(
  id,
  { cName, slug, cDesc, iconUrl, sortOrder, parentCategoryID, isActive },
) {
  const [result] = await db.execute(
    `UPDATE Categories
     SET cName = ?, slug = ?, cDesc = ?, iconUrl = ?, sortOrder = ?, parentCategoryID = ?, isActive = ?
     WHERE id = ?`,
    [
      cName,
      slug,
      cDesc,
      iconUrl || null,
      sortOrder ?? 0,
      parentCategoryID || null,
      Boolean(isActive),
      id,
    ],
  );
  return result.affectedRows > 0 ? getCategoryById(id) : null;
}

export async function deactivateCategory(id) {
  const [result] = await db.execute(
    `UPDATE Categories SET isActive = FALSE WHERE id = ?`,
    [id],
  );
  return result.affectedRows > 0;
}

export async function findCategoryAncestors(categoryID) {
  const ancestors = [];
  let currentID = categoryID;

  while (currentID) {
    const [rows] = await db.execute(
      `SELECT parentCategoryID FROM Categories WHERE id = ? LIMIT 1`,
      [currentID],
    );
    const row = rows[0];
    if (!row || row.parentCategoryID == null) {
      break;
    }
    if (ancestors.includes(row.parentCategoryID)) {
      break;
    }
    ancestors.push(row.parentCategoryID);
    currentID = row.parentCategoryID;
  }

  return ancestors;
}

export async function hasCategorySkills(categoryID) {
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS count FROM Skills WHERE categoryID = ?`,
    [categoryID],
  );
  return Number(rows[0]?.count ?? 0) > 0;
}

export async function hasChildCategories(categoryID) {
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS count FROM Categories WHERE parentCategoryID = ?`,
    [categoryID],
  );
  return Number(rows[0]?.count ?? 0) > 0;
}

export async function getSkillsInCategory(
  categoryID,
  { includeInactive = false } = {},
) {
  const where = includeInactive ? "1=1" : "s.isActive = TRUE";
  const [rows] = await db.execute(
    `SELECT s.id, s.skillName, s.slug, s.isActive, s.createdAt, s.categoryID,
            c.cName AS categoryName
     FROM Skills s
     INNER JOIN Categories c ON c.id = s.categoryID
     WHERE s.categoryID = ? AND ${where}
     ORDER BY s.skillName ASC`,
    [categoryID],
  );
  return rows;
}

export async function updateCategoryOrder(orders) {
  if (!Array.isArray(orders) || !orders.length) {
    return 0;
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    let updated = 0;
    for (const item of orders) {
      const categoryId = Number(item.id);
      const sortOrder = Number(item.sortOrder);
      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        continue;
      }
      if (!Number.isInteger(sortOrder)) {
        continue;
      }
      const [result] = await connection.execute(
        `UPDATE Categories SET sortOrder = ? WHERE id = ?`,
        [sortOrder, categoryId],
      );
      updated += result.affectedRows;
    }
    await connection.commit();
    return updated;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.release();
  }
}

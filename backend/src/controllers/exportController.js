import ExcelJS from "exceljs";
import multer from "multer";
import bcrypt from "bcryptjs";
import { parse } from "csv-parse/sync";
import { db } from "../config/db.js";
import { validate } from "../validation/validate.js";
import { projectSchemas, userSchemas } from "../validation/schemas.js";

const IMPORT_FILE_TYPES = new Set([
  "text/csv",
  "application/csv",
  "application/json",
  "text/plain",
  "application/vnd.ms-excel",
]);

export const uploadImportFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const name = String(file.originalname || "").toLowerCase();
    const validExtension = name.endsWith(".csv") || name.endsWith(".json");
    if (validExtension && (!file.mimetype || IMPORT_FILE_TYPES.has(file.mimetype))) {
      return cb(null, true);
    }
    return cb(new Error("Only CSV and JSON import files up to 2MB are allowed."));
  },
});

function escapeCsv(value) {
  if (value == null) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function parseCsv(text) {
  return parse(text, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

function parseImportRows(file) {
  const text = file.buffer.toString("utf8");
  const rows = file.originalname.toLowerCase().endsWith(".json")
    ? JSON.parse(text)
    : parseCsv(text);

  if (!Array.isArray(rows)) {
    const err = new Error("Import file must contain an array of rows.");
    err.statusCode = 400;
    throw err;
  }

  return rows;
}

async function ensureClientExists(clientID) {
  const [[client]] = await db.execute(
    `SELECT u.id
     FROM Users u
     INNER JOIN UserRole ur ON ur.userID = u.id
     WHERE u.id = ? AND ur.roleID = 2 AND u.isActive = TRUE
     LIMIT 1`,
    [clientID],
  );
  return Boolean(client);
}

export async function sendRows(res, rows, format, filename) {
  if (format === "json") {
    return res.status(200).json({ rows });
  }

  const columns = rows.length > 0 ? Object.keys(rows[0]) : ["id"];

  if (format === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Export");
    sheet.columns = columns.map((key) => ({
      header: key,
      key,
      width: Math.max(14, key.length + 2),
    }));
    sheet.addRows(rows);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}.xlsx"`,
    );
    await workbook.xlsx.write(res);
    return res.end();
  }

  const csv = [
    columns.map(escapeCsv).join(","),
    ...rows.map((row) => columns.map((key) => escapeCsv(row[key])).join(",")),
  ].join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
  return res.status(200).send(csv);
}

function exportScope(req, tableAlias) {
  if (Number(req.user.roleID) === 1) return { sql: "1=1", params: [] };
  if (Number(req.user.roleID) === 2) {
    if (tableAlias === "p") return { sql: "p.clientID = ?", params: [req.user.id] };
    if (tableAlias === "pr") return { sql: "p.clientID = ?", params: [req.user.id] };
    if (tableAlias === "c") return { sql: "c.clientID = ?", params: [req.user.id] };
  }
  if (Number(req.user.roleID) === 3) {
    if (tableAlias === "pr") return { sql: "pr.userID = ?", params: [req.user.id] };
    if (tableAlias === "c") return { sql: "c.freelancerID = ?", params: [req.user.id] };
  }
  return { sql: "1=0", params: [] };
}

async function queryRows(kind, req) {
  if (kind === "projects") {
    const scope = exportScope(req, "p");
    const [rows] = await db.execute(
      `SELECT p.id, p.title, p.pDesc, p.budget, p.deadline, p.pStatus,
              u.fullName AS clientName, p.createdAt
       FROM Project p INNER JOIN Users u ON u.id = p.clientID
       WHERE ${scope.sql}
       ORDER BY p.createdAt DESC`,
      scope.params,
    );
    return rows;
  }

  if (kind === "applications") {
    const scope = exportScope(req, "pr");
    const [rows] = await db.execute(
      `SELECT pr.id, pr.projectID, p.title AS projectTitle,
              pr.userID AS freelancerID, u.fullName AS freelancerName,
              pr.bidAmount, pr.estimatedDays, pr.propStatus, pr.createdAt
       FROM Proposal pr
       INNER JOIN Project p ON p.id = pr.projectID
       INNER JOIN Users u ON u.id = pr.userID
       WHERE pr.isDeleted = FALSE AND ${scope.sql}
       ORDER BY pr.createdAt DESC`,
      scope.params,
    );
    return rows;
  }

  if (kind === "contracts") {
    const scope = exportScope(req, "c");
    const [rows] = await db.execute(
      `SELECT c.id, p.title AS projectTitle, c.clientID, uc.fullName AS clientName,
              c.freelancerID, uf.fullName AS freelancerName, c.totalAmount,
              c.cStatus, c.startDate, c.endDate
       FROM Contracts c
       INNER JOIN Proposal pr ON pr.id = c.proposalID
       INNER JOIN Project p ON p.id = pr.projectID
       INNER JOIN Users uc ON uc.id = c.clientID
       INNER JOIN Users uf ON uf.id = c.freelancerID
       WHERE ${scope.sql}
       ORDER BY c.id DESC`,
      scope.params,
    );
    return rows;
  }

  if (kind === "users") {
    const [rows] = await db.execute(
      `SELECT u.id, u.fullName, u.email, u.createdAt, ur.roleID, r.roleName
       FROM Users u
       INNER JOIN UserRole ur ON ur.userID = u.id
       INNER JOIN Roles r ON r.id = ur.roleID
       WHERE u.isActive = TRUE
       ORDER BY u.createdAt DESC`,
    );
    return rows;
  }

  const [rows] = await db.execute(
    `SELECT u.id, u.fullName, u.email, p.hourlyRate, p.bio,
            ROUND(AVG(CAST(r.stars AS DECIMAL(10,2))), 1) AS averageRating,
            COUNT(DISTINCT r.id) AS reviewCount
     FROM Users u
     INNER JOIN UserRole ur ON ur.userID = u.id AND ur.roleID = 3
     LEFT JOIN Profiles p ON p.userID = u.id
     LEFT JOIN Review r ON r.receiverID = u.id
     WHERE u.isActive = TRUE
     GROUP BY u.id, u.fullName, u.email, p.hourlyRate, p.bio
     ORDER BY u.fullName ASC`,
  );
  return rows;
}

export function exportList(kind) {
  return async (req, res, next) => {
    try {
      if (kind === "users" && Number(req.user.roleID) !== 1) {
        return res.status(403).json({ message: "Admin access required." });
      }
      const format = ["csv", "xlsx", "json"].includes(req.query.format)
        ? req.query.format
        : "csv";
      const rows = await queryRows(kind, req);
      return sendRows(res, rows, format, kind);
    } catch (err) {
      next(err);
    }
  };
}

export async function importProjects(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Upload file is required." });
    }
    const rows = parseImportRows(req.file);
    const body = req.validated?.body ?? {};
    const clientID = Number(req.user.roleID) === 1
      ? Number(body.clientID || rows[0]?.clientID)
      : Number(req.user.id);
    if (!Number.isInteger(clientID) || clientID <= 0) {
      return res.status(400).json({ message: "Valid clientID is required." });
    }
    if (!(await ensureClientExists(clientID))) {
      return res.status(400).json({ message: "clientID must belong to an active client." });
    }

    const skipped = [];
    const projects = [];
    rows.forEach((row, index) => {
      try {
        projects.push(validate(projectSchemas.clientCreateOrUpdate, row));
      } catch (err) {
        skipped.push({ row: index + 1, reason: err.message });
      }
    });

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      for (const project of projects) {
        await conn.execute(
        `INSERT INTO Project (title, pDesc, budget, deadline, clientID, pStatus)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [
          project.title,
          project.pDesc,
          project.budget,
          project.deadline,
          clientID,
        ],
        );
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    return res.status(201).json({ message: "Projects imported.", created: projects.length, skipped });
  } catch (err) {
    next(err);
  }
}

export async function importUsers(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Upload file is required." });
    }
    const rows = parseImportRows(req.file);

    let created = 0;
    const skipped = [];
    const users = [];
    rows.forEach((row, index) => {
      try {
        users.push(
          validate(userSchemas.register, {
            ...row,
            fullName: row.fullName || row.name,
            roleID: row.roleID || 2,
            password: row.password || "ImportTemp123!@",
          }),
        );
      } catch (err) {
        skipped.push({ row: index + 1, email: row.email || null, reason: err.message });
      }
    });

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      for (const user of users) {
        const [existingRows] = await conn.execute(
          "SELECT id FROM Users WHERE email = ? LIMIT 1",
          [user.email],
        );
        if (existingRows.length > 0) {
          skipped.push({ email: user.email, reason: "Email already exists" });
          continue;
        }

        const passwordHash = await bcrypt.hash(user.password, 10);
        const [result] = await conn.execute(
          "INSERT INTO Users (email, passwordHash, fullName) VALUES (?, ?, ?)",
          [user.email, passwordHash, user.fullName],
        );
        const userID = result.insertId;
        await conn.execute("INSERT INTO UserRole (userID, roleID) VALUES (?, ?)", [
          userID,
          user.roleID,
        ]);
        await conn.execute(
          `INSERT INTO Profiles (userID, pictureID, hourlyRate, portofoliUrl, bio)
           VALUES (?, NULL, NULL, NULL, NULL)`,
          [userID],
        );
        created += 1;
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    return res.status(201).json({ message: "Users imported.", created, skipped });
  } catch (err) {
    next(err);
  }
}

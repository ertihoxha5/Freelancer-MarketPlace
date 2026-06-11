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

  if (format === "pdf") {
    const lines = [];
    lines.push(filename + " - " + rows.length + " records");
    lines.push("");

    if (columns.length > 0) {
      lines.push(columns.join(" | "));
      lines.push("-".repeat(Math.min(120, columns.join(" | ").length + 10)));
    }

    rows.forEach(row => {
      const line = columns.map(key => {
        let val = row[key];
        if (val == null) val = "";
        else val = String(val).replace(/[\r\n]/g, " ").trim();
        if (val.length > 40) val = val.substring(0, 37) + "...";
        return val;
      }).join(" | ");
      lines.push(line);
    });

    const content = lines.join("\n");
    const escapedContent = content
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/\n/g, ") Tj\n0 -14 Td (");

    const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${escapedContent.length + 80} >>
stream
BT
/F1 9 Tf
40 760 Td
(${filename} Export) Tj
0 -18 Td
(${escapedContent}) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000266 00000 n
0000000${(280 + escapedContent.length).toString().padStart(6, "0")} 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${320 + escapedContent.length}
%%EOF`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.pdf"`);
    return res.status(200).send(pdf);
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

  if (kind === "payments") {
    const [rows] = await db.execute(
      `SELECT p.id, p.contractID, p.amount, p.currency, p.pStatus, p.createdAt,
              c.clientID, uc.fullName AS clientName,
              c.freelancerID, uf.fullName AS freelancerName,
              pr.title AS projectTitle
       FROM Payment p
       INNER JOIN Contracts c ON c.id = p.contractID
       INNER JOIN Proposal prop ON prop.id = c.proposalID
       INNER JOIN Project pr ON pr.id = prop.projectID
       INNER JOIN Users uc ON uc.id = c.clientID
       INNER JOIN Users uf ON uf.id = c.freelancerID
       ORDER BY p.createdAt DESC`,
    );
    return rows;
  }

  if (kind === "disputes") {
    const [rows] = await db.execute(
      `SELECT d.id, d.contractID, d.reason, d.dStatus, d.createdAt,
              p.title AS projectTitle,
              uc.fullName AS clientName,
              uf.fullName AS freelancerName
       FROM Disputes d
       INNER JOIN Contracts c ON c.id = d.contractID
       INNER JOIN Proposal prop ON prop.id = c.proposalID
       INNER JOIN Project p ON p.id = prop.projectID
       INNER JOIN Users uc ON uc.id = c.clientID
       INNER JOIN Users uf ON uf.id = c.freelancerID
       ORDER BY d.createdAt DESC`,
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

export async function importApplications(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Upload file is required." });
    }
    const rows = parseImportRows(req.file);
    const body = req.validated?.body ?? {};
    const projectID = Number(body.projectID || rows[0]?.projectID);
    if (!Number.isInteger(projectID) || projectID <= 0) {
      return res.status(400).json({ message: "Valid projectID is required for applications import." });
    }

    const skipped = [];
    const applications = [];
    rows.forEach((row, index) => {
      try {
        const app = {
          projectID: Number(row.projectID || projectID),
          userID: Number(row.userID || row.freelancerID),
          bidAmount: Number(row.bidAmount || 0),
          estimatedDays: Number(row.estimatedDays || 7),
          coverLetter: row.coverLetter || row.cover_letter || "Imported application",
          propStatus: row.propStatus || "pending",
        };
        if (!app.userID) throw new Error("userID/freelancerID required");
        applications.push(app);
      } catch (err) {
        skipped.push({ row: index + 1, reason: err.message });
      }
    });

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      for (const app of applications) {
        await conn.execute(
          `INSERT INTO Proposal (projectID, userID, coverLetter, bidAmount, estimatedDays, propStatus, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [app.projectID, app.userID, app.coverLetter, app.bidAmount, app.estimatedDays, app.propStatus],
        );
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    return res.status(201).json({ message: "Applications imported.", created: applications.length, skipped });
  } catch (err) {
    next(err);
  }
}

export async function importContracts(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Upload file is required." });
    }
    const rows = parseImportRows(req.file);

    const skipped = [];
    const contracts = [];
    rows.forEach((row, index) => {
      try {
        const c = {
          proposalID: Number(row.proposalID),
          clientID: Number(row.clientID),
          freelancerID: Number(row.freelancerID),
          totalAmount: Number(row.totalAmount || 0),
          cStatus: row.cStatus || "active",
          startDate: row.startDate || null,
          endDate: row.endDate || null,
        };
        if (!c.proposalID || !c.clientID || !c.freelancerID) {
          throw new Error("proposalID, clientID, freelancerID required");
        }
        contracts.push(c);
      } catch (err) {
        skipped.push({ row: index + 1, reason: err.message });
      }
    });

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      for (const c of contracts) {
        await conn.execute(
          `INSERT INTO Contracts (proposalID, clientID, freelancerID, totalAmount, cStatus, startDate, endDate)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [c.proposalID, c.clientID, c.freelancerID, c.totalAmount, c.cStatus, c.startDate, c.endDate],
        );
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    return res.status(201).json({ message: "Contracts imported.", created: contracts.length, skipped });
  } catch (err) {
    next(err);
  }
}

export async function importFreelancers(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Upload file is required." });
    }
    const rows = parseImportRows(req.file);

    let created = 0;
    const skipped = [];
    const freelancers = [];
    rows.forEach((row, index) => {
      try {
        freelancers.push({
          fullName: row.fullName || row.name,
          email: row.email,
          password: row.password || "ImportTemp123!@",
          hourlyRate: Number(row.hourlyRate || 0),
          bio: row.bio || "",
        });
      } catch (err) {
        skipped.push({ row: index + 1, email: row.email || null, reason: err.message });
      }
    });

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      for (const f of freelancers) {
        if (!f.email || !f.fullName) {
          skipped.push({ email: f.email, reason: "Missing email or fullName" });
          continue;
        }
        const [existing] = await conn.execute("SELECT id FROM Users WHERE email = ? LIMIT 1", [f.email]);
        if (existing.length > 0) {
          skipped.push({ email: f.email, reason: "Email already exists" });
          continue;
        }

        const passwordHash = await bcrypt.hash(f.password, 10);
        const [userRes] = await conn.execute(
          "INSERT INTO Users (email, passwordHash, fullName) VALUES (?, ?, ?)",
          [f.email, passwordHash, f.fullName],
        );
        const userID = userRes.insertId;
        await conn.execute("INSERT INTO UserRole (userID, roleID) VALUES (?, 3)", [userID]);
        await conn.execute(
          `INSERT INTO Profiles (userID, hourlyRate, bio) VALUES (?, ?, ?)`,
          [userID, f.hourlyRate, f.bio],
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

    return res.status(201).json({ message: "Freelancers imported.", created, skipped });
  } catch (err) {
    next(err);
  }
}

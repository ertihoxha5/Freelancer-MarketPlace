import { db } from "../config/db.js";
import * as projectRepository from "../repositories/projectRepository.js";
import { validatedParams, validatedBody } from "../middleware/validateRequest.js";
import {
  forbiddenError,
  notFoundError,
} from "../utils/errors.js";

function isClient(req) {
  return Number(req.user?.roleID) === 2;
}

async function getContractForWorkspace(req) {
  const { id: contractID } = validatedParams(req);
  const contract = await projectRepository.getContractById(contractID);
  if (!contract) {
    throw notFoundError("Contract not found.");
  }

  const uid = Number(req.user.id);
  const isParty =
    (isClient(req) && Number(contract.clientID) === uid) ||
    (!isClient(req) && Number(contract.freelancerID) === uid);

  if (!isParty) {
    throw forbiddenError("You do not have access to this contract workspace.");
  }

  return contract;
}

export async function getWorkspace(req, res, next) {
  try {
    const contract = await getContractForWorkspace(req);
    const isFreelancer = !isClient(req);
    const freelancerID = contract.freelancerID;

    // Todos (always shared view)
    const [todos] = await db.execute(
      `SELECT id, freelancerID, title, description, status, dueDate, createdAt, updatedAt
       FROM WorkspaceTodos
       WHERE contractID = ?
       ORDER BY updatedAt DESC, createdAt DESC`,
      [contract.id]
    );

    // Sections
    let sectionsQuery = `
      SELECT id, sectionKey, title, type, content, items, visible, sortOrder, updatedAt
      FROM WorkspaceSections
      WHERE contractID = ? AND freelancerID = ?
    `;
    const params = [contract.id, freelancerID];

    if (!isFreelancer) {
      sectionsQuery += ` AND visible = TRUE `;
    }
    sectionsQuery += ` ORDER BY sortOrder ASC, createdAt ASC `;

    const [sections] = await db.execute(sectionsQuery, params);

    // Parse items JSON
    const parsedSections = sections.map((s) => ({
      ...s,
      items: s.items ? (typeof s.items === "string" ? JSON.parse(s.items) : s.items) : [],
    }));

    return res.json({
      contract: {
        id: contract.id,
        projectTitle: contract.projectTitle,
        cStatus: contract.cStatus,
        totalAmount: contract.totalAmount,
      },
      isFreelancer,
      todos,
      sections: parsedSections,
    });
  } catch (err) {
    next(err);
  }
}

// ========== TODOS (Freelancer manages, client reads) ==========
export async function addTodo(req, res, next) {
  try {
    const contract = await getContractForWorkspace(req);
    if (isClient(req)) {
      throw forbiddenError("Only the freelancer can add todos.");
    }

    const { title, description, dueDate, status } = validatedBody(req);
    if (!title?.trim()) {
      return res.status(400).json({ message: "Title is required." });
    }

    const [result] = await db.execute(
      `INSERT INTO WorkspaceTodos (contractID, freelancerID, title, description, status, dueDate)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        contract.id,
        contract.freelancerID,
        title.trim(),
        description || null,
        status || "todo",
        dueDate || null,
      ]
    );

    const [rows] = await db.execute(
      `SELECT * FROM WorkspaceTodos WHERE id = ?`,
      [result.insertId]
    );
    return res.status(201).json({ todo: rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function updateTodo(req, res, next) {
  try {
    const contract = await getContractForWorkspace(req);
    if (isClient(req)) {
      throw forbiddenError("Only the freelancer can update todos.");
    }

    const { todoId } = req.params;
    const { title, description, dueDate, status } = req.body;

    const sets = [];
    const values = [];

    if (title !== undefined) { sets.push("title = ?"); values.push(title.trim()); }
    if (description !== undefined) { sets.push("description = ?"); values.push(description); }
    if (dueDate !== undefined) { sets.push("dueDate = ?"); values.push(dueDate || null); }
    if (status !== undefined) { sets.push("status = ?"); values.push(status); }

    if (sets.length === 0) {
      return res.status(400).json({ message: "No fields to update." });
    }

    sets.push("updatedAt = NOW()");
    values.push(todoId, contract.id);

    const [result] = await db.execute(
      `UPDATE WorkspaceTodos SET ${sets.join(", ")} WHERE id = ? AND contractID = ?`,
      values
    );

    if (result.affectedRows === 0) {
      throw notFoundError("Todo not found.");
    }

    const [rows] = await db.execute(`SELECT * FROM WorkspaceTodos WHERE id = ?`, [todoId]);
    return res.json({ todo: rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function deleteTodo(req, res, next) {
  try {
    const contract = await getContractForWorkspace(req);
    if (isClient(req)) {
      throw forbiddenError("Only the freelancer can delete todos.");
    }

    const { todoId } = req.params;
    await db.execute(
      `DELETE FROM WorkspaceTodos WHERE id = ? AND contractID = ?`,
      [todoId, contract.id]
    );
    return res.json({ message: "Todo deleted." });
  } catch (err) {
    next(err);
  }
}

// ========== CMS SECTIONS (Freelancer only - dynamic add/hide without code changes) ==========
export async function addSection(req, res, next) {
  try {
    const contract = await getContractForWorkspace(req);
    if (isClient(req)) {
      throw forbiddenError("Only the freelancer can manage workspace sections.");
    }

    const { title, type, content, items, visible } = validatedBody(req);
    if (!title?.trim()) {
      return res.status(400).json({ message: "Section title is required." });
    }

    const sectionType = type || "note";
    const sectionKey = `sec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const itemsJson = Array.isArray(items) ? JSON.stringify(items) : null;

    await db.execute(
      `INSERT INTO WorkspaceSections (contractID, freelancerID, sectionKey, title, type, content, items, visible)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        contract.id,
        contract.freelancerID,
        sectionKey,
        title.trim(),
        sectionType,
        content || null,
        itemsJson,
        visible !== false,
      ]
    );

    // Return fresh list
    const workspace = await getWorkspaceData(contract.id, false);
    return res.status(201).json(workspace);
  } catch (err) {
    next(err);
  }
}

export async function updateSection(req, res, next) {
  try {
    const contract = await getContractForWorkspace(req);
    if (isClient(req)) {
      throw forbiddenError("Only the freelancer can manage workspace sections.");
    }

    const { sectionId } = req.params;
    const { title, content, items, visible, sortOrder } = req.body;

    const sets = [];
    const values = [];

    if (title !== undefined) { sets.push("title = ?"); values.push(title.trim()); }
    if (content !== undefined) { sets.push("content = ?"); values.push(content); }
    if (items !== undefined) {
      sets.push("items = ?");
      values.push(Array.isArray(items) ? JSON.stringify(items) : null);
    }
    if (visible !== undefined) { sets.push("visible = ?"); values.push(!!visible); }
    if (sortOrder !== undefined) { sets.push("sortOrder = ?"); values.push(Number(sortOrder)); }

    if (sets.length === 0) {
      return res.status(400).json({ message: "No fields to update." });
    }

    sets.push("updatedAt = NOW()");
    values.push(sectionId, contract.id, contract.freelancerID);

    const [result] = await db.execute(
      `UPDATE WorkspaceSections SET ${sets.join(", ")} WHERE id = ? AND contractID = ? AND freelancerID = ?`,
      values
    );

    if (result.affectedRows === 0) {
      throw notFoundError("Section not found.");
    }

    const workspace = await getWorkspaceData(contract.id, false);
    return res.json(workspace);
  } catch (err) {
    next(err);
  }
}

export async function deleteSection(req, res, next) {
  try {
    const contract = await getContractForWorkspace(req);
    if (isClient(req)) {
      throw forbiddenError("Only the freelancer can manage workspace sections.");
    }

    const { sectionId } = req.params;
    await db.execute(
      `DELETE FROM WorkspaceSections WHERE id = ? AND contractID = ? AND freelancerID = ?`,
      [sectionId, contract.id, contract.freelancerID]
    );

    const workspace = await getWorkspaceData(contract.id, false);
    return res.json({ ...workspace, message: "Section deleted." });
  } catch (err) {
    next(err);
  }
}

// Helper used internally
async function getWorkspaceData(contractID, includeHidden = false) {
  const contract = await projectRepository.getContractById(contractID);
  if (!contract) {
    throw notFoundError("Contract not found.");
  }

  const [todos] = await db.execute(
    `SELECT * FROM WorkspaceTodos WHERE contractID = ? ORDER BY updatedAt DESC`,
    [contractID]
  );

  let sectionsSql = `SELECT * FROM WorkspaceSections WHERE contractID = ? `;
  if (!includeHidden) sectionsSql += `AND visible = TRUE `;
  sectionsSql += `ORDER BY sortOrder ASC, createdAt ASC`;

  const [sections] = await db.execute(sectionsSql, [contractID]);

  const parsedSections = sections.map((s) => ({
    ...s,
    items: s.items ? (typeof s.items === "string" ? JSON.parse(s.items) : s.items) : [],
  }));

  return {
    contract,
    todos,
    sections: parsedSections,
  };
}
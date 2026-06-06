import { db } from "../config/db.js";
import * as projectRepository from "../repositories/projectRepository.js";
import { validatedParams, validatedBody } from "../middleware/validateRequest.js";
import {
  forbiddenError,
  notFoundError,
} from "../utils/errors.js";

import { queryBus } from "../cqrs/query-bus.js";
import { commandBus } from "../cqrs/command-bus.js";

import { GetWorkspaceQuery } from "../cqrs/workspace/queries/get-workspace.query.js";
import { AddTodoCommand } from "../cqrs/workspace/commands/add-todo.command.js";
import { UpdateTodoCommand } from "../cqrs/workspace/commands/update-todo.command.js";
import { DeleteTodoCommand } from "../cqrs/workspace/commands/delete-todo.command.js";
import { AddSectionCommand } from "../cqrs/workspace/commands/add-section.command.js";

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

    const workspaceData = await queryBus.execute(
      new GetWorkspaceQuery(contract.id, isFreelancer, freelancerID)
    );

    return res.json({
      contract: {
        id: contract.id,
        projectTitle: contract.projectTitle,
        cStatus: contract.cStatus,
        totalAmount: contract.totalAmount,
      },
      isFreelancer,
      todos: workspaceData.todos,
      sections: workspaceData.sections,
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

    const todo = await commandBus.execute(
      new AddTodoCommand(
        contract.id,
        contract.freelancerID,
        title,
        description,
        dueDate,
        status
      )
    );

    return res.status(201).json({ todo });
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

    const todo = await commandBus.execute(
      new UpdateTodoCommand(todoId, contract.id, title, description, dueDate, status)
    );

    return res.json({ todo });
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

    await commandBus.execute(new DeleteTodoCommand(todoId, contract.id));

    return res.json({ message: "Todo deleted." });
  } catch (err) {
    next(err);
  }
}

// ========== CMS SECTIONS (Freelancer only - dynamic add/hide without code changes) ==========
// NOTE: These are partially migrated to CQRS. See cqrs/workspace/commands for AddSectionCommand.
// UpdateSection and DeleteSection still use direct DB for now - can be extracted similarly.
export async function addSection(req, res, next) {
  try {
    const contract = await getContractForWorkspace(req);
    if (isClient(req)) {
      throw forbiddenError("Only the freelancer can manage workspace sections.");
    }

    const { title, type, content, items, visible } = validatedBody(req);

    await commandBus.execute(
      new AddSectionCommand(
        contract.id,
        contract.freelancerID,
        title,
        type,
        content,
        items,
        visible
      )
    );

    // Re-fetch using query bus for fresh data (CQRS separation)
    const workspaceData = await queryBus.execute(
      new GetWorkspaceQuery(contract.id, true, contract.freelancerID)
    );

    return res.status(201).json({
      contract: {
        id: contract.id,
        projectTitle: contract.projectTitle,
        cStatus: contract.cStatus,
        totalAmount: contract.totalAmount,
      },
      isFreelancer: true,
      todos: workspaceData.todos,
      sections: workspaceData.sections,
    });
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

    // Re-fetch using query bus (CQRS)
    const workspaceData = await queryBus.execute(
      new GetWorkspaceQuery(contract.id, true, contract.freelancerID)
    );

    return res.json({
      contract: {
        id: contract.id,
        projectTitle: contract.projectTitle,
        cStatus: contract.cStatus,
        totalAmount: contract.totalAmount,
      },
      isFreelancer: true,
      todos: workspaceData.todos,
      sections: workspaceData.sections,
    });
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

    // Re-fetch using query bus (CQRS)
    const workspaceData = await queryBus.execute(
      new GetWorkspaceQuery(contract.id, true, contract.freelancerID)
    );

    return res.json({
      contract: {
        id: contract.id,
        projectTitle: contract.projectTitle,
        cStatus: contract.cStatus,
        totalAmount: contract.totalAmount,
      },
      isFreelancer: true,
      todos: workspaceData.todos,
      sections: workspaceData.sections,
      message: "Section deleted.",
    });
  } catch (err) {
    next(err);
  }
}

// Note: Workspace read/write operations have been migrated to CQRS (see cqrs/workspace/*)
// The old getWorkspaceData helper has been removed in favor of QueryBus + CommandBus.
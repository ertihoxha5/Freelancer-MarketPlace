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

async function getProjectIDForWorkspace(contract) {

  if (contract.projectID) return contract.projectID;

  if (contract.proposalID || contract.proposalId) {
    const pid = contract.proposalID || contract.proposalId;
    const [rows] = await db.execute(
      `SELECT projectID FROM Proposal WHERE id = ?`,
      [pid]
    );
    return rows[0]?.projectID || null;
  }
  return null;
}

export async function getWorkspace(req, res, next) {
  try {
    const contract = await getContractForWorkspace(req);
    const isFreelancer = !isClient(req);
    const freelancerID = contract.freelancerID;
    const projectID = await getProjectIDForWorkspace(contract);

    const workspaceData = await queryBus.execute(
      new GetWorkspaceQuery(contract.id, isFreelancer, freelancerID, projectID)
    );

    return res.json({
      contract: {
        id: contract.id,
        projectTitle: contract.projectTitle,
        cStatus: contract.cStatus,
        totalAmount: contract.totalAmount,
      },
      isFreelancer,
      projectID,
      isMultiFreelancerProject: !!projectID,
      todos: workspaceData.todos,
      sections: workspaceData.sections,
    });
  } catch (err) {
    next(err);
  }
}

export async function addTodo(req, res, next) {
  try {
    const contract = await getContractForWorkspace(req);
    if (isClient(req)) {
      throw forbiddenError("Only the freelancer can add todos.");
    }

    const { title, description, dueDate, status } = validatedBody(req);

    const projectID = await getProjectIDForWorkspace(contract);
    const todo = await commandBus.execute(
      new AddTodoCommand(
        contract.id,
        contract.freelancerID,
        title,
        description,
        dueDate,
        status,
        projectID
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

    const projectID = await getProjectIDForWorkspace(contract);
    const todo = await commandBus.execute(
      new UpdateTodoCommand(todoId, contract.id, title, description, dueDate, status, projectID)
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

    const projectID = await getProjectIDForWorkspace(contract);
    await commandBus.execute(new DeleteTodoCommand(todoId, contract.id, projectID));

    return res.json({ message: "Todo deleted." });
  } catch (err) {
    next(err);
  }
}

export async function addSection(req, res, next) {
  try {
    const contract = await getContractForWorkspace(req);
    if (isClient(req)) {
      throw forbiddenError("Only the freelancer can manage workspace sections.");
    }

    const { title, type, content, items, visible } = validatedBody(req);

    const projectID = await getProjectIDForWorkspace(contract);
    await commandBus.execute(
      new AddSectionCommand(
        contract.id,
        contract.freelancerID,
        title,
        type,
        content,
        items,
        visible,
        projectID
      )
    );

    const workspaceData = await queryBus.execute(
      new GetWorkspaceQuery(contract.id, true, contract.freelancerID, projectID)
    );

    return res.status(201).json({
      contract: {
        id: contract.id,
        projectTitle: contract.projectTitle,
        cStatus: contract.cStatus,
        totalAmount: contract.totalAmount,
      },
      isFreelancer: true,
      projectID,
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
    const projectID = await getProjectIDForWorkspace(contract);
    let affectedRows = 0;
    if (projectID) {
      values.push(sectionId, projectID);
      const [result] = await db.execute(
        `UPDATE WorkspaceSections SET ${sets.join(", ")} WHERE id = ? AND projectID = ?`,
        values
      );
      affectedRows = result.affectedRows;
    } else {
      values.push(sectionId, contract.id, contract.freelancerID);
      const [result] = await db.execute(
        `UPDATE WorkspaceSections SET ${sets.join(", ")} WHERE id = ? AND contractID = ? AND freelancerID = ?`,
        values
      );
      affectedRows = result.affectedRows;
    }

    if (affectedRows === 0) {
      throw notFoundError("Section not found.");
    }

    const workspaceData = await queryBus.execute(
      new GetWorkspaceQuery(contract.id, true, contract.freelancerID, projectID)
    );

    return res.json({
      contract: {
        id: contract.id,
        projectTitle: contract.projectTitle,
        cStatus: contract.cStatus,
        totalAmount: contract.totalAmount,
      },
      isFreelancer: true,
      projectID,
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
    const projectID = await getProjectIDForWorkspace(contract);
    if (projectID) {
      await db.execute(
        `DELETE FROM WorkspaceSections WHERE id = ? AND projectID = ?`,
        [sectionId, projectID]
      );
    } else {
      await db.execute(
        `DELETE FROM WorkspaceSections WHERE id = ? AND contractID = ? AND freelancerID = ?`,
        [sectionId, contract.id, contract.freelancerID]
      );
    }

    const workspaceData = await queryBus.execute(
      new GetWorkspaceQuery(contract.id, true, contract.freelancerID, projectID)
    );

    return res.json({
      contract: {
        id: contract.id,
        projectTitle: contract.projectTitle,
        cStatus: contract.cStatus,
        totalAmount: contract.totalAmount,
      },
      isFreelancer: true,
      projectID,
      todos: workspaceData.todos,
      sections: workspaceData.sections,
      message: "Section deleted.",
    });
  } catch (err) {
    next(err);
  }
}

import * as projectRepository from "../repositories/projectRepository.js";

function validationError(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

const VALID_STATUSES = ["pending", "active", "completed", "cancelled"];

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getMyProjects(clientID) {
  return projectRepository.getClientProjects(clientID);
}

export async function getMyProject(projectID, clientID) {
  const project = await projectRepository.getClientProjectById(projectID, clientID);
  if (!project) {
    const err = new Error("Project not found.");
    err.statusCode = 404;
    throw err;
  }
  return project;
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createMyProject(payload) {
  const { title, pDesc, budget, deadline, clientID } = payload ?? {};

  if (typeof title !== "string" || title.trim() === "") {
    throw validationError("Title is required.");
  }
  if (title.trim().length > 100) {
    throw validationError("Title must be 100 characters or fewer.");
  }

  if (typeof clientID !== "number" || clientID <= 0) {
    throw validationError("Valid client ID is required.");
  }

  if (budget != null) {
    const budgetNum = Number(budget);
    if (Number.isNaN(budgetNum) || budgetNum < 0) {
      throw validationError("Budget must be a non-negative number.");
    }
  }

  return projectRepository.createClientProject({
    title: title.trim(),
    pDesc: pDesc?.trim() || null,
    budget: budget != null ? Number(budget) : null,
    deadline: deadline || null,
    clientID,
  });
}

// ─── Update ──────────────────────────────────────────────────────────────────

export async function updateMyProject(projectID, clientID, payload) {
  if (typeof projectID !== "number" || projectID <= 0) {
    throw validationError("Valid project ID is required.");
  }
  if (typeof clientID !== "number" || clientID <= 0) {
    throw validationError("Valid client ID is required.");
  }

  const { title, pDesc, budget, deadline, pStatus } = payload ?? {};

  if (typeof title !== "string" || title.trim() === "") {
    throw validationError("Title is required.");
  }
  if (title.trim().length > 100) {
    throw validationError("Title must be 100 characters or fewer.");
  }

  if (pStatus && !VALID_STATUSES.includes(pStatus)) {
    throw validationError(
      `pStatus must be one of: ${VALID_STATUSES.join(", ")}.`,
    );
  }

  if (budget != null) {
    const budgetNum = Number(budget);
    if (Number.isNaN(budgetNum) || budgetNum < 0) {
      throw validationError("Budget must be a non-negative number.");
    }
  }

  return projectRepository.updateClientProject(projectID, clientID, {
    title: title.trim(),
    pDesc: pDesc?.trim() || null,
    budget: budget != null ? Number(budget) : null,
    deadline: deadline || null,
    pStatus: pStatus || "pending",
  });
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteMyProject(projectID, clientID) {
  if (typeof projectID !== "number" || projectID <= 0) {
    throw validationError("Valid project ID is required.");
  }
  if (typeof clientID !== "number" || clientID <= 0) {
    throw validationError("Valid client ID is required.");
  }

  return projectRepository.deleteClientProject(projectID, clientID);
}

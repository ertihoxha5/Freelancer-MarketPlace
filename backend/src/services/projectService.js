import * as projectRepository from "../repositories/projectRepository.js";

function validationError(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

const VALID_STATUSES = ["pending", "active", "completed", "cancelled"];

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getProjectsWithFreelancer() {
  return projectRepository.getProjectsWithFreelancer();
}

export async function getProjectsWithoutFreelancer() {
  return projectRepository.getProjectsWithoutFreelancer();
}

export async function getClientList() {
  return projectRepository.getClientList();
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createProject(payload) {
  const { title, pDesc, budget, deadline, clientID, pStatus } = payload ?? {};

  if (typeof title !== "string" || title.trim() === "") {
    throw validationError("Title is required.");
  }
  if (title.trim().length > 20) {
    throw validationError("Title must be 20 characters or fewer.");
  }

  const clientId = Number(clientID);
  if (!Number.isInteger(clientId) || clientId <= 0) {
    throw validationError("Valid clientID is required.");
  }

  if (pStatus && !VALID_STATUSES.includes(pStatus)) {
    throw validationError(
      `pStatus must be one of: ${VALID_STATUSES.join(", ")}.`,
    );
  }

  return projectRepository.createProject({
    title: title.trim(),
    pDesc: pDesc?.trim() || null,
    budget: budget != null ? Number(budget) : null,
    deadline: deadline || null,
    clientID: clientId,
    pStatus: pStatus || "pending",
  });
}

// ─── Update ──────────────────────────────────────────────────────────────────

export async function updateProject(id, payload) {
  const projectId = Number(id);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw validationError("Valid project id is required.");
  }

  const { title, pDesc, budget, deadline, pStatus } = payload ?? {};

  if (typeof title !== "string" || title.trim() === "") {
    throw validationError("Title is required.");
  }
  if (title.trim().length > 20) {
    throw validationError("Title must be 20 characters or fewer.");
  }

  if (pStatus && !VALID_STATUSES.includes(pStatus)) {
    throw validationError(
      `pStatus must be one of: ${VALID_STATUSES.join(", ")}.`,
    );
  }

  return projectRepository.updateProject(projectId, {
    title: title.trim(),
    pDesc: pDesc?.trim() || null,
    budget: budget != null ? Number(budget) : null,
    deadline: deadline || null,
    pStatus: pStatus || "pending",
  });
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteProject(id) {
  const projectId = Number(id);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw validationError("Valid project id is required.");
  }
  return projectRepository.deleteProject(projectId);
}

import * as projectRepository from "../repositories/projectRepository.js";
import { pushNotification } from "./notificationService.js";

function validationError(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

const VALID_STATUSES = ["pending", "active", "completed", "cancelled"];


export async function getProjectsWithFreelancer() {
  return projectRepository.getProjectsWithFreelancer();
}

export async function getProjectsWithoutFreelancer() {
  return projectRepository.getProjectsWithoutFreelancer();
}

export async function getClientList() {
  return projectRepository.getClientList();
}


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

  const project = await projectRepository.createProject({
    title: title.trim(),
    pDesc: pDesc?.trim() || null,
    budget: budget != null ? Number(budget) : null,
    deadline: deadline || null,
    clientID: clientId,
    pStatus: pStatus || "pending",
  });

  pushNotification({
    types: "system",
    receiverID: clientId,
    title: "Project Assigned",
    msg: `A project "${project.title}" was added to your account by admin.`,
  }).catch(() => {});

  return project;
}


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

  const existing = await projectRepository.getProjectById(projectId);
  if (!existing) {
    const err = new Error("Project not found.");
    err.statusCode = 404;
    throw err;
  }

  const updated = await projectRepository.updateProject(projectId, {
    title: title.trim(),
    pDesc: pDesc?.trim() || null,
    budget: budget != null ? Number(budget) : null,
    deadline: deadline || null,
    pStatus: pStatus || "pending",
  });

  const changes = [];
  if (existing.title !== updated.title) changes.push("title");
  if (existing.pStatus !== updated.pStatus) changes.push(`status to "${updated.pStatus}"`);
  if (String(existing.budget) !== String(updated.budget)) changes.push("budget");
  if (String(existing.deadline) !== String(updated.deadline)) changes.push("deadline");

  if (changes.length > 0) {
    const detail = changes.slice(0, 2).join(" and ");
    pushNotification({
      types: "system",
      receiverID: existing.clientID,
      title: "Project Updated",
      msg: `Admin updated your project "${updated.title}" (${detail}).`,
    }).catch(() => {});
  }

  return updated;
}


export async function deleteProject(id) {
  const projectId = Number(id);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw validationError("Valid project id is required.");
  }
  const existing = await projectRepository.getProjectById(projectId);
  if (!existing) {
    const err = new Error("Project not found.");
    err.statusCode = 404;
    throw err;
  }

  const result = await projectRepository.deleteProject(projectId);

  pushNotification({
    types: "system",
    receiverID: existing.clientID,
    title: "Project Removed",
    msg: `Admin removed your project "${existing.title}".`,
  }).catch(() => {});

  return result;
}

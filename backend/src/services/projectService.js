import * as projectRepository from "../repositories/projectRepository.js";
import * as fileRepository from "../repositories/fileRepository.js";
import { pushNotification, pushToAllAdmins } from "./notificationService.js";
import { pushFreelancerNotification } from "./freelancerNotificationService.js";
import { createActivity } from "./activityService.js";
import { getIO } from "../socket/index.js";
import {
  emitProjectStatusChanged,
  emitProposalNew,
} from "../socket/handlers/businessHandlers.js";
import { validateStatusTransition } from "../utils/statusTransition.js";
import { validate } from "../validation/validate.js";
import { projectSchemas, proposalSchemas } from "../validation/schemas.js";
import { conflictError, notFoundError, validationError } from "../utils/errors.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "../uploads");

async function ensureUploadsDir() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

function parseBase64Document(data) {
  if (typeof data !== "string" || !data.includes("base64,")) {
    throw validationError("Invalid attachment data.");
  }

  const [meta, payload] = data.split("base64,");
  const mimeMatch = meta.match(/data:([^;]+);/);
  if (!mimeMatch) {
    throw validationError("Invalid attachment type.");
  }

  const supported = {
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
  };
  const extension = supported[mimeMatch[1]];
  if (!extension) {
    throw validationError("Unsupported attachment type.");
  }

  const buffer = Buffer.from(payload, "base64");
  if (buffer.length > 8 * 1024 * 1024) {
    throw validationError("Attachment must be smaller than 8MB.");
  }

  return { buffer, extension };
}

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
  const { title, pDesc, budget, deadline, clientID, pStatus } = validate(
    projectSchemas.adminCreateOrUpdate,
    payload ?? {},
  );
  const clientId = Number(clientID);
  if (!Number.isInteger(clientId) || clientId <= 0) {
    throw validationError("Valid clientID is required.");
  }

  const project = await projectRepository.createProject({
    title,
    pDesc,
    budget: budget != null ? Number(budget) : null,
    deadline,
    clientID: clientId,
    maxFreelancers: Number(payload?.maxFreelancers) || 1,
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

  const { title, pDesc, budget, deadline, pStatus } = validate(
    projectSchemas.adminCreateOrUpdate,
    payload ?? {},
  );

  const existing = await projectRepository.getProjectById(projectId);
  if (!existing) {
    throw notFoundError("Project not found.");
  }

  const nextStatus = pStatus || existing.pStatus;
  validateStatusTransition(existing.pStatus, nextStatus);

  const updated = await projectRepository.updateProject(projectId, {
    title,
    pDesc,
    budget: budget != null ? Number(budget) : null,
    deadline,
    maxFreelancers: Number(payload?.maxFreelancers) || 1,
    pStatus: nextStatus,
  });

  const changes = [];
  if (existing.title !== updated.title) changes.push("title");
  if (existing.pStatus !== updated.pStatus)
    changes.push(`status to "${updated.pStatus}"`);
  if (String(existing.budget) !== String(updated.budget))
    changes.push("budget");
  if (String(existing.deadline) !== String(updated.deadline))
    changes.push("deadline");

  if (changes.length > 0) {
    const detail = changes.slice(0, 2).join(" and ");
    pushNotification({
      types: "system",
      receiverID: existing.clientID,
      title: "Project Updated",
      msg: `Admin updated your project "${updated.title}" (${detail}).`,
    }).catch(() => {});
  }

  if (existing.pStatus !== updated.pStatus) {
    const contract = await projectRepository.getContractByProjectId(projectId);
    const io = getIO();
    if (io) {
      emitProjectStatusChanged(io, {
        projectID: projectId,
        projectTitle: updated.title,
        clientID: existing.clientID,
        freelancerID: contract?.freelancerID ?? null,
        oldStatus: existing.pStatus,
        newStatus: updated.pStatus,
      });
    }
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
    throw notFoundError("Project not found.");
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
export async function browseProjectsForFreelancer(userID, queryParams = {}) {
  const { sort, categoryID, skillIds } = queryParams;
  const currentPage = Math.max(1, Number(queryParams.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(queryParams.limit) || 10));

  const result = await projectRepository.getBrowseProjectsForFreelancer(
    { sort, categoryID, skillIds },
    userID,
    { page: currentPage, limit },
  );

  return {
    data: result.data,
    projects: result.data,
    currentPage,
    totalPages: Math.ceil(result.totalItems / limit),
    totalItems: result.totalItems,
    pagination: {
      page: currentPage,
      limit,
      total: result.totalItems,
      totalPages: Math.ceil(result.totalItems / limit),
    },
  };
}

export async function getFreelancerProjectDetails(userID, projectID) {
  const freelancerId = Number(userID);
  const projectId = Number(projectID);

  if (!Number.isInteger(freelancerId) || freelancerId <= 0) {
    throw validationError("Valid user id is required.");
  }
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw validationError("Valid project id is required.");
  }

  const project = await projectRepository.getFreelancerProjectDetails(
    projectId,
    freelancerId,
  );

  if (!project) {
    throw notFoundError("Project not found.");
  }

  return project;
}

export async function createApplication(userID, projectID, payload) {
  const { coverLetter, bidAmount, estimatedDays } = validate(
    proposalSchemas.createOrUpdate,
    payload ?? {},
  );
  const freelancerId = Number(userID);
  const projectId = Number(projectID);

  if (!Number.isInteger(freelancerId) || freelancerId <= 0) {
    throw validationError("Valid user id is required.");
  }
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw validationError("Valid project id is required.");
  }

  const projectDetails = await projectRepository.getProjectById(projectId);
  if (!projectDetails) {
    throw notFoundError("Project not found.");
  }
  if (projectDetails.pStatus !== "pending") {
    throw conflictError("Applications are only open for pending projects.");
  }

  const duplicateError = () => {
    return conflictError("You have already applied to this project.");
  };

  let attachmentID = null;
  if (payload?.attachmentBase64) {
    const { buffer, extension } = parseBase64Document(payload.attachmentBase64);
    const fileName = `${randomUUID()}.${extension}`;
    await ensureUploadsDir();
    const filePath = `/uploads/${fileName}`;
    await fs.writeFile(path.join(UPLOADS_DIR, fileName), buffer);
    const fileRecord = await fileRepository.createFile({
      entity: "Proposal",
      entityID: 0,
      nameFile: fileName,
      filePath,
      fileSize: buffer.length,
      uploadedBy: freelancerId,
    });
    attachmentID = fileRecord.id;
  }

  const existingApplication = await projectRepository.getExistingApplication(
    freelancerId,
    projectId,
  );
  if (existingApplication) {
    throw duplicateError();
  }

  let result;
  try {
    result = await projectRepository.createApplication(
      freelancerId,
      projectId,
      coverLetter,
      bidAmount,
      estimatedDays,
      attachmentID,
    );
  } catch (err) {
    if (err?.code === "ER_DUP_ENTRY") {
      throw duplicateError();
    }
    throw err;
  }

  const projectTitle = projectDetails?.title || "Projekt";

  pushFreelancerNotification({
    types: "system",
    receiverID: freelancerId,
    title: "Aplikim i dërguar 📨",
    msg: `Aplikimi juaj për projektin "${projectTitle}" u dërgua me sukses!`,
    metadata: {
      projectID: projectId,
      projectTitle,
      applicationID: result.id,
      actionUrl: "/freelancer/applications",
    },
  }).catch(() => {});

  createActivity({
    freelancerID: freelancerId,
    eventType: "application_submitted",
    metadata: {
      projectID: projectId,
      projectTitle,
      applicationID: result.id,
      bidAmount,
      estimatedDays,
      attachmentID,
    },
  }).catch(() => {});
  pushNotification({
    types: "system",
    receiverID: projectDetails.clientID,
    title: "New Application",
    msg: `A freelancer applied to your project "${projectTitle}".`,
  }).catch(() => {});

  const io = getIO();
  if (io) {
    emitProposalNew(io, {
      clientID: projectDetails.clientID,
      projectID: projectId,
      projectTitle,
      proposalID: result.id,
      freelancerID: freelancerId,
      bidAmount,
      estimatedDays,
    });
    io.to(`user:${projectDetails.clientID}`).emit("notification:new", {
      type: "system",
      title: "New application",
    });
  }

  return result;
}

export async function updateMyApplication(userID, applicationID, payload) {
  const freelancerId = Number(userID);
  const appId = Number(applicationID);
  const { coverLetter, bidAmount, estimatedDays } = validate(
    proposalSchemas.createOrUpdate,
    payload ?? {},
  );

  if (!Number.isInteger(freelancerId) || freelancerId <= 0) {
    throw validationError("Valid user id is required.");
  }
  if (!Number.isInteger(appId) || appId <= 0) {
    throw validationError("Valid application id is required.");
  }
  const existing = await projectRepository.getApplicationByIdForFreelancer(
    appId,
    freelancerId,
  );
  if (!existing) {
    throw notFoundError("Application not found.");
  }
  if (existing.propStatus !== "pending") {
    throw validationError("Only pending applications can be edited.");
  }

  const affected = await projectRepository.updateApplicationForFreelancer(
    appId,
    freelancerId,
    {
      coverLetter,
      bidAmount,
      estimatedDays,
    },
  );

  if (!affected) {
    throw conflictError("Unable to update application.");
  }

  return {
    id: appId,
    coverLetter,
    bidAmount,
    estimatedDays,
    attachmentID: existing.attachmentID ?? null,
    propStatus: "pending",
  };
}

export async function softDeleteMyApplication(userID, applicationID) {
  const freelancerId = Number(userID);
  const appId = Number(applicationID);

  if (!Number.isInteger(freelancerId) || freelancerId <= 0) {
    throw validationError("Valid user id is required.");
  }
  if (!Number.isInteger(appId) || appId <= 0) {
    throw validationError("Valid application id is required.");
  }

  const existing = await projectRepository.getApplicationByIdForFreelancer(
    appId,
    freelancerId,
  );

  if (!existing) {
    throw notFoundError("Application not found.");
  }

  if (existing.propStatus !== "pending") {
    throw validationError("Only pending applications can be withdrawn.");
  }

  const affected = await projectRepository.softDeleteApplicationForFreelancer(
    appId,
    freelancerId,
  );

  if (!affected) {
    throw conflictError("Unable to withdraw application.");
  }

  const projectDetails = await projectRepository.getProjectById(
    existing.projectID,
  );
  const projectTitle = projectDetails?.title || "Projekt";

  pushFreelancerNotification({
    types: "system",
    receiverID: freelancerId,
    title: "Aplikim i tërhequr ↩️",
    msg: `Aplikimi juaj për projektin "${projectTitle}" u tërhoq me sukses.`,
    metadata: {
      projectID: existing.projectID,
      projectTitle,
      applicationID: appId,
      actionUrl: "/freelancer/applications",
    },
  }).catch(() => {});

  createActivity({
    freelancerID: freelancerId,
    eventType: "application_withdrawn",
    metadata: {
      projectID: existing.projectID,
      projectTitle,
      applicationID: appId,
    },
  }).catch(() => {});

  return { id: appId, isDeleted: true };
}

export async function getMyApplications(userID) {
  return projectRepository.getMyApplications(Number(userID));
}

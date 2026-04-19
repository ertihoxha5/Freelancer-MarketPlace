import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "node:crypto";
import * as projectRepository from "../repositories/projectRepository.js";
import * as auditRepository from "../repositories/auditRepository.js";
import * as profileRepository from "../repositories/profileRepository.js";
import * as fileRepository from "../repositories/fileRepository.js";
import { pushNotification } from "./notificationService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "../uploads");

function validationError(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function toShortString(value) {
  return String(value ?? "").slice(0, 20);
}

function coercePositiveInt(value, label) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw validationError(`Valid ${label} is required.`);
  }
  return num;
}

const VALID_STATUSES = ["pending", "active", "completed", "cancelled"];

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getMyProjects(clientID) {
  return projectRepository.getClientProjects(clientID);
}

export async function getMyProject(projectID, clientID) {
  const projectId = coercePositiveInt(projectID, "project ID");
  const project = await projectRepository.getClientProjectById(
    projectId,
    clientID,
  );
  if (!project) {
    const err = new Error("Project not found.");
    err.statusCode = 404;
    throw err;
  }
  return project;
}

export async function getMyProfile(clientID) {
  const clientId = Number(clientID);
  if (!Number.isInteger(clientId) || clientId <= 0) {
    throw validationError("Valid client ID is required.");
  }
  const profile = await profileRepository.findProfileByUserId(clientId);
  return (
    profile ?? {
      userID: clientId,
      pictureID: null,
      picturePath: null,
      hourlyRate: null,
      portofoliUrl: null,
      bio: null,
    }
  );
}

function parseBase64Image(data) {
  if (typeof data !== "string" || !data.includes("base64,")) {
    throw validationError("Invalid image data.");
  }

  const [meta, payload] = data.split("base64,");
  const mimeMatch = meta.match(/data:(image\/[^;]+);/);
  if (!mimeMatch) {
    throw validationError("Invalid image type.");
  }

  const mimeType = mimeMatch[1];
  const supported = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
  };
  const extension = supported[mimeType];
  if (!extension) {
    throw validationError("Unsupported image type.");
  }
  const buffer = Buffer.from(payload, "base64");
  return { buffer, extension };
}

async function ensureUploadsDir() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

export async function updateMyProfile(clientID, payload) {
  const clientId = Number(clientID);
  if (!Number.isInteger(clientId) || clientId <= 0) {
    throw validationError("Valid client ID is required.");
  }

  if (!payload || typeof payload !== "object") {
    throw validationError("Profile data is required.");
  }

  let existing = await profileRepository.findProfileByUserId(clientId);
  if (!existing) {
    existing = await profileRepository.createProfileForUser(clientId);
  }

  let pictureID = existing.pictureID;
  if (
    Object.prototype.hasOwnProperty.call(payload, "pictureBase64") &&
    payload.pictureBase64
  ) {
    const { buffer, extension } = parseBase64Image(payload.pictureBase64);
    const fileName = `${randomUUID()}.${extension}`;
    await ensureUploadsDir();
    const filePath = `/uploads/${fileName}`;
    await fs.writeFile(path.join(UPLOADS_DIR, fileName), buffer);

    const fileRecord = await fileRepository.createFile({
      entity: "Profile",
      entityID: existing.id,
      nameFile: fileName,
      filePath,
      fileSize: buffer.length,
      uploadedBy: clientId,
    });

    pictureID = fileRecord.id;
  } else if (Object.prototype.hasOwnProperty.call(payload, "pictureID")) {
    pictureID = payload.pictureID != null ? Number(payload.pictureID) : null;
  }

  const hourlyRate = Object.prototype.hasOwnProperty.call(payload, "hourlyRate")
    ? payload.hourlyRate != null
      ? Number(payload.hourlyRate)
      : null
    : existing.hourlyRate;
  const portofoliUrl = Object.prototype.hasOwnProperty.call(
    payload,
    "portofoliUrl",
  )
    ? typeof payload.portofoliUrl === "string"
      ? payload.portofoliUrl.trim() || null
      : null
    : existing.portofoliUrl;
  const bio = Object.prototype.hasOwnProperty.call(payload, "bio")
    ? typeof payload.bio === "string"
      ? payload.bio.trim() || null
      : null
    : existing.bio;

  if (bio != null && bio.length > 255) {
    throw validationError("Bio must be 255 characters or fewer.");
  }

  const updatedProfile = await profileRepository.updateProfileByUserId(
    clientId,
    {
      pictureID,
      hourlyRate,
      portofoliUrl,
      bio,
    },
  );

  const oldData = existing ?? {
    pictureID: null,
    hourlyRate: null,
    portofoliUrl: null,
    bio: null,
  };
  const keys = ["pictureID", "hourlyRate", "portofoliUrl", "bio"];
  for (const key of keys) {
    const oldValue = oldData[key];
    const newValue = updatedProfile[key];
    if (String(oldValue) !== String(newValue)) {
      await auditRepository.insertAuditLog({
        entity: "Profile",
        entityID: clientId,
        actionPerformed: "update",
        oldValue: toShortString(oldValue),
        newValue: toShortString(newValue),
      });
    }
  }

  return updatedProfile;
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

  const project = await projectRepository.createClientProject({
    title: title.trim(),
    pDesc: pDesc?.trim() || null,
    budget: budget != null ? Number(budget) : null,
    deadline: deadline || null,
    clientID,
  });

  if (changedFields.length > 0) {
    pushNotification({
      types: "system",
      receiverID: clientID,
      title: "Project Created",
      msg: `Your project "${title.trim().slice(0, 50)}" has been created successfully.`,
    }).catch(() => {});
  }

  return project;
}

// ─── Update ──────────────────────────────────────────────────────────────────

export async function updateMyProject(projectID, clientID, payload) {
  const projectId = coercePositiveInt(projectID, "project ID");
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

  const existing = await projectRepository.getClientProjectById(
    projectId,
    clientID,
  );
  if (!existing) {
    const err = new Error("Project not found.");
    err.statusCode = 404;
    throw err;
  }

  const updatePayload = {
    title: title.trim(),
    pDesc: pDesc?.trim() || null,
    budget: budget != null ? Number(budget) : null,
    deadline: deadline || null,
    pStatus: pStatus || "pending",
  };

  const updated = await projectRepository.updateClientProject(
    projectId,
    clientID,
    updatePayload,
  );

  const changedFields = [];
  if (existing.title !== updatePayload.title) {
    changedFields.push({
      oldValue: existing.title,
      newValue: updatePayload.title,
    });
  }
  if (existing.pDesc !== updatePayload.pDesc) {
    changedFields.push({
      oldValue: existing.pDesc,
      newValue: updatePayload.pDesc,
    });
  }
  if (String(existing.budget) !== String(updatePayload.budget)) {
    changedFields.push({
      oldValue: existing.budget,
      newValue: updatePayload.budget,
    });
  }
  if (String(existing.deadline) !== String(updatePayload.deadline)) {
    changedFields.push({
      oldValue: existing.deadline,
      newValue: updatePayload.deadline,
    });
  }
  if (existing.pStatus !== updatePayload.pStatus) {
    changedFields.push({
      oldValue: existing.pStatus,
      newValue: updatePayload.pStatus,
    });
  }

  for (const change of changedFields) {
    await auditRepository.insertAuditLog({
      entity: "Project",
      entityID: projectId,
      actionPerformed: "update",
      oldValue: toShortString(change.oldValue),
      newValue: toShortString(change.newValue),
    });
  }

  if (changedFields.length > 0) {
    pushNotification({
      types: "system",
      receiverID: clientID,
      title: "Project Updated",
      msg: `Your project "${title.trim().slice(0, 50)}" was updated.`,
    }).catch(() => {});
  }

  return updated;
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteMyProject(projectID, clientID) {
  if (typeof projectID !== "number" || projectID <= 0) {
    throw validationError("Valid project ID is required.");
  }
  if (typeof clientID !== "number" || clientID <= 0) {
    throw validationError("Valid client ID is required.");
  }

  const existing = await projectRepository.getClientProjectById(
    projectID,
    clientID,
  );
  if (!existing) {
    const err = new Error("Project not found.");
    err.statusCode = 404;
    throw err;
  }

  const result = await projectRepository.deleteClientProject(
    projectID,
    clientID,
  );

  if (changedFields.length > 0) {
    pushNotification({
      types: "system",
      receiverID: clientID,
      title: "Project Deleted",
      msg: `Your project "${existing.title}" has been deleted.`,
    }).catch(() => {});
  }

  return result;
}

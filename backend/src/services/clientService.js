import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "node:crypto";
import * as projectRepository from "../repositories/projectRepository.js";
import * as userRepository from "../repositories/userRepository.js";
import { sendFreelancerAcceptedEmail } from "./emailService.js";
import * as auditRepository from "../repositories/auditRepository.js";
import * as profileRepository from "../repositories/profileRepository.js";
import * as fileRepository from "../repositories/fileRepository.js";
import {
  pushNotification,
  pushToAllAdmins,
  pushFreelancerNotification,
} from "./notificationService.js";
import { createActivity } from "./activityService.js";
import { getIO } from "../socket/index.js";
import {
  emitContractCreated,
  emitProjectStatusChanged,
  emitProposalAccepted,
  emitProposalRejected,
} from "../socket/handlers/businessHandlers.js";
import { validateStatusTransition } from "../utils/statusTransition.js";
import { validate } from "../validation/validate.js";
import { projectSchemas, proposalSchemas } from "../validation/schemas.js";
import { conflictError, notFoundError, validationError } from "../utils/errors.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "../uploads");

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
    throw notFoundError("Project not found.");
  }
  return project;
}

export async function getMyApplications(clientID) {
  const clientId = Number(clientID);
  if (!Number.isInteger(clientId) || clientId <= 0) {
    throw validationError("Valid client ID is required.");
  }
  return projectRepository.getClientApplications(clientId);
}

export async function updateMyApplicationStatus(
  clientID,
  applicationID,
  payload,
) {
  const clientId = Number(clientID);
  const appId = Number(applicationID);
  const { propStatus } = validate(proposalSchemas.status, payload ?? {});

  if (!Number.isInteger(clientId) || clientId <= 0) {
    throw validationError("Valid client ID is required.");
  }
  if (!Number.isInteger(appId) || appId <= 0) {
    throw validationError("Valid application ID is required.");
  }
  // Get the existing application.
  const existing = await projectRepository.getClientApplicationById(
    appId,
    clientId,
  );

  if (!existing) {
    throw notFoundError("Application not found.");
  }

  // Return early when status has not changed.
  if (existing.propStatus === propStatus) {
    return {
      applicationId: appId,
      propStatus,
    };
  }

  if (existing.propStatus !== "pending") {
    throw conflictError("Only pending applications can change status.");
  }

  if (propStatus === "accepted") {
    if (existing.projectStatus !== "pending") {
      throw conflictError("Only pending projects can accept a proposal.");
    }
    validateStatusTransition(existing.projectStatus, "active");
  }

  if (propStatus !== "accepted") {
    const affected = await projectRepository.updateClientApplicationStatus(
      appId,
      clientId,
      propStatus,
    );

    if (!affected) {
      throw conflictError("Unable to update application status.");
    }
  }

  // Notify the freelancer only when the application is accepted or rejected.
  if (propStatus === "accepted" || propStatus === "rejected") {
    const projectDetails = await projectRepository.getClientProjectById(
      existing.projectId,
      clientId,
    );

    const projectTitle =
      projectDetails?.title || existing.projectTitle || "Project";
    let contract = null;

    // If proposal is accepted, automatically set project status to active
    if (propStatus === "accepted") {
      const workflow = await projectRepository.acceptProposalAndCreateContract({
        applicationID: appId,
        clientID: clientId,
        projectID: existing.projectId,
        freelancerID: existing.freelancerID,
        totalAmount: existing.bidAmount,
      });
      const rejectedApplications = workflow.rejectedApplications;
      contract = workflow.contract;

      await Promise.allSettled(
        rejectedApplications.map((application) =>
          pushFreelancerNotification({
            types: "system",
            receiverID: application.freelancerID,
            title: "Application Rejected",
            msg: `Project "${projectTitle}" has been awarded to another freelancer.`,
            metadata: {
              projectID: existing.projectId,
              projectTitle,
              applicationID: application.applicationID,
              actionUrl: "/freelancer/applications",
            },
          }),
        ),
      );

      const io = getIO();
      if (io) {
        for (const application of rejectedApplications) {
          emitProposalRejected(io, {
            freelancerID: application.freelancerID,
            projectID: existing.projectId,
            projectTitle,
            proposalID: application.applicationID,
          });
        }
      }
    }

    pushFreelancerNotification({
      types: "system",
      receiverID: existing.freelancerID,
      title:
        propStatus === "accepted"
          ? "Aplikimi Pranuar ✅"
          : "Aplikimi Refuzuar ❌",
      msg:
        propStatus === "accepted"
          ? `Projekti "${projectTitle}" — aplikimi juaj u pranua! Punë të mbarë!`
          : `Projekti "${projectTitle}" — aplikimi juaj nuk u zgjodh këtë herë.`,
      metadata: {
        projectID: existing.projectId,
        projectTitle,
        applicationID: appId,
        actionUrl: "/freelancer/applications",
      },
    }).catch(() => {});

    // MongoDB activity feed.
    createActivity({
      freelancerID: existing.freelancerID,
      eventType:
        propStatus === "accepted"
          ? "application_accepted"
          : "application_rejected",
      metadata: {
        projectID: existing.projectId,
        projectTitle,
        clientID: clientId,
        clientName: "Client",
        applicationID: appId,
        bidAmount: existing.bidAmount ?? null,
        estimatedDays: existing.estimatedDays ?? null,
      },
    }).catch(() => {});

    if (propStatus === "accepted" && contract) {
      userRepository
        .findUserContactById(existing.freelancerID)
        .then((freelancer) => {
          if (!freelancer?.email) return;
          return sendFreelancerAcceptedEmail({
            email: freelancer.email,
            fullName: freelancer.fullName,
            projectTitle,
            contractID: contract.id,
            totalAmount: contract.totalAmount ?? existing.bidAmount ?? null,
          });
        })
        .catch((err) => {
          console.error(
            "[client] acceptance email failed:",
            err?.message || err,
          );
        });

      const io = getIO();
      if (io) {
        const payload = {
          contractID: contract.id,
          proposalID: appId,
          projectID: existing.projectId,
          clientID: clientId,
          freelancerID: existing.freelancerID,
          totalAmount: contract.totalAmount ?? existing.bidAmount ?? null,
          cStatus: contract.cStatus ?? "active",
        };
        emitProposalAccepted(io, {
          freelancerID: existing.freelancerID,
          ...payload,
        });
        emitContractCreated(io, payload);
        emitProjectStatusChanged(io, {
          projectID: existing.projectId,
          projectTitle,
          clientID: clientId,
          freelancerID: existing.freelancerID,
          oldStatus: existing.projectStatus,
          newStatus: "active",
        });
      }
    } else if (propStatus === "rejected") {
      const io = getIO();
      if (io) {
        emitProposalRejected(io, {
          freelancerID: existing.freelancerID,
          projectID: existing.projectId,
          projectTitle,
          proposalID: appId,
        });
      }
    }
  }

  return {
    applicationId: appId,
    propStatus,
  };
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
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (buffer.length > MAX_SIZE) {
    throw validationError("Image must be smaller than 5MB.");
  }
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
  let profileChanged = false;
  for (const key of keys) {
    const oldValue = oldData[key];
    const newValue = updatedProfile[key];
    if (String(oldValue) !== String(newValue)) {
      profileChanged = true;
      await auditRepository.insertAuditLog({
        entity: "Profile",
        entityID: clientId,
        actionPerformed: "update",
        oldValue: toShortString(oldValue),
        newValue: toShortString(newValue),
      });
    }
  }

  if (profileChanged) {
    pushNotification({
      types: "system",
      receiverID: clientId,
      title: "Profile Updated",
      msg: "Your profile details were updated successfully.",
    }).catch(() => {});
  }

  return updatedProfile;
}

export async function createMyProject(payload) {
  const { title, pDesc, budget, deadline } = validate(
    projectSchemas.clientCreateOrUpdate,
    payload ?? {},
  );
  const { clientID } = payload ?? {};

  if (typeof clientID !== "number" || clientID <= 0) {
    throw validationError("Valid client ID is required.");
  }

  const project = await projectRepository.createClientProject({
    title,
    pDesc,
    budget: budget != null ? Number(budget) : null,
    deadline,
    clientID,
  });

  const trimmedTitle = title.slice(0, 50);

  pushNotification({
    types: "system",
    receiverID: clientID,
    title: "Project Created",
    msg: `Your project "${trimmedTitle}" has been posted and is now visible to freelancers.`,
  }).catch(() => {});

  pushToAllAdmins({
    types: "system",
    title: "New Project Posted",
    msg: `A client posted a new project: "${trimmedTitle}".`,
  }).catch(() => {});

  return project;
}

export async function updateMyProject(projectID, clientID, payload) {
  const projectId = coercePositiveInt(projectID, "project ID");
  if (typeof clientID !== "number" || clientID <= 0) {
    throw validationError("Valid client ID is required.");
  }

  const { title, pDesc, budget, deadline, pStatus } = validate(
    projectSchemas.clientCreateOrUpdate,
    payload ?? {},
  );

  const existing = await projectRepository.getClientProjectById(
    projectId,
    clientID,
  );
  if (!existing) {
    throw notFoundError("Project not found.");
  }

  const nextStatus = pStatus || existing.pStatus;
  if (pStatus && pStatus !== existing.pStatus && pStatus !== "cancelled") {
    throw validationError(
      "Clients can only cancel active projects; projects become active or completed through proposals and milestones.",
    );
  }
  validateStatusTransition(existing.pStatus, nextStatus);

  const updatePayload = {
    title,
    pDesc,
    budget: budget != null ? Number(budget) : null,
    deadline,
    pStatus: nextStatus,
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
      msg: `Your project "${title.slice(0, 50)}" has been updated successfully.`,
    }).catch(() => {});
  }

  if (existing.pStatus !== updated.pStatus) {
    const io = getIO();
    if (io) {
      const contract = await projectRepository.getContractByProjectId(projectId);
      emitProjectStatusChanged(io, {
        projectID: projectId,
        projectTitle: updated.title,
        clientID,
        freelancerID: contract?.freelancerID ?? null,
        oldStatus: existing.pStatus,
        newStatus: updated.pStatus,
      });
    }
  }

  return updated;
}

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
    throw notFoundError("Project not found.");
  }

  const result = await projectRepository.deleteClientProject(
    projectID,
    clientID,
  );

  pushNotification({
    types: "system",
    receiverID: clientID,
    title: "Project Deleted",
    msg: "One of your projects has been permanently removed from the platform.",
  }).catch(() => {});

  return result;
}

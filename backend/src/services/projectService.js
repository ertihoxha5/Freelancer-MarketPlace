import * as projectRepository from "../repositories/projectRepository.js";
import { pushNotification, pushToAllAdmins } from "./notificationService.js";
import { pushFreelancerNotification } from "./freelancerNotificationService.js";
import { createActivity } from "./activityService.js";
import { getIO } from "../socket/index.js";
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
export async function browseProjectsForFreelancer(userID, queryParams = {}) {
  const { sort, categoryID, skillIds } = queryParams;

  const projects = await projectRepository.getBrowseProjectsForFreelancer(
    { sort, categoryID, skillIds },
    userID,
  );

  return {
    projects,
    pagination: { page: 1, limit: 10 },
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
    const err = new Error("Project not found.");
    err.statusCode = 404;
    throw err;
  }

  return project;
}

export async function createApplication(userID, projectID, payload) {
  const { coverLetter, bidAmount, estimatedDays } = payload;

  if (!coverLetter || coverLetter.trim() === "") {
    const err = new Error("Cover letter is required.");
    err.statusCode = 400;
    throw err;
  }

  const result = await projectRepository.createApplication(
    Number(userID),
    Number(projectID),
    coverLetter.trim(),
    bidAmount ? Number(bidAmount) : null,
    estimatedDays ? Number(estimatedDays) : null,
  );

  const projectDetails = await projectRepository.getProjectById(
    Number(projectID),
  );
  const projectTitle = projectDetails?.title || "Projekt";

  pushFreelancerNotification({
    types: "system",
    receiverID: Number(userID),
    title: "Aplikim i dërguar 📨",
    msg: `Aplikimi juaj për projektin "${projectTitle}" u dërgua me sukses!`,
    metadata: {
      projectID: Number(projectID),
      projectTitle,
      applicationID: result.id,
      actionUrl: "/freelancer/applications",
    },
  }).catch(() => {});

  createActivity({
    freelancerID: Number(userID),
    eventType: "application_submitted",
    metadata: {
      projectID: Number(projectID),
      projectTitle,
      applicationID: result.id,
      bidAmount: bidAmount ? Number(bidAmount) : null,
      estimatedDays: estimatedDays ? Number(estimatedDays) : null,
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
  const { coverLetter, bidAmount, estimatedDays } = payload ?? {};

  if (!Number.isInteger(freelancerId) || freelancerId <= 0) {
    throw validationError("Valid user id is required.");
  }
  if (!Number.isInteger(appId) || appId <= 0) {
    throw validationError("Valid application id is required.");
  }
  if (!coverLetter || coverLetter.trim() === "") {
    throw validationError("Cover letter is required.");
  }

  const existing = await projectRepository.getApplicationByIdForFreelancer(
    appId,
    freelancerId,
  );
  if (!existing) {
    const err = new Error("Application not found.");
    err.statusCode = 404;
    throw err;
  }
  if (existing.propStatus !== "pending") {
    throw validationError("Only pending applications can be edited.");
  }

  const affected = await projectRepository.updateApplicationForFreelancer(
    appId,
    freelancerId,
    {
      coverLetter: coverLetter.trim(),
      bidAmount: bidAmount ? Number(bidAmount) : null,
      estimatedDays: estimatedDays ? Number(estimatedDays) : null,
    },
  );

  if (!affected) {
    const err = new Error("Unable to update application.");
    err.statusCode = 409;
    throw err;
  }

  return {
    id: appId,
    coverLetter: coverLetter.trim(),
    bidAmount: bidAmount ? Number(bidAmount) : null,
    estimatedDays: estimatedDays ? Number(estimatedDays) : null,
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
    const err = new Error("Application not found.");
    err.statusCode = 404;
    throw err;
  }

  if (existing.propStatus !== "pending") {
    throw validationError("Only pending applications can be withdrawn.");
  }

  const affected = await projectRepository.softDeleteApplicationForFreelancer(
    appId,
    freelancerId,
  );

  if (!affected) {
    const err = new Error("Unable to withdraw application.");
    err.statusCode = 409;
    throw err;
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

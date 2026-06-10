import * as milestoneRepository from "../repositories/milestoneRepository.js";
import * as projectRepository from "../repositories/projectRepository.js";
import * as auditRepository from "../repositories/auditRepository.js";
import { releaseMilestoneFunds } from "./paymentService.js";
import {
  pushNotification,
  pushFreelancerNotification,
} from "./notificationService.js";
import { createActivity } from "./activityService.js";
import { getIO } from "../socket/index.js";
import {
  emitMilestoneApproved,
  emitMilestoneRejected,
  emitMilestoneSubmitted,
  emitProjectStatusChanged,
} from "../socket/handlers/businessHandlers.js";
import { validateStatusTransition } from "../utils/statusTransition.js";
import { validate } from "../validation/validate.js";
import { milestoneSchemas } from "../validation/schemas.js";
import {
  conflictError,
  forbiddenError,
  notFoundError,
  validationError,
} from "../utils/errors.js";

function toShortString(value) {
  const str = typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
  return str.length > 500 ? str.slice(0, 500) + "..." : str;
}

function coercePositiveInt(value, label) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw validationError(`Valid ${label} is required.`);
  }
  return num;
}

function nowUtcIso() {
  return new Date().toISOString();
}

function isPastDate(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

function normalizeMilestoneRow(milestone) {
  let parsedPhase = milestone.projectPhase ?? [];
  let parsedAttachments = milestone.attachments ?? [];
  try {
    if (typeof milestone.projectPhase === "string") {
      parsedPhase = JSON.parse(milestone.projectPhase || "[]");
    }
    if (typeof milestone.attachments === "string") {
      parsedAttachments = JSON.parse(milestone.attachments || "[]");
    }
  } catch {
    parsedPhase = [];
    parsedAttachments = [];
  }

  const computedStatus =
    milestone.status !== "completed" && isPastDate(milestone.deadline)
      ? "overdue"
      : milestone.status;

  return {
    ...milestone,
    projectPhase: Array.isArray(parsedPhase) ? parsedPhase : [],
    attachments: Array.isArray(parsedAttachments) ? parsedAttachments : [],
    status: computedStatus,
  };
}

async function getContractForActor(contractID, userID, role) {
  const contractId = coercePositiveInt(contractID, "contract ID");
  const userId = coercePositiveInt(userID, "user ID");
  const contract = await projectRepository.getContractById(contractId);

  if (!contract) {
    throw notFoundError("Contract not found.");
  }

  if (role === "client" && Number(contract.clientID) !== userId) {
    throw forbiddenError("You do not own this contract.");
  }

  if (role === "freelancer" && Number(contract.freelancerID) !== userId) {
    throw forbiddenError("You are not assigned to this contract.");
  }

  return contract;
}

async function notifyParties(
  contract,
  { title, msg, freelancerMsg, metadata },
) {
  const sharedMetadata = {
    projectID: contract.projectID,
    projectTitle: contract.projectTitle,
    actionUrl: "/freelancer/contracts",
    ...metadata,
  };

  await Promise.allSettled([
    pushNotification({
      types: "system",
      receiverID: contract.clientID,
      title,
      msg,
    }),
    pushFreelancerNotification({
      types: "system",
      receiverID: contract.freelancerID,
      title,
      msg: freelancerMsg || msg,
      metadata: sharedMetadata,
    }),
  ]);
}

export async function createMilestone(contractID, clientID, payload) {
  const contract = await getContractForActor(contractID, clientID, "client");
  const { title, mDesc, amountPayable, dueDate } = validate(
    milestoneSchemas.create,
    payload ?? {},
  );
  const amount = Number(amountPayable);
  if (amount > Number(contract.totalAmount || 0)) {
    throw validationError(
      "Milestone amount cannot exceed contract total amount.",
    );
  }
  if (dueDate) {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(due.getTime()) || due <= today) {
      throw validationError("Milestone due date must be in the future.");
    }
  }

  const milestone = await milestoneRepository.createMilestone({
    title,
    mDesc: mDesc || "",
    amountPayable: amount,
    dueDate,
    contractID: contract.id,
    projectID: contract.projectID,
    projectPhase: [],
    deadline: dueDate || null,
    budget: amount,
    status: "pending",
    completionDate: null,
    comments: null,
    attachments: [],
  });

  notifyParties(contract, {
    title: "Milestone Created",
    msg: `A milestone was created for "${contract.projectTitle}".`,
    metadata: { contractID: contract.id, milestoneID: milestone.id },
  }).catch(() => {});

  await auditRepository.insertAuditLog({
    entity: "Milestone",
    entityID: milestone.id,
    actionPerformed: "create",
    oldValue: null,
    newValue: toShortString({ title, mDesc, amountPayable: amount, dueDate }),
    userID: clientID,
  }).catch(() => {});

  return milestone;
}

export async function createProjectMilestone(projectID, freelancerID, payload) {
  const projectId = coercePositiveInt(projectID, "project ID");
  const freelancerId = coercePositiveInt(freelancerID, "freelancer ID");
  const contract = await projectRepository.getFreelancerContractByProjectId(
    projectId,
    freelancerId,
  );

  if (!contract) {
    throw forbiddenError("Only the assigned freelancer can create milestones.");
  }

  const {
    title,
    mDesc,
    projectPhase,
    budget,
    deadline,
    comments,
    attachments,
  } = validate(milestoneSchemas.projectCreate, payload ?? {});

  if (Number(budget) <= 0) {
    throw validationError("Milestone budget must be greater than zero.");
  }

  if (!deadline) {
    throw validationError("Milestone deadline is required.");
  }

  const due = new Date(deadline);
  if (Number.isNaN(due.getTime()) || due.getTime() <= Date.now()) {
    throw validationError("Milestone deadline must be in the future.");
  }

  const milestone = await milestoneRepository.createMilestone({
    title,
    mDesc: mDesc || "",
    amountPayable: Number(budget),
    dueDate: deadline,
    contractID: contract.id,
    projectID: contract.projectID,
    projectPhase,
    deadline,
    budget: Number(budget),
    status: "pending",
    completionDate: null,
    comments,
    attachments,
  });

  await auditRepository.insertAuditLog({
    entity: "Milestone",
    entityID: milestone.id,
    actionPerformed: "create",
    oldValue: null,
    newValue: toShortString({ title, mDesc, budget: Number(budget), deadline }),
    userID: freelancerID,
  }).catch(() => {});

  return normalizeMilestoneRow(milestone);
}

export async function getMilestones(contractID, userID, role) {
  const contract = await getContractForActor(contractID, userID, role);
  return milestoneRepository.getMilestonesByContractId(contract.id);
}

export async function getMilestonesByProject(projectID, userID, query = {}) {
  const projectId = coercePositiveInt(projectID, "project ID");
  const userId = coercePositiveInt(userID, "user ID");

  const freelancerContract =
    await projectRepository.getFreelancerContractByProjectId(projectId, userId);
  const clientContract =
    await projectRepository.getContractByProjectId(projectId);
  const isProjectClient = Number(clientContract?.clientID) === userId;
  const isProjectFreelancer =
    Number(freelancerContract?.freelancerID) === userId;

  if (!isProjectClient && !isProjectFreelancer) {
    throw forbiddenError(
      "You do not have access to this project's milestones.",
    );
  }

  const milestones = await milestoneRepository.getMilestonesByProjectId(
    projectId,
    query,
  );
  return milestones.map(normalizeMilestoneRow);
}

export async function getFreelancerMilestones(freelancerID, query = {}) {
  const freelancerId = coercePositiveInt(freelancerID, "freelancer ID");
  const rows = await milestoneRepository.getFreelancerMilestones(
    freelancerId,
    query,
  );
  return rows.map(normalizeMilestoneRow);
}

export async function calculateProjectProgress(projectID, userID) {
  const milestones = await getMilestonesByProject(projectID, userID, {});
  const total = milestones.length;
  const completed = milestones.filter(
    (item) => item.status === "completed",
  ).length;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { projectID: Number(projectID), total, completed, progress };
}

export async function getFreelancerProjectsWithMilestones(
  freelancerID,
  query = {},
) {
  const milestones = await getFreelancerMilestones(freelancerID, query);
  const grouped = milestones.reduce((acc, item) => {
    const key = String(item.projectID || "unknown");
    if (!acc[key]) {
      acc[key] = {
        projectID: item.projectID,
        projectTitle: item.projectTitle,
        projectStatus: item.projectStatus,
        milestones: [],
      };
    }
    acc[key].milestones.push(item);
    return acc;
  }, {});

  const projects = Object.values(grouped).map((project) => {
    const total = project.milestones.length;
    const completed = project.milestones.filter(
      (item) => item.status === "completed",
    ).length;
    return {
      ...project,
      progress: total === 0 ? 0 : Math.round((completed / total) * 100),
    };
  });

  const reminders = milestones
    .filter(
      (item) =>
        item.status !== "completed" &&
        item.deadline &&
        new Date(item.deadline).getTime() - Date.now() <=
          2 * 24 * 60 * 60 * 1000 &&
        new Date(item.deadline).getTime() > Date.now(),
    )
    .map((item) => ({
      milestoneID: item.id,
      title: item.title,
      projectID: item.projectID,
      projectTitle: item.projectTitle,
      deadline: item.deadline,
      reminderType: "upcoming_deadline",
    }));

  return { projects, reminders };
}

export async function getOverdueMilestones(freelancerID) {
  const freelancerId = coercePositiveInt(freelancerID, "freelancer ID");
  const rows =
    await milestoneRepository.getOverdueMilestonesByFreelancer(freelancerId);
  return rows.map(normalizeMilestoneRow);
}

export async function getUpcomingMilestones(freelancerID) {
  const freelancerId = coercePositiveInt(freelancerID, "freelancer ID");
  const rows =
    await milestoneRepository.getUpcomingMilestonesByFreelancer(freelancerId);
  return rows.map(normalizeMilestoneRow);
}

export async function updateMilestoneStatus(id, userID, role, payload) {
  const milestoneId = coercePositiveInt(id, "milestone ID");
  const parsedPayload = validate(
    milestoneSchemas.statusFlexible,
    payload ?? {},
  );
  const mStatus = parsedPayload.mStatus ?? null;
  const statusPayload = parsedPayload.status
    ? validate(milestoneSchemas.statusV2, parsedPayload)
    : null;

  const milestone = await milestoneRepository.getMilestoneById(milestoneId);
  if (!milestone) {
    throw notFoundError("Milestone not found.");
  }

  const contract = await getContractForActor(
    milestone.contractID,
    userID,
    role,
  );

  if (contract.cStatus !== "active") {
    throw conflictError("Only active contracts can change milestones.");
  }

  if (!contract.clientSignedAt || !contract.freelancerSignedAt) {
    throw conflictError(
      "Both parties must sign the contract before milestone progress can continue.",
    );
  }

  if (mStatus && milestone.mStatus === "approved" && mStatus !== "approved") {
    throw conflictError("Approved milestones cannot change status.");
  }

  if (!mStatus && role === "freelancer") {
    throw forbiddenError("Freelancers must provide mStatus for updates.");
  }

  if (
    role === "freelancer" &&
    mStatus &&
    !["in_progress", "submitted"].includes(mStatus)
  ) {
    throw forbiddenError("Freelancers can only start or submit milestones.");
  }

  if (role === "freelancer" && milestone.mStatus === "approved") {
    throw conflictError("Approved milestones cannot be submitted again.");
  }

  if (!mStatus && statusPayload && role !== "client") {
    throw forbiddenError("Only clients can update project milestone status.");
  }

  if (
    role === "freelancer" &&
    mStatus === "in_progress" &&
    milestone.mStatus !== "pending"
  ) {
    throw conflictError("Only pending milestones can be started.");
  }

  if (
    role === "freelancer" &&
    mStatus === "submitted" &&
    !["in_progress", "rejected"].includes(milestone.mStatus)
  ) {
    throw conflictError(
      "Only in-progress or rejected milestones can be submitted.",
    );
  }

  if (
    role === "client" &&
    mStatus &&
    !["pending", "in_progress", "approved", "rejected"].includes(mStatus)
  ) {
    throw forbiddenError(
      "Clients can approve, reject, or manage milestone progress.",
    );
  }

  if (
    role === "client" &&
    mStatus &&
    ["approved", "rejected"].includes(mStatus)
  ) {
    if (!["submitted", "in_progress"].includes(milestone.mStatus)) {
      throw conflictError(
        "Only submitted milestones can be approved or rejected.",
      );
    }
  }

  const updated = mStatus
    ? await milestoneRepository.updateMilestoneStatus(milestoneId, mStatus)
    : await milestoneRepository.getMilestoneById(milestoneId);

  if (!updated) {
    throw notFoundError("Milestone not found.");
  }

  if (role === "client" && statusPayload) {
    const completionDate =
      statusPayload.status === "completed"
        ? statusPayload.completionDate || nowUtcIso()
        : null;
    await milestoneRepository.updateMilestoneProjectStatus(milestoneId, {
      status: statusPayload.status,
      completionDate,
      comments: statusPayload.comments ?? null,
    });
  }

  if (mStatus === "submitted") {
    const io = getIO();
    if (io) {
      emitMilestoneSubmitted(io, {
        clientID: contract.clientID,
        contractID: contract.id,
        milestoneID: milestoneId,
        projectID: contract.projectID,
        projectTitle: contract.projectTitle,
        freelancerID: contract.freelancerID,
      });
    }
    notifyParties(contract, {
      title: "Milestone Submitted",
      msg: `A milestone was submitted for "${contract.projectTitle}".`,
      metadata: { contractID: contract.id, milestoneID: milestoneId },
    }).catch(() => {});
  }

  if (mStatus === "approved") {
    releaseMilestoneFunds(milestoneId, userID).catch((err) => {
      console.warn("[milestone] release funds:", err?.message || err);
    });

    const io = getIO();
    if (io) {
      emitMilestoneApproved(io, {
        freelancerID: contract.freelancerID,
        contractID: contract.id,
        milestoneID: milestoneId,
        projectID: contract.projectID,
        projectTitle: contract.projectTitle,
      });
    }

    notifyParties(contract, {
      title: "Milestone Approved",
      msg: `A milestone was approved for "${contract.projectTitle}".`,
      metadata: { contractID: contract.id, milestoneID: milestoneId },
    }).catch(() => {});

    const milestones = await milestoneRepository.getMilestonesByContractId(
      contract.id,
    );
    if (
      milestones.length > 0 &&
      milestones.every((item) => item.mStatus === "approved")
    ) {
      validateStatusTransition(contract.projectStatus, "completed");
      await projectRepository.updateContractStatus(contract.id, "completed");
      await projectRepository.updateProjectStatus(
        contract.projectID,
        "completed",
      );

      if (io) {
        emitProjectStatusChanged(io, {
          projectID: contract.projectID,
          projectTitle: contract.projectTitle,
          clientID: contract.clientID,
          freelancerID: contract.freelancerID,
          oldStatus: contract.projectStatus,
          newStatus: "completed",
        });
      }

      pushFreelancerNotification({
        types: "system",
        receiverID: contract.freelancerID,
        title: "Project Completed",
        msg: `Project "${contract.projectTitle}" has been completed.`,
        metadata: {
          projectID: contract.projectID,
          projectTitle: contract.projectTitle,
          actionUrl: "/freelancer/contracts",
        },
      }).catch(() => {});

      pushNotification({
        types: "system",
        receiverID: contract.clientID,
        title: "Project Completed",
        msg: `Project "${contract.projectTitle}" has been completed.`,
      }).catch(() => {});

      createActivity({
        freelancerID: contract.freelancerID,
        eventType: "project_completed",
        metadata: {
          projectID: contract.projectID,
          projectTitle: contract.projectTitle,
        },
      }).catch(() => {});
    }
  }

  if (mStatus === "rejected") {
    const io = getIO();
    if (io) {
      emitMilestoneRejected(io, {
        freelancerID: contract.freelancerID,
        contractID: contract.id,
        milestoneID: milestoneId,
        projectID: contract.projectID,
        projectTitle: contract.projectTitle,
      });
    }
    notifyParties(contract, {
      title: "Milestone Rejected",
      msg: `A milestone needs revisions for "${contract.projectTitle}".`,
      metadata: { contractID: contract.id, milestoneID: milestoneId },
    }).catch(() => {});
  }

  const refreshed = await milestoneRepository.getMilestoneById(milestoneId);

  await auditRepository.insertAuditLog({
    entity: "Milestone",
    entityID: milestoneId,
    actionPerformed: "update_status",
    oldValue: toShortString(milestone.mStatus),
    newValue: toShortString(refreshed?.mStatus || mStatus),
    userID: userID,
  }).catch(() => {});

  return normalizeMilestoneRow(refreshed ?? updated);
}

export async function deleteMilestone(id, clientID) {
  const milestoneId = coercePositiveInt(id, "milestone ID");
  const milestone = await milestoneRepository.getMilestoneById(milestoneId);
  if (!milestone) {
    throw notFoundError("Milestone not found.");
  }

  if (milestone.mStatus === "approved") {
    throw conflictError("Approved milestones cannot be deleted.");
  }

  const contract = await getContractForActor(
    milestone.contractID,
    clientID,
    "client",
  );

  const deleted = await milestoneRepository.deleteMilestone(milestoneId);
  if (!deleted) {
    throw notFoundError("Milestone not found.");
  }

  notifyParties(contract, {
    title: "Milestone Deleted",
    msg: `A milestone was deleted from "${contract.projectTitle}".`,
    metadata: { contractID: contract.id, milestoneID: milestoneId },
  }).catch(() => {});

  return { id: milestoneId };
}

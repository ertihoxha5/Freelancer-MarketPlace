import * as milestoneRepository from "../repositories/milestoneRepository.js";
import * as projectRepository from "../repositories/projectRepository.js";
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

const VALID_MILESTONE_STATUSES = [
  "pending",
  "in_progress",
  "submitted",
  "approved",
  "rejected",
];

function validationError(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function notFoundError(message) {
  const err = new Error(message);
  err.statusCode = 404;
  return err;
}

function forbiddenError(message) {
  const err = new Error(message);
  err.statusCode = 403;
  return err;
}

function conflictError(message) {
  const err = new Error(message);
  err.statusCode = 409;
  return err;
}

function coercePositiveInt(value, label) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw validationError(`Valid ${label} is required.`);
  }
  return num;
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

async function notifyParties(contract, { title, msg, freelancerMsg, metadata }) {
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
  const { title, mDesc, amountPayable, dueDate } = payload ?? {};

  if (typeof title !== "string" || title.trim() === "") {
    throw validationError("Milestone title is required.");
  }
  if (title.trim().length > 20) {
    throw validationError("Milestone title must be 20 characters or fewer.");
  }
  if (typeof mDesc !== "string" || mDesc.trim() === "") {
    throw validationError("Milestone description is required.");
  }
  const amount = Number(amountPayable);
  if (Number.isNaN(amount) || amount <= 0) {
    throw validationError("Milestone amount must be greater than zero.");
  }

  const milestone = await milestoneRepository.createMilestone({
    title: title.trim(),
    mDesc: mDesc.trim(),
    amountPayable: amount,
    dueDate: dueDate || null,
    contractID: contract.id,
  });

  notifyParties(contract, {
    title: "Milestone Created",
    msg: `A milestone was created for "${contract.projectTitle}".`,
    metadata: { contractID: contract.id, milestoneID: milestone.id },
  }).catch(() => {});

  return milestone;
}

export async function getMilestones(contractID, userID, role) {
  const contract = await getContractForActor(contractID, userID, role);
  return milestoneRepository.getMilestonesByContractId(contract.id);
}

export async function updateMilestoneStatus(id, userID, role, payload) {
  const milestoneId = coercePositiveInt(id, "milestone ID");
  const mStatus =
    typeof payload?.mStatus === "string" ? payload.mStatus.trim() : "";

  if (!VALID_MILESTONE_STATUSES.includes(mStatus)) {
    throw validationError(
      `mStatus must be one of: ${VALID_MILESTONE_STATUSES.join(", ")}.`,
    );
  }

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

  if (milestone.mStatus === "approved" && mStatus !== "approved") {
    throw conflictError("Approved milestones cannot change status.");
  }

  if (role === "freelancer" && mStatus !== "submitted") {
    throw forbiddenError("Freelancers can only submit milestones.");
  }

  if (role === "freelancer" && milestone.mStatus === "approved") {
    throw conflictError("Approved milestones cannot be submitted again.");
  }

  if (role === "client" && !["pending", "in_progress", "approved", "rejected"].includes(mStatus)) {
    throw forbiddenError("Clients can approve, reject, or manage milestone progress.");
  }

  if (role === "client" && ["approved", "rejected"].includes(mStatus)) {
    if (!["submitted", "in_progress"].includes(milestone.mStatus)) {
      throw conflictError("Only submitted milestones can be approved or rejected.");
    }
  }

  const updated = await milestoneRepository.updateMilestoneStatus(
    milestoneId,
    mStatus,
  );

  if (!updated) {
    throw notFoundError("Milestone not found.");
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
      await projectRepository.updateProjectStatus(contract.projectID, "completed");

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

  return updated;
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

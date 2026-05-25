import * as milestoneService from "../services/milestoneService.js";
import { validatedBody, validatedParams } from "../middleware/validateRequest.js";

function roleFromRequest(req) {
  return Number(req.user?.roleID) === 2 ? "client" : "freelancer";
}

export async function createMilestone(req, res, next) {
  try {
    const { contractId } = validatedParams(req);
    const milestone = await milestoneService.createMilestone(
      contractId,
      req.user.id,
      validatedBody(req),
    );
    return res
      .status(201)
      .json({ message: "Milestone created successfully.", milestone });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
}

export async function getMilestones(req, res, next) {
  try {
    const { contractId } = validatedParams(req);
    const milestones = await milestoneService.getMilestones(
      contractId,
      req.user.id,
      roleFromRequest(req),
    );
    return res.status(200).json({ milestones });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
}

export async function updateMilestoneStatus(req, res, next) {
  try {
    const { id } = validatedParams(req);
    const milestone = await milestoneService.updateMilestoneStatus(
      id,
      req.user.id,
      roleFromRequest(req),
      validatedBody(req),
    );
    return res
      .status(200)
      .json({ message: "Milestone status updated successfully.", milestone });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
}

export async function deleteMilestone(req, res, next) {
  try {
    const { id } = validatedParams(req);
    const result = await milestoneService.deleteMilestone(id, req.user.id);
    return res
      .status(200)
      .json({ message: "Milestone deleted successfully.", ...result });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
}

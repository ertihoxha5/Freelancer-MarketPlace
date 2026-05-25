import * as projectRepository from "../repositories/projectRepository.js";
import * as milestoneRepository from "../repositories/milestoneRepository.js";
import * as reviewRepository from "../repositories/reviewRepository.js";
import {
  forbiddenError,
  notFoundError,
  validationError,
} from "../utils/errors.js";

function isClient(req) {
  return Number(req.user?.roleID) === 2;
}

async function getContractForRequest(req) {
  const contractID = Number(req.params.id);
  if (!Number.isInteger(contractID) || contractID <= 0) {
    throw validationError("Valid contract ID is required.");
  }
  const contract = await projectRepository.getContractById(contractID);

  if (!contract) {
    throw notFoundError("Contract not found.");
  }

  if (isClient(req) && Number(contract.clientID) !== Number(req.user.id)) {
    throw forbiddenError("You do not own this contract.");
  }

  if (!isClient(req) && Number(contract.freelancerID) !== Number(req.user.id)) {
    throw forbiddenError("You are not assigned to this contract.");
  }

  return contract;
}

export async function getMyContracts(req, res, next) {
  try {
    const contractsRaw = isClient(req)
      ? await projectRepository.getContractsByClientId(req.user.id)
      : await projectRepository.getContractsByFreelancerId(req.user.id);
    const contracts = await Promise.all(
      contractsRaw.map(async (contract) => ({
        ...contract,
        hasReviewed: await reviewRepository.hasReviewedAlready(
          contract.id,
          req.user.id,
        ),
      })),
    );

    return res.status(200).json({ contracts });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
}

export async function getMyContractById(req, res, next) {
  try {
    const contract = await getContractForRequest(req);
    const milestones = await milestoneRepository.getMilestonesByContractId(
      contract.id,
    );
    const hasReviewed = await reviewRepository.hasReviewedAlready(
      contract.id,
      req.user.id,
    );

    return res.status(200).json({
      contract: { ...contract, hasReviewed, milestones },
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
}

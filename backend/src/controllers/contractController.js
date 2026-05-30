import * as projectRepository from "../repositories/projectRepository.js";
import * as milestoneRepository from "../repositories/milestoneRepository.js";
import * as reviewRepository from "../repositories/reviewRepository.js";
import {
  forbiddenError,
  notFoundError,
} from "../utils/errors.js";
import { validatedParams } from "../middleware/validateRequest.js";

function isClient(req) {
  return Number(req.user?.roleID) === 2;
}

function decorateContract(contract) {
  const clientSigned = Boolean(contract.clientSignedAt);
  const freelancerSigned = Boolean(contract.freelancerSignedAt);
  return {
    ...contract,
    clientSigned,
    freelancerSigned,
    isFullySigned: clientSigned && freelancerSigned,
  };
}

async function getContractForRequest(req) {
  const { id: contractID } = validatedParams(req);
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
    console.log(`✅ getMyContracts called by user ${req.user?.id} (Role: ${req.user?.roleID})`);

    const contractsRaw = isClient(req)
      ? await projectRepository.getContractsByClientId(req.user.id)
      : await projectRepository.getContractsByFreelancerId(req.user.id);

    console.log(`📦 Found ${contractsRaw.length} raw contracts`);

    // Improved version with error handling per contract
    const contracts = await Promise.all(
      contractsRaw.map(async (contract) => {
        try {
          const hasReviewed = await reviewRepository.hasReviewedAlready(
            contract.id,
            req.user.id
          );
          return decorateContract({ ...contract, hasReviewed });
        } catch (reviewErr) {
          console.error(`❌ Failed to check review for contract ${contract.id}:`, reviewErr.message);
          return decorateContract({ ...contract, hasReviewed: false }); // Safe fallback
        }
      })
    );

    return res.status(200).json({ contracts });
  } catch (err) {
    console.error("🔥 Critical error in getMyContracts:", err);
    
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    
    next(err); // Let global error handler catch it
  }
}

export async function getMyContractById(req, res, next) {
  try {
    const contract = await getContractForRequest(req);
    
    const milestones = await milestoneRepository.getMilestonesByContractId(
      contract.id
    );
    
    let hasReviewed = false;
    try {
      hasReviewed = await reviewRepository.hasReviewedAlready(
        contract.id,
        req.user.id
      );
    } catch (reviewErr) {
      console.error(`Failed to check review for contract ${contract.id}:`, reviewErr.message);
    }

    return res.status(200).json({
      contract: decorateContract({ ...contract, hasReviewed, milestones }),
    });
  } catch (err) {
    console.error("🔥 Error in getMyContractById:", err);
    
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
}

export async function signContract(req, res, next) {
  try {
    const contract = await getContractForRequest(req);
    const role = isClient(req) ? "client" : "freelancer";
    const currentField = role === "client" ? contract.clientSignedAt : contract.freelancerSignedAt;
    if (currentField) {
      return res.status(200).json({
        message: "Contract already signed.",
        contract: decorateContract(contract),
      });
    }

    const signed = await projectRepository.updateContractSignature(
      contract.id,
      role,
      new Date(),
    );
    if (!signed) {
      throw notFoundError("Contract not found.");
    }

    const updated = await projectRepository.getContractById(contract.id);
    return res.status(200).json({
      message: "Contract signed.",
      contract: decorateContract(updated),
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
}

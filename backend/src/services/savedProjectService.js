import * as repo from "../repositories/savedProjectRepository.js";
import * as projectRepository from "../repositories/projectRepository.js";
import * as userRepository from "../repositories/userRepository.js";
import {
  conflictError,
  notFoundError,
} from "../utils/errors.js";

async function ensureUserExists(userID) {
  const user = await userRepository.findUserContactById(userID);
  if (!user) {
    throw notFoundError("User not found.");
  }
  return user;
}

async function ensureProjectExists(projectID) {
  const project = await projectRepository.getProjectById(projectID);
  if (!project) {
    throw notFoundError("Project not found.");
  }
  return project;
}

export async function saveProject(userID, projectID) {
  await ensureUserExists(userID);
  await ensureProjectExists(projectID);

  if (await repo.findSavedProject(userID, projectID)) {
    throw conflictError("Project is already saved.");
  }

  return repo.createSavedProject(userID, projectID);
}

export async function removeSavedProject(userID, projectID) {
  await ensureUserExists(userID);
  const existing = await repo.findSavedProject(userID, projectID);
  if (!existing) {
    throw notFoundError("Saved project not found.");
  }
  await repo.deleteSavedProject(userID, projectID);
  return { removed: true };
}

export async function getSavedProjects(userID, query = {}) {
  await ensureUserExists(userID);
  return repo.listSavedProjects(userID, query);
}

export async function getFolders(userID) {
  await ensureUserExists(userID);
  return repo.listSavedFolders(userID);
}

export async function moveSavedProjectToFolder(userID, projectID, folder) {
  await ensureUserExists(userID);
  const existing = await repo.findSavedProject(userID, projectID);
  if (!existing) {
    throw notFoundError("Saved project not found.");
  }
  return repo.updateSavedProject(userID, projectID, { folder });
}

export async function updateSavedProject(userID, projectID, updates) {
  await ensureUserExists(userID);
  const existing = await repo.findSavedProject(userID, projectID);
  if (!existing) {
    throw notFoundError("Saved project not found.");
  }
  return repo.updateSavedProject(userID, projectID, updates);
}

export async function bulkSaveProjects(userID, projectIDs) {
  await ensureUserExists(userID);
  if (!Array.isArray(projectIDs) || projectIDs.length === 0) {
    throw new Error("projectIDs must be a non-empty array.");
  }
  const uniqueIds = [...new Set(projectIDs.map(Number))].filter(
    (id) => Number.isInteger(id) && id > 0,
  );

  const reported = {
    saved: [],
    skipped: [],
    missing: [],
  };

  for (const projectID of uniqueIds) {
    const project = await projectRepository.getProjectById(projectID);
    if (!project) {
      reported.missing.push(projectID);
      continue;
    }
    if (await repo.findSavedProject(userID, projectID)) {
      reported.skipped.push(projectID);
      continue;
    }
    const saved = await repo.createSavedProject(userID, projectID);
    reported.saved.push(saved);
  }

  return reported;
}

export async function bulkRemoveProjects(userID, projectIDs) {
  await ensureUserExists(userID);
  if (!Array.isArray(projectIDs) || projectIDs.length === 0) {
    throw new Error("projectIDs must be a non-empty array.");
  }
  const uniqueIds = [...new Set(projectIDs.map(Number))].filter(
    (id) => Number.isInteger(id) && id > 0,
  );
  const deleted = await repo.bulkDeleteSavedProjects(userID, uniqueIds);
  return { deleted };
}

export async function isSaved(userID, projectID) {
  await ensureUserExists(userID);
  return repo.isSaved(userID, projectID);
}

export async function getSavedCount(userID) {
  await ensureUserExists(userID);
  return repo.getSavedCount(userID);
}

export async function getSaveTimestamp(userID, projectID) {
  await ensureUserExists(userID);
  return repo.getSaveTimestamp(userID, projectID);
}

import * as repo from "../repositories/savedProjectRepository.js";

export async function saveProject(userID, projectID) {
  return repo.saveProject(userID, projectID);
}

export async function removeSavedProject(userID, projectID) {
  return repo.removeSavedProject(userID, projectID);
}

export async function getSavedProjects(userID) {
  return repo.getSavedProjects(userID);
}
import * as service from "../services/savedProjectService.js";

export async function saveProject(req, res) {
  await service.saveProject(req.user.id, req.params.projectID);
  res.json({ message: "Saved" });
}

export async function removeSavedProject(req, res) {
  await service.removeSavedProject(req.user.id, req.params.projectID);
  res.json({ message: "Removed" });
}

export async function getSavedProjects(req, res) {
  const projects = await service.getSavedProjects(req.user.id);
  res.json({ projects });
}
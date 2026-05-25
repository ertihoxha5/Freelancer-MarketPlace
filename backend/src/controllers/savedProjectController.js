import * as service from "../services/savedProjectService.js";
import { validatedParams } from "../middleware/validateRequest.js";

export async function saveProject(req, res) {
  const { projectID } = validatedParams(req);
  await service.saveProject(req.user.id, projectID);
  res.json({ message: "Saved" });
}

export async function removeSavedProject(req, res) {
  const { projectID } = validatedParams(req);
  await service.removeSavedProject(req.user.id, projectID);
  res.json({ message: "Removed" });
}

export async function getSavedProjects(req, res) {
  const projects = await service.getSavedProjects(req.user.id);
  res.json({ projects });
}
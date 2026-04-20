import * as projectService from "../services/projectService.js";

export async function getProjectsWithFreelancer(req, res, next) {
  try {
    const projects = await projectService.getProjectsWithFreelancer();
    return res.status(200).json({ projects });
  } catch (err) {
    if (err.statusCode)
      return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
}

export async function getProjectsWithoutFreelancer(req, res, next) {
  try {
    const projects = await projectService.getProjectsWithoutFreelancer();
    return res.status(200).json({ projects });
  } catch (err) {
    if (err.statusCode)
      return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
}

export async function getClientList(req, res, next) {
  try {
    const clients = await projectService.getClientList();
    return res.status(200).json({ clients });
  } catch (err) {
    if (err.statusCode)
      return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
}

export async function createProject(req, res, next) {
  try {
    const project = await projectService.createProject(req.body);
    return res
      .status(201)
      .json({ message: "Project created successfully.", project });
  } catch (err) {
    if (err.statusCode)
      return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
}

export async function updateProject(req, res, next) {
  try {
    const project = await projectService.updateProject(req.params.id, req.body);
    return res
      .status(200)
      .json({ message: "Project updated successfully.", project });
  } catch (err) {
    if (err.statusCode)
      return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
}

export async function deleteProject(req, res, next) {
  try {
    const result = await projectService.deleteProject(req.params.id);
    return res
      .status(200)
      .json({ message: "Project deleted successfully.", ...result });
  } catch (err) {
    if (err.statusCode)
      return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
}

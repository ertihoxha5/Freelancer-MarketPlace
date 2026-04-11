import * as clientService from "../services/clientService.js";

// ─── GET /api/client/projects (list all projects for logged-in client) ───────
export async function getMyProjects(req, res, next) {
  try {
    const clientID = req.user.id;
    const projects = await clientService.getMyProjects(clientID);
    return res.status(200).json({ projects });
  } catch (err) {
    if (err.statusCode)
      return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
}

// ─── GET /api/client/projects/:id (get single project) ──────────────────────
export async function getMyProject(req, res, next) {
  try {
    const clientID = req.user.id;
    const projectID = req.params.id;
    const project = await clientService.getMyProject(projectID, clientID);
    return res.status(200).json({ project });
  } catch (err) {
    if (err.statusCode)
      return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
}

// ─── POST /api/client/projects (create new project) ────────────────────────
export async function createMyProject(req, res, next) {
  try {
    const clientID = req.user.id;
    const project = await clientService.createMyProject({
      ...req.body,
      clientID,
    });
    return res
      .status(201)
      .json({ message: "Project created successfully.", project });
  } catch (err) {
    if (err.statusCode)
      return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
}

// ─── PATCH /api/client/projects/:id (update own project) ────────────────────
export async function updateMyProject(req, res, next) {
  try {
    const clientID = req.user.id;
    const projectID = req.params.id;
    const project = await clientService.updateMyProject(
      projectID,
      clientID,
      req.body,
    );
    return res
      .status(200)
      .json({ message: "Project updated successfully.", project });
  } catch (err) {
    if (err.statusCode)
      return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
}

// ─── DELETE /api/client/projects/:id (delete own project) ──────────────────
export async function deleteMyProject(req, res, next) {
  try {
    const clientID = req.user.id;
    const projectID = req.params.id;
    const result = await clientService.deleteMyProject(projectID, clientID);
    return res
      .status(200)
      .json({ message: "Project deleted successfully.", ...result });
  } catch (err) {
    if (err.statusCode)
      return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
}

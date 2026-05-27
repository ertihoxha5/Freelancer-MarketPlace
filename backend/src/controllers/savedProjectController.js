import * as service from "../services/savedProjectService.js";
import {
  validatedBody,
  validatedParams,
  validatedQuery,
} from "../middleware/validateRequest.js";

function escapeCsv(value) {
  if (value == null) return "";
  const stringValue = String(value);
  if (/[",\r\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function buildSavedProjectsCsv(projects) {
  const headers = [
    "savedProjectID",
    "projectID",
    "title",
    "clientName",
    "categoryName",
    "budget",
    "deadline",
    "folder",
    "priority",
    "savedAt",
    "notes",
    "saveCount",
  ];
  const rows = projects.map((project) =>
    headers.map((header) => escapeCsv(project[header])).join(","),
  );
  return [headers.join(","), ...rows].join("\r\n");
}

export async function saveProject(req, res, next) {
  try {
    const { projectID } = validatedParams(req);
    await service.saveProject(req.user.id, projectID);
    res.json({ message: "Saved" });
  } catch (err) {
    if (err.statusCode)
      return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
}

export async function removeSavedProject(req, res, next) {
  try {
    const { projectID } = validatedParams(req);
    await service.removeSavedProject(req.user.id, projectID);
    res.json({ message: "Removed" });
  } catch (err) {
    if (err.statusCode)
      return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
}

export async function getSavedProjects(req, res, next) {
  try {
    const query = validatedQuery(req);
    const result = await service.getSavedProjects(req.user.id, query);
    if (query.format === "csv") {
      const csv = buildSavedProjectsCsv(result.projects);
      res.header("Content-Type", "text/csv");
      res.send(csv);
    } else {
      res.json(result);
    }
  } catch (err) {
    if (err.statusCode)
      return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
}

export async function getFolders(req, res, next) {
  try {
    const folders = await service.getFolders(req.user.id);
    res.json({ folders });
  } catch (err) {
    if (err.statusCode)
      return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
}

export async function moveToFolder(req, res, next) {
  try {
    const { projectID } = validatedParams(req);
    const { folder } = validatedBody(req);
    const saved = await service.moveSavedProjectToFolder(
      req.user.id,
      projectID,
      folder,
    );
    res.json({ message: "Saved project moved to folder.", saved });
  } catch (err) {
    if (err.statusCode)
      return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
}

export async function updateSavedProject(req, res, next) {
  try {
    const { projectID } = validatedParams(req);
    const updates = validatedBody(req);
    const saved = await service.updateSavedProject(
      req.user.id,
      projectID,
      updates,
    );
    res.json({ message: "Saved project updated.", saved });
  } catch (err) {
    if (err.statusCode)
      return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
}

export async function bulkSaveProjects(req, res, next) {
  try {
    const { projectIDs } = validatedBody(req);
    const result = await service.bulkSaveProjects(req.user.id, projectIDs);
    res.json({ message: "Saved projects processed.", result });
  } catch (err) {
    if (err.statusCode)
      return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
}

export async function bulkRemoveProjects(req, res, next) {
  try {
    const { projectIDs } = validatedBody(req);
    const result = await service.bulkRemoveProjects(req.user.id, projectIDs);
    res.json({ message: "Saved projects removed.", result });
  } catch (err) {
    if (err.statusCode)
      return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
}

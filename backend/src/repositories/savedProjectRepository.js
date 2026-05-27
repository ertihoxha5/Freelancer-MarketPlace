import { randomUUID } from "crypto";
import SavedProject from "../models/SavedProjectModel.js";

function resolveSort(sort) {
  switch (sort) {
    case "oldest":
      return { savedAt: 1 };
    case "popular":
      return { savedAt: -1 };
    default:
      return { savedAt: -1 };
  }
}

export async function createSavedProject(userID, projectID) {
  const savedProjectID = randomUUID();
  const savedProject = await SavedProject.create({
    savedProjectID,
    userID,
    projectID,
    folder: "default",
    priority: "medium",
  });

  return savedProject.toObject();
}

export async function findSavedProject(userID, projectID) {
  return SavedProject.findOne({ userID, projectID }).lean();
}

export async function deleteSavedProject(userID, projectID) {
  const result = await SavedProject.deleteOne({ userID, projectID });
  return result.deletedCount;
}

export async function listSavedProjects(userID, options = {}) {
  const page = Number(options.page) || 1;
  const limit = Math.min(Math.max(Number(options.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;
  const sort = resolveSort(options.sort);

  const filter = { userID };
  const total = await SavedProject.countDocuments(filter);
  const projects = await SavedProject.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    projects,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function listSavedFolders(userID) {
  const rows = await SavedProject.aggregate([
    { $match: { userID } },
    { $group: { _id: "$folder", count: { $sum: 1 } } },
    { $project: { folder: "$_id", count: 1, _id: 0 } },
    { $sort: { folder: 1 } },
  ]);
  return rows;
}

export async function updateSavedProject(userID, projectID, updates) {
  if (Object.keys(updates).length === 0) {
    return findSavedProject(userID, projectID);
  }

  const savedProject = await SavedProject.findOneAndUpdate(
    { userID, projectID },
    { $set: updates },
    { new: true, lean: true },
  );

  return savedProject;
}

export async function bulkDeleteSavedProjects(userID, projectIDs) {
  if (!projectIDs.length) {
    return 0;
  }

  const result = await SavedProject.deleteMany({
    userID,
    projectID: { $in: projectIDs },
  });

  return result.deletedCount;
}

export async function isSaved(userID, projectID) {
  const savedProject = await SavedProject.exists({ userID, projectID });
  return Boolean(savedProject);
}

export async function getSavedCount(userID) {
  return SavedProject.countDocuments({ userID });
}

export async function getSaveTimestamp(userID, projectID) {
  const result = await SavedProject.findOne(
    { userID, projectID },
    { savedAt: 1, _id: 0 },
  ).lean();
  return result?.savedAt ?? null;
}

import Skill from "../models/SkillModel.js";
import {
  conflictError,
  notFoundError,
  validationError,
} from "../utils/errors.js";

const VALID_CATEGORIES = ["freelancer", "designer", "developer"];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeSkillData(payload) {
  const skillName = payload.skillName?.trim();
  const description = payload.description?.trim() ?? "";
  const category = payload.category;

  if (!skillName) {
    throw validationError("Skill name is required.");
  }
  if (!VALID_CATEGORIES.includes(category)) {
    throw validationError(
      "Category must be one of freelancer, designer, or developer.",
    );
  }

  return {
    skillName,
    description,
    category,
    isActive: payload.isActive == null ? true : Boolean(payload.isActive),
  };
}

export async function getAllSkills(page = 1, limit = 50, options = {}) {
  const skip = Math.max(0, (Number(page) - 1) * Number(limit));
  const filter = {};
  if (!options.includeInactive) {
    filter.isActive = true;
  }

  const [skills, total] = await Promise.all([
    Skill.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Skill.countDocuments(filter),
  ]);

  return {
    skills,
    page: Number(page),
    limit: Number(limit),
    total,
    totalPages: Math.ceil(total / Number(limit)),
  };
}

export async function getSkillById(id, options = {}) {
  const filter = { skillID: id };
  if (!options.includeInactive) {
    filter.isActive = true;
  }

  const skill = await Skill.findOne(filter).lean();
  if (!skill) {
    throw notFoundError("Skill not found.");
  }
  return skill;
}

export async function createSkill(payload) {
  const skillData = normalizeSkillData(payload);

  const existing = await Skill.findOne({ skillName: skillData.skillName });
  if (existing) {
    throw conflictError("Skill name already exists.");
  }

  try {
    const skill = await Skill.create(skillData);
    return skill.toObject();
  } catch (err) {
    if (err.code === 11000) {
      throw conflictError("Skill name already exists.");
    }
    throw err;
  }
}

export async function updateSkill(id, payload) {
  const existingSkill = await Skill.findOne({ skillID: id });
  if (!existingSkill) {
    throw notFoundError("Skill not found.");
  }

  if (payload.skillName) {
    const normalizedName = payload.skillName.trim();
    if (normalizedName !== existingSkill.skillName) {
      const duplicate = await Skill.findOne({ skillName: normalizedName });
      if (duplicate && duplicate.skillID !== id) {
        throw conflictError("Skill name already exists.");
      }
      existingSkill.skillName = normalizedName;
    }
  }

  if (payload.description !== undefined) {
    existingSkill.description = payload.description?.trim() ?? "";
  }

  if (payload.category !== undefined) {
    if (!VALID_CATEGORIES.includes(payload.category)) {
      throw validationError(
        "Category must be one of freelancer, designer, or developer.",
      );
    }
    existingSkill.category = payload.category;
  }

  if (payload.isActive !== undefined) {
    existingSkill.isActive = Boolean(payload.isActive);
  }

  try {
    await existingSkill.save();
    return existingSkill.toObject();
  } catch (err) {
    if (err.code === 11000) {
      throw conflictError("Skill name already exists.");
    }
    throw err;
  }
}

export async function deleteSkill(id) {
  const skill = await Skill.findOne({ skillID: id });
  if (!skill) {
    throw notFoundError("Skill not found.");
  }
  if (!skill.isActive) {
    return { skillID: id, isActive: false };
  }

  skill.isActive = false;
  await skill.save();
  return { skillID: id, isActive: false };
}

export async function searchSkills(query) {
  const normalized = String(query || "").trim();
  if (!normalized) {
    return [];
  }

  const regex = new RegExp(escapeRegExp(normalized), "i");
  return Skill.find({
    isActive: true,
    $or: [{ skillName: regex }, { description: regex }],
  })
    .sort({ createdAt: -1 })
    .lean();
}

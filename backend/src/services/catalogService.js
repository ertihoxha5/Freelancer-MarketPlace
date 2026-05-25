import * as catalogRepository from "../repositories/catalogRepository.js";
import {
  conflictError,
  notFoundError,
  validationError,
} from "../utils/errors.js";

function slugify(value, maxLength = 20) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength);
}

function parsePositiveInt(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw validationError(`Valid ${label} is required.`);
  }
  return parsed;
}

function validateCategoryPayload(payload, existing = null) {
  const cName = typeof payload?.cName === "string" ? payload.cName.trim() : "";
  const cDesc = typeof payload?.cDesc === "string" ? payload.cDesc.trim() : "";
  const slugInput = typeof payload?.slug === "string" ? payload.slug.trim() : "";

  if (!cName) throw validationError("Category name is required.");
  if (cName.length > 20) {
    throw validationError("Category name must be 20 characters or fewer.");
  }
  if (!cDesc) throw validationError("Category description is required.");
  if (cDesc.length > 100) {
    throw validationError("Category description must be 100 characters or fewer.");
  }

  const slug = slugify(slugInput || cName);
  if (!slug) throw validationError("Valid category slug is required.");

  return {
    cName,
    cDesc,
    slug,
    isActive: payload?.isActive == null ? (existing?.isActive ?? true) : Boolean(payload.isActive),
  };
}

function validateSkillPayload(payload, existing = null) {
  const skillName =
    typeof payload?.skillName === "string" ? payload.skillName.trim() : "";
  const slugInput = typeof payload?.slug === "string" ? payload.slug.trim() : "";

  if (!skillName) throw validationError("Skill name is required.");
  if (skillName.length > 30) {
    throw validationError("Skill name must be 30 characters or fewer.");
  }

  return {
    skillName,
    slug: slugify(slugInput || skillName),
    categoryID: parsePositiveInt(payload?.categoryID, "category ID"),
    isActive: payload?.isActive == null ? (existing?.isActive ?? true) : Boolean(payload.isActive),
  };
}

export function getCategories(options) {
  return catalogRepository.getCategories(options);
}

export async function createCategory(payload) {
  return catalogRepository.createCategory(validateCategoryPayload(payload));
}

export async function updateCategory(id, payload) {
  const categoryId = parsePositiveInt(id, "category ID");
  const existing = await catalogRepository.getCategoryById(categoryId);
  if (!existing) throw notFoundError("Category not found.");
  return catalogRepository.updateCategory(
    categoryId,
    validateCategoryPayload(payload, existing),
  );
}

export async function deleteCategory(id) {
  const categoryId = parsePositiveInt(id, "category ID");
  const existing = await catalogRepository.getCategoryById(categoryId);
  if (!existing) throw notFoundError("Category not found.");
  if (!existing.isActive) return { id: categoryId, isActive: false };
  const deleted = await catalogRepository.deactivateCategory(categoryId);
  if (!deleted) throw notFoundError("Category not found.");
  return { id: categoryId, isActive: false };
}

export function getSkills(options) {
  return catalogRepository.getSkills(options);
}

export async function createSkill(payload) {
  const validated = validateSkillPayload(payload);
  const category = await catalogRepository.getCategoryById(validated.categoryID);
  if (!category || !category.isActive) {
    throw conflictError("Skill must belong to an active category.");
  }
  return catalogRepository.createSkill(validated);
}

export async function updateSkill(id, payload) {
  const skillId = parsePositiveInt(id, "skill ID");
  const existing = await catalogRepository.getSkillById(skillId);
  if (!existing) throw notFoundError("Skill not found.");
  const validated = validateSkillPayload(payload, existing);
  const category = await catalogRepository.getCategoryById(validated.categoryID);
  if (!category || !category.isActive) {
    throw conflictError("Skill must belong to an active category.");
  }
  return catalogRepository.updateSkill(skillId, validated);
}

export async function deleteSkill(id) {
  const skillId = parsePositiveInt(id, "skill ID");
  const existing = await catalogRepository.getSkillById(skillId);
  if (!existing) throw notFoundError("Skill not found.");
  if (!existing.isActive) return { id: skillId, isActive: false };
  const deleted = await catalogRepository.deactivateSkill(skillId);
  if (!deleted) throw notFoundError("Skill not found.");
  return { id: skillId, isActive: false };
}

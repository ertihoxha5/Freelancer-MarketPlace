import * as catalogRepository from "../repositories/catalogRepository.js";
import {
  conflictError,
  notFoundError,
  validationError,
} from "../utils/errors.js";
import { deleteCache, getCache, setCache } from "../utils/cache.js";

const PUBLIC_CATEGORY_CACHE_KEY = "categories:public";
const CATEGORY_TREE_CACHE_KEY = "categories:tree";

function slugify(value, maxLength = 50) {
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

function parseOptionalPositiveInt(value, label) {
  if (value == null || value === "") {
    return null;
  }
  return parsePositiveInt(value, label);
}

function validateUrl(value) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value.trim());
    return url.toString();
  } catch {
    throw validationError("iconUrl must be a valid URL.");
  }
}

function validateCategoryPayload(payload, existing = null) {
  const cName = typeof payload?.cName === "string" ? payload.cName.trim() : "";
  const cDesc = typeof payload?.cDesc === "string" ? payload.cDesc.trim() : "";
  const slugInput =
    typeof payload?.slug === "string" ? payload.slug.trim() : "";
  const iconUrl =
    typeof payload?.iconUrl === "string" ? payload.iconUrl.trim() : "";

  if (!cName) throw validationError("Category name is required.");
  if (cName.length < 3) {
    throw validationError("Category name must be at least 3 characters.");
  }
  if (cName.length > 50) {
    throw validationError("Category name must be 50 characters or fewer.");
  }

  if (!cDesc) throw validationError("Category description is required.");
  if (cDesc.length > 255) {
    throw validationError(
      "Category description must be 255 characters or fewer.",
    );
  }

  const slug = slugify(slugInput || cName);
  if (!slug) throw validationError("Valid category slug is required.");

  const validatedParentCategoryID = parseOptionalPositiveInt(
    payload?.parentCategoryID,
    "parentCategoryID",
  );

  return {
    cName,
    cDesc,
    slug,
    iconUrl: validateUrl(iconUrl),
    parentCategoryID: validatedParentCategoryID,
    sortOrder:
      payload?.sortOrder == null || payload?.sortOrder === ""
        ? 0
        : Number(payload.sortOrder),
    isActive:
      payload?.isActive == null
        ? (existing?.isActive ?? true)
        : Boolean(payload.isActive),
  };
}

function validateSkillPayload(payload, existing = null) {
  const skillName =
    typeof payload?.skillName === "string" ? payload.skillName.trim() : "";
  const slugInput =
    typeof payload?.slug === "string" ? payload.slug.trim() : "";

  if (!skillName) throw validationError("Skill name is required.");
  if (skillName.length < 3) {
    throw validationError("Skill name must be at least 3 characters.");
  }
  if (skillName.length > 30) {
    throw validationError("Skill name must be 30 characters or fewer.");
  }

  const slug = slugify(slugInput || skillName, 20);
  if (!slug) throw validationError("Valid skill slug is required.");

  const categoryID = parsePositiveInt(payload?.categoryID, "categoryID");

  return {
    skillName,
    slug,
    categoryID,
    isActive:
      payload?.isActive == null
        ? (existing?.isActive ?? true)
        : Boolean(payload.isActive),
  };
}

async function ensureUniqueCategoryNameAndSlug(categoryId, cName, slug) {
  const existingByName = await catalogRepository.findCategoryByName(cName);
  if (existingByName && existingByName.id !== categoryId) {
    throw conflictError("Category name already exists.");
  }

  const existingBySlug = await catalogRepository.findCategoryBySlug(slug);
  if (existingBySlug && existingBySlug.id !== categoryId) {
    throw conflictError("Category slug already exists.");
  }
}

export async function validateHierarchy(categoryID, parentCategoryID) {
  if (parentCategoryID == null) {
    return;
  }

  if (categoryID != null && categoryID === parentCategoryID) {
    throw conflictError("A category cannot be its own parent.");
  }

  const parentCategory =
    await catalogRepository.getCategoryById(parentCategoryID);
  if (!parentCategory) {
    throw notFoundError("Parent category not found.");
  }

  if (categoryID != null) {
    const ancestors =
      await catalogRepository.findCategoryAncestors(parentCategoryID);
    if (ancestors.includes(categoryID)) {
      throw conflictError("Circular category hierarchy is not allowed.");
    }
  }
}

function buildCategoryTree(categories) {
  const categoryMap = new Map();
  const roots = [];

  for (const category of categories) {
    category.children = [];
    categoryMap.set(category.id, category);
  }

  for (const category of categories) {
    if (
      category.parentCategoryID &&
      categoryMap.has(category.parentCategoryID)
    ) {
      categoryMap.get(category.parentCategoryID).children.push(category);
    } else {
      roots.push(category);
    }
  }

  const sortChildren = (items) => {
    items.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return a.cName.localeCompare(b.cName);
    });
    items.forEach((item) => sortChildren(item.children));
  };

  sortChildren(roots);
  return roots;
}

export function getAllCategories(options) {
  return catalogRepository.getCategories(options);
}

export async function getCategoryTree(options) {
  const useCache = !options?.includeInactive;
  if (useCache) {
    const cached = await getCache(CATEGORY_TREE_CACHE_KEY);
    if (cached) {
      return cached;
    }
  }

  const categories = await catalogRepository.getCategoryTree(options);
  const tree = buildCategoryTree(categories);

  if (useCache) {
    await setCache(CATEGORY_TREE_CACHE_KEY, tree, 300);
  }

  return tree;
}

export async function getSkillsInCategory(categoryID) {
  const parsedCategoryID = parsePositiveInt(categoryID, "category ID");
  const category = await catalogRepository.getCategoryById(parsedCategoryID);
  if (!category) throw notFoundError("Category not found.");
  if (!category.isActive) {
    throw conflictError("Category is not active.");
  }
  return catalogRepository.getSkillsInCategory(parsedCategoryID);
}

export async function updateCategoryOrder(orders) {
  if (!Array.isArray(orders)) {
    throw validationError("Category order payload must be an array.");
  }

  const updatedCount = await catalogRepository.updateCategoryOrder(orders);
  await deleteCache(CATEGORY_TREE_CACHE_KEY);
  await deleteCache(PUBLIC_CATEGORY_CACHE_KEY);
  return updatedCount;
}

export async function createCategory(payload) {
  const validated = validateCategoryPayload(payload);
  await ensureUniqueCategoryNameAndSlug(null, validated.cName, validated.slug);
  await validateHierarchy(null, validated.parentCategoryID);

  try {
    const category = await catalogRepository.createCategory(validated);
    await deleteCache(CATEGORY_TREE_CACHE_KEY);
    await deleteCache(PUBLIC_CATEGORY_CACHE_KEY);
    return category;
  } catch (err) {
    if (err?.code === "ER_DUP_ENTRY") {
      throw conflictError("Category name or slug already exists.");
    }
    throw err;
  }
}

export async function updateCategory(id, payload) {
  const categoryId = parsePositiveInt(id, "category ID");
  const existing = await catalogRepository.getCategoryById(categoryId);
  if (!existing) throw notFoundError("Category not found.");

  const validated = validateCategoryPayload(payload, existing);
  await ensureUniqueCategoryNameAndSlug(
    categoryId,
    validated.cName,
    validated.slug,
  );
  await validateHierarchy(categoryId, validated.parentCategoryID);

  try {
    const category = await catalogRepository.updateCategory(
      categoryId,
      validated,
    );
    await deleteCache(CATEGORY_TREE_CACHE_KEY);
    await deleteCache(PUBLIC_CATEGORY_CACHE_KEY);
    return category;
  } catch (err) {
    if (err?.code === "ER_DUP_ENTRY") {
      throw conflictError("Category name or slug already exists.");
    }
    throw err;
  }
}

export async function deleteCategory(id) {
  const categoryId = parsePositiveInt(id, "category ID");
  const existing = await catalogRepository.getCategoryById(categoryId);
  if (!existing) throw notFoundError("Category not found.");
  if (!existing.isActive) return { id: categoryId, isActive: false };

  if (await catalogRepository.hasCategorySkills(categoryId)) {
    throw conflictError("Cannot delete category with linked skills.");
  }

  if (await catalogRepository.hasChildCategories(categoryId)) {
    throw conflictError("Cannot delete category with child categories.");
  }

  const deleted = await catalogRepository.deactivateCategory(categoryId);
  if (!deleted) throw notFoundError("Category not found.");
  await deleteCache(CATEGORY_TREE_CACHE_KEY);
  await deleteCache(PUBLIC_CATEGORY_CACHE_KEY);
  return { id: categoryId, isActive: false };
}

export function getSkills(options) {
  return catalogRepository.getSkills(options);
}

export function getSkillById(id, options) {
  const skillId = parsePositiveInt(id, "skill ID");
  return catalogRepository.getSkillById(skillId, options);
}

export async function searchSkills(query, options = {}) {
  return catalogRepository.searchSkills(query, options);
}

export async function createSkill(payload) {
  const validated = validateSkillPayload(payload);
  const category = await catalogRepository.getCategoryById(
    validated.categoryID,
  );
  if (!category || !category.isActive) {
    throw conflictError("Skill must belong to an active category.");
  }

  const existingSkill = await catalogRepository.findSkillByName(
    validated.skillName,
  );
  if (existingSkill) {
    throw conflictError("Skill name already exists.");
  }

  return catalogRepository.createSkill(validated);
}

export async function updateSkill(id, payload) {
  const skillId = parsePositiveInt(id, "skill ID");
  const existing = await catalogRepository.getSkillById(skillId);
  if (!existing) throw notFoundError("Skill not found.");
  const validated = validateSkillPayload(payload, existing);
  const category = await catalogRepository.getCategoryById(
    validated.categoryID,
  );
  if (!category || !category.isActive) {
    throw conflictError("Skill must belong to an active category.");
  }

  const duplicateSkill = await catalogRepository.findSkillByName(
    validated.skillName,
  );
  if (duplicateSkill && duplicateSkill.id !== skillId) {
    throw conflictError("Skill name already exists.");
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

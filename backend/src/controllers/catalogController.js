import * as catalogService from "../services/catalogService.js";
import { validatedBody, validatedParams } from "../middleware/validateRequest.js";

function includeInactive(req) {
  return req.query.includeInactive === "true";
}

export async function getCategories(req, res, next) {
  try {
    const categories = await catalogService.getCategories({
      includeInactive: includeInactive(req),
    });
    return res.status(200).json({ categories });
  } catch (err) {
    next(err);
  }
}

export async function createCategory(req, res, next) {
  try {
    const category = await catalogService.createCategory(validatedBody(req));
    return res.status(201).json({ message: "Category created.", category });
  } catch (err) {
    next(err);
  }
}

export async function updateCategory(req, res, next) {
  try {
    const { id } = validatedParams(req);
    const category = await catalogService.updateCategory(id, validatedBody(req));
    return res.status(200).json({ message: "Category updated.", category });
  } catch (err) {
    next(err);
  }
}

export async function deleteCategory(req, res, next) {
  try {
    const { id } = validatedParams(req);
    const category = await catalogService.deleteCategory(id);
    return res.status(200).json({ message: "Category deactivated.", category });
  } catch (err) {
    next(err);
  }
}

export async function getSkills(req, res, next) {
  try {
    const skills = await catalogService.getSkills({
      includeInactive: includeInactive(req),
    });
    return res.status(200).json({ skills });
  } catch (err) {
    next(err);
  }
}

export async function createSkill(req, res, next) {
  try {
    const skill = await catalogService.createSkill(validatedBody(req));
    return res.status(201).json({ message: "Skill created.", skill });
  } catch (err) {
    next(err);
  }
}

export async function updateSkill(req, res, next) {
  try {
    const { id } = validatedParams(req);
    const skill = await catalogService.updateSkill(id, validatedBody(req));
    return res.status(200).json({ message: "Skill updated.", skill });
  } catch (err) {
    next(err);
  }
}

export async function deleteSkill(req, res, next) {
  try {
    const { id } = validatedParams(req);
    const skill = await catalogService.deleteSkill(id);
    return res.status(200).json({ message: "Skill deactivated.", skill });
  } catch (err) {
    next(err);
  }
}

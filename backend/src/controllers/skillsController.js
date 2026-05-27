import * as skillsService from "../services/skillsService.js";
import {
  validatedBody,
  validatedParams,
  validatedQuery,
} from "../middleware/validateRequest.js";

export async function getSkills(req, res, next) {
  try {
    const query = validatedQuery(req);
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 50;
    const q = query?.q?.trim();

    if (q) {
      const skills = await skillsService.searchSkills(q);
      return res.status(200).json({ skills, total: skills.length });
    }

    const result = await skillsService.getAllSkills(page, limit);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getSkillById(req, res, next) {
  try {
    const { id } = validatedParams(req);
    const skill = await skillsService.getSkillById(id, {
      includeInactive: true,
    });
    return res.status(200).json({ skill });
  } catch (err) {
    next(err);
  }
}

export async function createSkill(req, res, next) {
  try {
    const skill = await skillsService.createSkill(validatedBody(req));
    return res.status(201).json({ message: "Skill created.", skill });
  } catch (err) {
    next(err);
  }
}

export async function updateSkill(req, res, next) {
  try {
    const { id } = validatedParams(req);
    const skill = await skillsService.updateSkill(id, validatedBody(req));
    return res.status(200).json({ message: "Skill updated.", skill });
  } catch (err) {
    next(err);
  }
}

export async function deleteSkill(req, res, next) {
  try {
    const { id } = validatedParams(req);
    const result = await skillsService.deleteSkill(id);
    return res.status(200).json({ message: "Skill deactivated.", result });
  } catch (err) {
    next(err);
  }
}

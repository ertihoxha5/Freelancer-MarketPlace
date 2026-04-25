import * as freelancerService from "../services/freelancerService.js";

function handleError(err, res, next) {
  if (err.statusCode) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  return next(err);
}

export async function getPublicProfile(req, res, next) {
  try {
    const data = await freelancerService.getPublicProfile(req.params.id);
    return res.status(200).json(data);
  } catch (err) {
    return handleError(err, res, next);
  }
}

export async function getDashboard(req, res, next) {
  try {
    const data = await freelancerService.getDashboard(req.user.id);
    return res.status(200).json(data);
  } catch (err) {
    return handleError(err, res, next);
  }
}

export async function getProfile(req, res, next) {
  try {
    const data = await freelancerService.getProfile(req.user.id);
    return res.status(200).json(data);
  } catch (err) {
    return handleError(err, res, next);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const data = await freelancerService.updateProfile(req.user.id, req.body);
    return res.status(200).json({
      message: "Profile updated successfully.",
      ...data,
    });
  } catch (err) {
    return handleError(err, res, next);
  }
}

export async function getAvailableSkills(req, res, next) {
  try {
    const skills = await freelancerService.getAvailableSkills();
    return res.status(200).json({ skills });
  } catch (err) {
    return handleError(err, res, next);
  }
}

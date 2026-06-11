import * as settingsService from "../services/settingsService.js";

export async function getSettings(req, res, next) {
  try {
    const settings = await settingsService.getSettings();
    return res.status(200).json({ settings });
  } catch (err) {
    next(err);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const settings = await settingsService.updateSettings(req.body);
    return res.status(200).json({ message: "Settings updated.", settings });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    next(err);
  }
}

import * as settingsRepository from "../repositories/settingsRepository.js";
import { validate } from "../validation/validate.js";
import { settingsSchemas } from "../validation/schemas.js";
import { validationError } from "../utils/errors.js";

export async function getSettings() {
  return settingsRepository.listSettings();
}

export async function updateSettings(payload) {
  const { items } = validate(settingsSchemas.update, payload ?? {});
  const updated = [];

  for (const item of items) {
    if (!item.sKey) {
      throw validationError("sKey is required.");
    }
    const record = await settingsRepository.upsertSetting(item);
    updated.push(record);
  }

  return updated;
}

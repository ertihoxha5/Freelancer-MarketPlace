import { db } from "../config/db.js";

let settingsSchemaWarmup = null;

async function ensureSettingsSchema() {
  if (!settingsSchemaWarmup) {
    settingsSchemaWarmup = (async () => {
      try {
        await db.execute(`ALTER TABLE Settings MODIFY COLUMN sValue TEXT NOT NULL`);
      } catch {}
      try {
        await db.execute(`ALTER TABLE Settings MODIFY COLUMN sDesc VARCHAR(255) NULL`);
      } catch {}
    })();
  }
  return settingsSchemaWarmup;
}

export async function listSettings() {
  await ensureSettingsSchema();
  const [rows] = await db.execute(
    `SELECT id, sKey, sValue, sDesc, updatedAt
     FROM Settings
     ORDER BY FIELD(sKey, 'platformName', 'landingHeadline', 'landingSubheadline', 'supportEmail', 'commissionRate', 'allowNewRegistrations', 'maxFeaturedFreelancers', 'defaultProjectFreelancers'), sKey ASC`,
  );
  return rows;
}

export async function getSettingByKey(sKey) {
  await ensureSettingsSchema();
  const [rows] = await db.execute(
    `SELECT id, sKey, sValue, sDesc, updatedAt
     FROM Settings
     WHERE sKey = ?
     LIMIT 1`,
    [sKey],
  );
  return rows[0] ?? null;
}

export async function upsertSetting({ sKey, sValue, sDesc }) {
  await ensureSettingsSchema();
  await db.execute(
    `INSERT INTO Settings (sKey, sValue, sDesc)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       sValue = VALUES(sValue),
       sDesc = VALUES(sDesc),
       updatedAt = CURRENT_TIMESTAMP`,
    [sKey, sValue, sDesc ?? null],
  );
  return getSettingByKey(sKey);
}

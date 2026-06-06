import { db } from "../../../config/db.js";

export class AddSectionHandler {
  async handle(command) {
    const { contractID, freelancerID, title, type, content, items, visible } = command;

    if (!title?.trim()) {
      throw new Error("Section title is required.");
    }

    const sectionType = type || "note";
    const sectionKey = `sec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const itemsJson = Array.isArray(items) ? JSON.stringify(items) : null;

    await db.execute(
      `INSERT INTO WorkspaceSections (contractID, freelancerID, sectionKey, title, type, content, items, visible)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        contractID,
        freelancerID,
        sectionKey,
        title.trim(),
        sectionType,
        content || null,
        itemsJson,
        visible !== false,
      ]
    );

    // For simplicity, the caller will re-fetch via query bus if needed.
    // Returning success indicator.
    return { success: true };
  }
}
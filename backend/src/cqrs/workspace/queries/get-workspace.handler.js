import { db } from "../../../config/db.js";

export class GetWorkspaceHandler {
  async handle(query) {
    const { contractID, isFreelancer, freelancerID } = query;

    // Todos (always shared view)
    const [todos] = await db.execute(
      `SELECT id, freelancerID, title, description, status, dueDate, createdAt, updatedAt
       FROM WorkspaceTodos
       WHERE contractID = ?
       ORDER BY updatedAt DESC, createdAt DESC`,
      [contractID]
    );

    // Sections
    let sectionsQuery = `
      SELECT id, sectionKey, title, type, content, items, visible, sortOrder, updatedAt
      FROM WorkspaceSections
      WHERE contractID = ? AND freelancerID = ?
    `;
    const params = [contractID, freelancerID];

    if (!isFreelancer) {
      sectionsQuery += ` AND visible = TRUE `;
    }
    sectionsQuery += ` ORDER BY sortOrder ASC, createdAt ASC `;

    const [sections] = await db.execute(sectionsQuery, params);

    // Parse items JSON
    const parsedSections = sections.map((s) => ({
      ...s,
      items: s.items ? (typeof s.items === "string" ? JSON.parse(s.items) : s.items) : [],
    }));

    return {
      todos,
      sections: parsedSections,
    };
  }
}
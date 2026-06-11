import { db } from "../../../config/db.js";

export class GetWorkspaceHandler {
  async handle(query) {
    const { contractID, isFreelancer, freelancerID, projectID } = query;
    const scopeID = projectID || contractID;
    const useProjectScope = !!projectID;

    let todosWhere = useProjectScope
      ? `projectID = ?`
      : `contractID = ?`;
    const [todos] = await db.execute(
      `SELECT id, freelancerID, title, description, status, dueDate, createdAt, updatedAt
       FROM WorkspaceTodos
       WHERE ${todosWhere}
       ORDER BY updatedAt DESC, createdAt DESC`,
      [scopeID]
    );

    let sectionsQuery = `
      SELECT id, sectionKey, title, type, content, items, visible, sortOrder, updatedAt, freelancerID
      FROM WorkspaceSections
      WHERE ${useProjectScope ? 'projectID = ?' : 'contractID = ? AND freelancerID = ?'}
    `;
    const params = useProjectScope ? [scopeID] : [scopeID, freelancerID];

    if (!isFreelancer) {
      sectionsQuery += ` AND visible = TRUE `;
    }
    sectionsQuery += ` ORDER BY sortOrder ASC, createdAt ASC `;

    const [sections] = await db.execute(sectionsQuery, params);

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
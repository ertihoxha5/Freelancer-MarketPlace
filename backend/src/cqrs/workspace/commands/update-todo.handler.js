import { db } from "../../../config/db.js";
import { notFoundError } from "../../../utils/errors.js";

export class UpdateTodoHandler {
  async handle(command) {
    const { todoId, contractID, title, description, dueDate, status, projectID } = command;

    const sets = [];
    const values = [];

    if (title !== undefined) {
      sets.push("title = ?");
      values.push(title.trim());
    }
    if (description !== undefined) {
      sets.push("description = ?");
      values.push(description);
    }
    if (dueDate !== undefined) {
      sets.push("dueDate = ?");
      values.push(dueDate || null);
    }
    if (status !== undefined) {
      sets.push("status = ?");
      values.push(status);
    }

    if (sets.length === 0) {
      throw new Error("No fields to update.");
    }

    sets.push("updatedAt = NOW()");
    values.push(todoId);

    if (projectID) {
      values.push(projectID);
      const [result] = await db.execute(
        `UPDATE WorkspaceTodos SET ${sets.join(", ")} WHERE id = ? AND projectID = ?`,
        values
      );
      if (result.affectedRows === 0) {
        throw notFoundError("Todo not found.");
      }
    } else {
      values.push(contractID);
      const [result] = await db.execute(
        `UPDATE WorkspaceTodos SET ${sets.join(", ")} WHERE id = ? AND contractID = ?`,
        values
      );
      if (result.affectedRows === 0) {
        throw notFoundError("Todo not found.");
      }
    }

    const [rows] = await db.execute(`SELECT * FROM WorkspaceTodos WHERE id = ?`, [todoId]);
    return rows[0];
  }
}
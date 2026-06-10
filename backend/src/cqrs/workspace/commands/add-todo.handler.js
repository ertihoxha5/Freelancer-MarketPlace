import { db } from "../../../config/db.js";
import { notFoundError } from "../../../utils/errors.js";

export class AddTodoHandler {
  async handle(command) {
    const { contractID, freelancerID, title, description, dueDate, status, projectID } = command;

    if (!title?.trim()) {
      throw new Error("Title is required.");
    }

    const [result] = await db.execute(
      `INSERT INTO WorkspaceTodos (contractID, projectID, freelancerID, title, description, status, dueDate)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        contractID,
        projectID || null,
        freelancerID,
        title.trim(),
        description || null,
        status || "todo",
        dueDate || null,
      ]
    );

    const [rows] = await db.execute(
      `SELECT * FROM WorkspaceTodos WHERE id = ?`,
      [result.insertId]
    );

    return rows[0];
  }
}
import { db } from "../../../config/db.js";

export class DeleteTodoHandler {
  async handle(command) {
    const { todoId, contractID, projectID } = command;

    if (projectID) {
      await db.execute(
        `DELETE FROM WorkspaceTodos WHERE id = ? AND projectID = ?`,
        [todoId, projectID]
      );
    } else {
      await db.execute(
        `DELETE FROM WorkspaceTodos WHERE id = ? AND contractID = ?`,
        [todoId, contractID]
      );
    }

    return { message: "Todo deleted." };
  }
}
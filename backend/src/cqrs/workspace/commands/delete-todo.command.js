export class DeleteTodoCommand {
  constructor(todoId, contractID, projectID = null) {
    this.todoId = todoId;
    this.contractID = contractID;
    this.projectID = projectID;
  }
}
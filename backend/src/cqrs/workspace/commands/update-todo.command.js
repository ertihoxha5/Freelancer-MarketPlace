export class UpdateTodoCommand {
  constructor(todoId, contractID, title, description, dueDate, status, projectID = null) {
    this.todoId = todoId;
    this.contractID = contractID;
    this.title = title;
    this.description = description;
    this.dueDate = dueDate;
    this.status = status;
    this.projectID = projectID;
  }
}
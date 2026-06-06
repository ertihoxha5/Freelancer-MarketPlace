export class DeleteTodoCommand {
  constructor(todoId, contractID) {
    this.todoId = todoId;
    this.contractID = contractID;
  }
}
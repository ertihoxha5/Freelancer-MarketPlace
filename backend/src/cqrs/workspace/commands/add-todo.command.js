export class AddTodoCommand {
  constructor(contractID, freelancerID, title, description, dueDate, status) {
    this.contractID = contractID;
    this.freelancerID = freelancerID;
    this.title = title;
    this.description = description;
    this.dueDate = dueDate;
    this.status = status;
  }
}
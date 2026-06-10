export class AddTodoCommand {
  constructor(contractID, freelancerID, title, description, dueDate, status, projectID = null) {
    this.contractID = contractID;
    this.freelancerID = freelancerID;
    this.title = title;
    this.description = description;
    this.dueDate = dueDate;
    this.status = status;
    this.projectID = projectID; // shared for multi-freelancer projects
  }
}
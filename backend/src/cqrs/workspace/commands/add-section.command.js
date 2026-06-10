export class AddSectionCommand {
  constructor(contractID, freelancerID, title, type, content, items, visible, projectID = null) {
    this.contractID = contractID;
    this.freelancerID = freelancerID;
    this.title = title;
    this.type = type;
    this.content = content;
    this.items = items;
    this.visible = visible;
    this.projectID = projectID;
  }
}
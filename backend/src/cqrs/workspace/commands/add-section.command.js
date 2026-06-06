export class AddSectionCommand {
  constructor(contractID, freelancerID, title, type, content, items, visible) {
    this.contractID = contractID;
    this.freelancerID = freelancerID;
    this.title = title;
    this.type = type;
    this.content = content;
    this.items = items;
    this.visible = visible;
  }
}
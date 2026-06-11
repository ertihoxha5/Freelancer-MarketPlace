export class GetWorkspaceQuery {
  constructor(contractID, isFreelancer, freelancerID, projectID = null) {
    this.contractID = contractID;
    this.isFreelancer = isFreelancer;
    this.freelancerID = freelancerID;
    this.projectID = projectID;
  }
}
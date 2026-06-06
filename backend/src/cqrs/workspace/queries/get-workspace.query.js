export class GetWorkspaceQuery {
  constructor(contractID, isFreelancer, freelancerID) {
    this.contractID = contractID;
    this.isFreelancer = isFreelancer;
    this.freelancerID = freelancerID;
  }
}
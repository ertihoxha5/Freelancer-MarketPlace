function userRoom(userID) {
  return `user:${userID}`;
}

function emitToUser(io, userID, eventName, payload) {
  if (!io || !userID) return;
  io.to(userRoom(userID)).emit(eventName, payload);
}

export function emitProposalNew(io, { clientID, ...payload }) {
  emitToUser(io, clientID, "proposal:new", { clientID, ...payload });
}

export function emitProposalAccepted(io, { freelancerID, ...payload }) {
  emitToUser(io, freelancerID, "proposal:accepted", {
    freelancerID,
    ...payload,
  });
}

export function emitProposalRejected(io, { freelancerID, ...payload }) {
  emitToUser(io, freelancerID, "proposal:rejected", {
    freelancerID,
    ...payload,
  });
}

export function emitContractCreated(io, payload) {
  emitToUser(io, payload.clientID, "contract:created", payload);
  emitToUser(io, payload.freelancerID, "contract:created", payload);
}

export function emitMilestoneSubmitted(io, { clientID, ...payload }) {
  emitToUser(io, clientID, "milestone:submitted", { clientID, ...payload });
}

export function emitMilestoneApproved(io, { freelancerID, ...payload }) {
  emitToUser(io, freelancerID, "milestone:approved", {
    freelancerID,
    ...payload,
  });
}

export function emitMilestoneRejected(io, { freelancerID, ...payload }) {
  emitToUser(io, freelancerID, "milestone:rejected", {
    freelancerID,
    ...payload,
  });
}

export function emitReviewReceived(io, { receiverID, ...payload }) {
  emitToUser(io, receiverID, "review:received", { receiverID, ...payload });
}

export function emitProjectStatusChanged(io, payload) {
  emitToUser(io, payload.clientID, "project:status_changed", payload);
  emitToUser(io, payload.freelancerID, "project:status_changed", payload);
}

export function registerBusinessHandlers({ socket }) {
  socket.on("business:ping", (ack) => {
    ack?.({ ok: true, userID: socket.user.id });
  });
}

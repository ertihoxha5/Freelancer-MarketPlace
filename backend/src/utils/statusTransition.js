const PROJECT_STATUS_TRANSITIONS = {
  pending: new Set(["active"]),
  active: new Set(["completed", "cancelled"]),
  completed: new Set([]),
  cancelled: new Set([]),
};

export const PROJECT_STATUSES = Object.freeze(
  Object.keys(PROJECT_STATUS_TRANSITIONS),
);

export function validateStatusTransition(currentStatus, newStatus) {
  if (!PROJECT_STATUSES.includes(currentStatus)) {
    const err = new Error(`Unknown current project status: ${currentStatus}.`);
    err.statusCode = 400;
    throw err;
  }

  if (!PROJECT_STATUSES.includes(newStatus)) {
    const err = new Error(
      `pStatus must be one of: ${PROJECT_STATUSES.join(", ")}.`,
    );
    err.statusCode = 400;
    throw err;
  }

  if (currentStatus === newStatus) {
    return true;
  }

  if (currentStatus === "completed" || currentStatus === "cancelled") {
    const err = new Error(
      `Project is ${currentStatus} and cannot change status again.`,
    );
    err.statusCode = 409;
    throw err;
  }

  if (!PROJECT_STATUS_TRANSITIONS[currentStatus].has(newStatus)) {
    const err = new Error(
      `Invalid project status transition from ${currentStatus} to ${newStatus}.`,
    );
    err.statusCode = 409;
    throw err;
  }

  return true;
}

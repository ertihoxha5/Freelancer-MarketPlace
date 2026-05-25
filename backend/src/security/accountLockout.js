const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

/** @type {Map<string, { failedAttempts: number; lockedUntil: number | null }>} */
const attemptsByEmail = new Map();

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

export function isAccountLocked(email) {
  const key = normalizeEmail(email);
  const record = attemptsByEmail.get(key);
  if (!record?.lockedUntil) {
    return false;
  }
  if (Date.now() >= record.lockedUntil) {
    attemptsByEmail.delete(key);
    return false;
  }
  return true;
}

export function getLockoutMessage(email) {
  const key = normalizeEmail(email);
  const record = attemptsByEmail.get(key);
  if (!record?.lockedUntil || Date.now() >= record.lockedUntil) {
    return "Invalid email or password.";
  }
  const minutesLeft = Math.ceil((record.lockedUntil - Date.now()) / 60_000);
  return `Account temporarily locked. Try again in ${minutesLeft} minute(s).`;
}

export function recordFailedLogin(email) {
  const key = normalizeEmail(email);
  const record = attemptsByEmail.get(key) ?? {
    failedAttempts: 0,
    lockedUntil: null,
  };

  if (record.lockedUntil && Date.now() < record.lockedUntil) {
    return;
  }

  record.failedAttempts += 1;
  if (record.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = Date.now() + LOCK_DURATION_MS;
    record.failedAttempts = 0;
  }

  attemptsByEmail.set(key, record);
}

export function clearFailedLogins(email) {
  attemptsByEmail.delete(normalizeEmail(email));
}

/** Test helper — not used in production routes. */
export function _resetLockoutStore() {
  attemptsByEmail.clear();
}

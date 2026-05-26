import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import * as userRepository from "../repositories/userRepository.js";
import * as refreshTokenRepository from "../repositories/refreshTokenRepository.js";
import * as emailTokenRepository from "../repositories/emailTokenRepository.js";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "./emailService.js";
import { signAccessToken } from "../utils/jwt.js";
import { pushToAllAdmins } from "./notificationService.js";
import { validate } from "../validation/validate.js";
import { authSchemas, userSchemas } from "../validation/schemas.js";
import {
  conflictError,
  notFoundError,
  unauthorizedError,
  validationError,
} from "../utils/errors.js";
import {
  clearFailedLogins,
  getLockoutMessage,
  isAccountLocked,
  recordFailedLogin,
} from "../security/accountLockout.js";

const BCRYPT_ROUNDS = 10;
const REFRESH_TOKEN_DAYS = Number(process.env.REFRESH_TOKEN_DAYS) || 7;
const EMAIL_TOKEN_HOURS = 24;

async function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

function unauthorized(message = "Invalid email or password.") {
  return unauthorizedError(message);
}

async function issueNewRefreshToken(userID) {
  const raw = randomBytes(48).toString("hex");
  const tokenHash = refreshTokenRepository.hashRefreshToken(raw);
  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  );
  await refreshTokenRepository.insertRefreshToken({
    userID,
    tokenHash,
    expiresAt,
  });
  return raw;
}

async function issueEmailToken(userID, type) {
  const raw = randomBytes(32).toString("hex");
  const tokenHash = emailTokenRepository.hashEmailToken(raw);
  const expiresAt = new Date(
    Date.now() + EMAIL_TOKEN_HOURS * 60 * 60 * 1000,
  );

  await emailTokenRepository.invalidateActiveTokensForUser(userID, type);
  await emailTokenRepository.insertEmailToken({
    userID,
    tokenHash,
    type,
    expiresAt,
  });

  return raw;
}

/**
 * @param {{ fullName: string; email: string; password: string; roleID: number }} input
 */
export async function registerUser(input) {
  const { fullName, email, password, roleID } = validate(
    userSchemas.register,
    input ?? {},
  );
  const role = Number(roleID);
  const emailNorm = email;
  const nameNorm = fullName;

  const existing = await userRepository.findUserByEmail(emailNorm);
  if (existing) {
    throw conflictError("An account with this email already exists.");
  }

  const passwordHash = await hashPassword(password);

  const result = await userRepository.createUserWithRole({
    email: emailNorm,
    passwordHash,
    fullName: nameNorm,
    roleID: role,
  });

  const roleName = role === 2 ? "Client" : "Freelancer";

  pushToAllAdmins({
    types: "system",
    title: "New User Joined",
    msg: `${nameNorm} joined as a ${roleName} (${emailNorm}).`,
  }).catch(() => {});

  try {
    const token = await issueEmailToken(result.userID, "email_verification");
    await sendVerificationEmail(emailNorm, nameNorm, token);
  } catch (err) {
    console.error("[registerUser] Failed to send verification email:", err.message);
  }

  return { ...result, emailVerificationSent: true };
}

/**
 * @param {{ token: string }} input
 */
export async function verifyEmail(input) {
  const { token } = validate(authSchemas.verifyEmail, input ?? {});
  const tokenHash = emailTokenRepository.hashEmailToken(token);
  const row = await emailTokenRepository.findValidEmailTokenByHash(
    tokenHash,
    "email_verification",
  );

  if (!row) {
    throw validationError("Invalid or expired verification link.");
  }

  await userRepository.setEmailVerified(row.userID);
  await emailTokenRepository.markEmailTokenUsed(row.id);

  return { ok: true, message: "Email verified successfully. You can now sign in." };
}

/**
 * @param {{ email: string }} input
 */
export async function requestPasswordReset(input) {
  const { email } = validate(authSchemas.forgotPassword, input ?? {});
  const emailNorm = email;

  const user = await userRepository.findUserByEmail(emailNorm);
  if (user) {
    try {
      const token = await issueEmailToken(user.id, "password_reset");
      await sendPasswordResetEmail(user.email, token);
    } catch (err) {
      console.error(
        "[requestPasswordReset] Failed to send reset email:",
        err.message,
      );
    }
  }

  return {
    ok: true,
    message:
      "If an account exists for that email, a password reset link has been sent.",
  };
}

/**
 * @param {{ token: string; newPassword: string }} input
 */
export async function resetPassword(input) {
  const { token, newPassword } = validate(authSchemas.resetPassword, input ?? {});
  const tokenHash = emailTokenRepository.hashEmailToken(token);
  const row = await emailTokenRepository.findValidEmailTokenByHash(
    tokenHash,
    "password_reset",
  );

  if (!row) {
    throw validationError("Invalid or expired password reset link.");
  }

  const passwordHash = await hashPassword(newPassword);
  const updated = await userRepository.changePassword({
    id: row.userID,
    passwordHash,
  });

  if (!updated?.email) {
    throw notFoundError("User not found.");
  }

  await emailTokenRepository.markEmailTokenUsed(row.id);
  await refreshTokenRepository.revokeAllRefreshTokensForUser(row.userID);

  return { ok: true, message: "Password has been reset. You can now sign in." };
}

/**
 * @param {{ currentPassword: string; newPassword: string }} input
 * @param {{ id: number }} authUser
 */

export async function changePassword(input, authUser) {
  const { currentPassword, newPassword } = validate(
    authSchemas.changePassword,
    input ?? {},
  );
  const userID = Number(authUser?.id);

  if (!Number.isInteger(userID)) {
    throw validationError("Valid user id is required.");
  }

  const user = await userRepository.findUserWithPasswordById(userID);
  if (!user) {
    throw unauthorized("Invalid session.");
  }

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) {
    throw unauthorized("Current password is incorrect.");
  }

  const passwordHash = await hashPassword(newPassword);

  const result = await userRepository.changePassword({
    id: userID,
    passwordHash,
  });

  await refreshTokenRepository.revokeAllRefreshTokensForUser(userID);

  return result;
}

/**
 * @param {{ email: string; password: string }} input
 */
export async function loginUser(input) {
  const { email, password } = validate(authSchemas.login, input ?? {});
  const emailNorm = email;

  if (isAccountLocked(emailNorm)) {
    throw unauthorized(getLockoutMessage(emailNorm));
  }

  const user = await userRepository.findUserWithPasswordByEmail(emailNorm);
  if (!user) {
    recordFailedLogin(emailNorm);
    throw unauthorized();
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    recordFailedLogin(emailNorm);
    throw unauthorized(isAccountLocked(emailNorm) ? getLockoutMessage(emailNorm) : undefined);
  }

  if (!user.emailVerified) {
    throw unauthorized(
      "Please verify your email before signing in. Check your inbox for the verification link.",
    );
  }

  clearFailedLogins(emailNorm);

  const token = signAccessToken({
    sub: user.id,
    email: user.email,
    roleID: user.roleID,
    tokenVersion: user.tokenVersion,
  });

  const refreshToken = await issueNewRefreshToken(user.id);

  return {
    token,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roleID: user.roleID,
    },
  };
}

/**
 * @param {{ refreshToken: string }} input
 */
export async function refreshAccessSession(input) {
  const { refreshToken } = validate(authSchemas.refresh, input ?? {});
  if (typeof refreshToken !== "string" || refreshToken.length === 0) {
    throw validationError("refreshToken is required.");
  }

  const tokenHash = refreshTokenRepository.hashRefreshToken(refreshToken);
  const row =
    await refreshTokenRepository.findValidRefreshTokenByHash(tokenHash);
  if (!row) {
    throw unauthorized("Invalid or expired refresh token.");
  }

  const user = await userRepository.findUserWithRoleById(row.userID);
  if (!user) {
    await refreshTokenRepository.revokeRefreshTokenById(row.id);
    throw unauthorized("Invalid or expired refresh token.");
  }

  await refreshTokenRepository.revokeRefreshTokenById(row.id);
  const newRefreshToken = await issueNewRefreshToken(user.id);

  const token = signAccessToken({
    sub: user.id,
    email: user.email,
    roleID: user.roleID,
    tokenVersion: user.tokenVersion,
  });

  return {
    token,
    refreshToken: newRefreshToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roleID: user.roleID,
    },
  };
}

/**
 * @param {{ refreshToken: string }} input
 */
export async function logoutSession(input) {
  const { refreshToken } = validate(authSchemas.logout, input ?? {});
  if (typeof refreshToken !== "string" || refreshToken.length === 0) {
    return { ok: true };
  }

  const tokenHash = refreshTokenRepository.hashRefreshToken(refreshToken);
  const row =
    await refreshTokenRepository.findValidRefreshTokenByHash(tokenHash);
  if (row) {
    await refreshTokenRepository.revokeRefreshTokenById(row.id);
  }

  return { ok: true };
}

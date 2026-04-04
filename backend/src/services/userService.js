import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import * as userRepository from '../repositories/userRepository.js';
import * as refreshTokenRepository from '../repositories/refreshTokenRepository.js';
import { signAccessToken } from '../utils/jwt.js';

const ALLOWED_ROLE_IDS = new Set([2, 3]);
const BCRYPT_ROUNDS = 10;
const REFRESH_TOKEN_DAYS = Number(process.env.REFRESH_TOKEN_DAYS) || 7;

async function hashPassword(plain) {
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

function validationError(message) {
    const err = new Error(message);
    err.statusCode = 400;
    return err;
}

function conflictError(message) {
    const err = new Error(message);
    err.statusCode = 409;
    return err;
}

function unauthorized(message = 'Invalid email or password.') {
    const err = new Error(message);
    err.statusCode = 401;
    return err;
}

async function issueNewRefreshToken(userID) {
    const raw = randomBytes(48).toString('hex');
    const tokenHash = refreshTokenRepository.hashRefreshToken(raw);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
    await refreshTokenRepository.insertRefreshToken({ userID, tokenHash, expiresAt });
    return raw;
}

/**
 * @param {{ fullName: string; email: string; password: string; roleID: number }} input
 */
export async function registerUser(input) {
    const { fullName, email, password, roleID } = input ?? {};

    if (
        typeof fullName !== 'string' ||
        typeof email !== 'string' ||
        typeof password !== 'string' ||
        fullName.trim() === '' ||
        email.trim() === '' ||
        password.length === 0
    ) {
        throw validationError('fullName, email, and password are required.');
    }

    const role = Number(roleID);
    if (!Number.isInteger(role) || !ALLOWED_ROLE_IDS.has(role)) {
        throw validationError('roleID must be 2 (Client) or 3 (Freelancer).');
    }

    const emailNorm = email.trim().toLowerCase();
    const nameNorm = fullName.trim();

    const existing = await userRepository.findUserByEmail(emailNorm);
    if (existing) {
        throw conflictError('An account with this email already exists.');
    }

    const passwordHash = await hashPassword(password);

    return userRepository.createUserWithRole({
        email: emailNorm,
        passwordHash,
        fullName: nameNorm,
        roleID: role,
    });
}

/**
 * @param {{ email: string; password: string}} input
 */

export async function changePassword(input){
    const {email, password} = input ?? {}

    if( typeof email !== 'string' || 
        typeof password !== 'string' ||
        email.trim() === '' ||
        password.length === 0
    ){
        throw validationError('Email and password is required.')
    }
    const emailNorm = email.trim().toLowerCase();
    const existing = await userRepository.findUserByEmail(emailNorm);
    if (!existing) {
        throw conflictError('An account with this email does not exist.');
    }
    const passwordHash = await hashPassword(password);

    return userRepository.changePassword({
        email: emailNorm,
        passwordHash: passwordHash
    })
}

/**
 * @param {{ email: string; password: string }} input
 */
export async function loginUser(input) {
    const { email, password } = input ?? {};

    if (
        typeof email !== 'string' ||
        typeof password !== 'string' ||
        email.trim() === '' ||
        password.length === 0
    ) {
        throw validationError('Email and password are required.');
    }

    const emailNorm = email.trim().toLowerCase();
    const user = await userRepository.findUserWithPasswordByEmail(emailNorm);
    if (!user) {
        throw unauthorized();
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
        throw unauthorized();
    }

    const token = signAccessToken({
        sub: user.id,
        email: user.email,
        roleID: user.roleID,
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
    const { refreshToken } = input ?? {};
    if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
        throw validationError('refreshToken is required.');
    }

    const tokenHash = refreshTokenRepository.hashRefreshToken(refreshToken);
    const row = await refreshTokenRepository.findValidRefreshTokenByHash(tokenHash);
    if (!row) {
        throw unauthorized('Invalid or expired refresh token.');
    }

    const user = await userRepository.findUserWithRoleById(row.userID);
    if (!user) {
        await refreshTokenRepository.revokeRefreshTokenById(row.id);
        throw unauthorized('Invalid or expired refresh token.');
    }

    await refreshTokenRepository.revokeRefreshTokenById(row.id);
    const newRefreshToken = await issueNewRefreshToken(user.id);

    const token = signAccessToken({
        sub: user.id,
        email: user.email,
        roleID: user.roleID,
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
    const { refreshToken } = input ?? {};
    if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
        throw validationError('refreshToken is required.');
    }

    const tokenHash = refreshTokenRepository.hashRefreshToken(refreshToken);
    const row = await refreshTokenRepository.findValidRefreshTokenByHash(tokenHash);
    if (row) {
        await refreshTokenRepository.revokeRefreshTokenById(row.id);
    }

    return { ok: true };
}
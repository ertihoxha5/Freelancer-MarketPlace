import * as userService from '../services/userService.js';
import * as userRepository from '../repositories/userRepository.js';
import { validatedBody } from '../middleware/validateRequest.js';

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_TOKEN_DAYS = Number(process.env.REFRESH_TOKEN_DAYS) || 7;

function refreshCookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
        path: '/api/auth',
    };
}

function setRefreshCookie(res, refreshToken) {
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
}

function clearRefreshCookie(res) {
    res.clearCookie(REFRESH_COOKIE_NAME, {
        ...refreshCookieOptions(),
        maxAge: undefined,
    });
}

function requestRefreshToken(req) {
    return req.cookies?.[REFRESH_COOKIE_NAME] || validatedBody(req).refreshToken;
}

/**
 * POST /api/auth/login
 */
export async function login(req, res, next) {
    try {
        const result = await userService.loginUser(validatedBody(req));
        setRefreshCookie(res, result.refreshToken);
        return res.status(200).json({
            token: result.token,
            refreshToken: result.refreshToken,
            user: result.user,
        });
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ message: err.message });
        }
        next(err);
    }
}


export async function me(req, res, next) {
    try {
        const user = await userRepository.findUserWithRoleById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        return res.json({ user });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/auth/refresh
 */
export async function refresh(req, res, next) {
    try {
        const refreshToken = requestRefreshToken(req);
        const result = await userService.refreshAccessSession({ refreshToken });
        setRefreshCookie(res, result.refreshToken);
        return res.status(200).json({
            token: result.token,
            refreshToken: result.refreshToken,
            user: result.user,
        });
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ message: err.message });
        }
        next(err);
    }
}

/**
 * POST /api/auth/logout
 */
export async function logout(req, res, next) {
    try {
        const result = await userService.logoutSession({
            refreshToken: requestRefreshToken(req),
        });
        clearRefreshCookie(res);
        return res.status(200).json(result);
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ message: err.message });
        }
        next(err);
    }
}

/**
 * POST /api/auth/register
 */
export async function register(req, res, next) {
    try {
        const result = await userService.registerUser(validatedBody(req));
        return res.status(201).json({
            id: result.userID,
            email: result.email,
            fullName: result.fullName,
            roleID: result.roleID,
            message: 'Account created. You can sign in now.',
        });
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ message: err.message });
        }
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'An account with this email already exists.' });
        }
        next(err);
    }
}

export async function forgotPassword(req, res, next) {
    try {
        const result = await userService.requestPasswordReset(validatedBody(req));
        return res.status(200).json(result);
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ message: err.message });
        }
        next(err);
    }
}

export async function resetPassword(req, res, next) {
    try {
        const result = await userService.resetPassword(validatedBody(req));
        return res.status(200).json(result);
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ message: err.message });
        }
        next(err);
    }
}

export async function changePassword(req, res, next) {
    try{
        const result = await userService.changePassword(validatedBody(req), req.user);
        return res.status(200).json({
            message: 'Password updated.',
            email: result.email,
        });
    } catch(err){
        if(err.statusCode) {
            return res.status(err.statusCode).json({ message: err.message });
        }
        next(err);
    }
}

import * as userService from '../services/userService.js';

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
export async function login(req, res, next) {
    try {
        const result = await userService.loginUser(req.body);
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


export function me(req, res) {
    return res.json({ user: req.user });
}

/**
 * POST /api/auth/refresh
 * Body: { refreshToken }
 */
export async function refresh(req, res, next) {
    try {
        const result = await userService.refreshAccessSession(req.body);
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
 * Body: { refreshToken }
 */
export async function logout(req, res, next) {
    try {
        const result = await userService.logoutSession(req.body);
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
 * Body (JSON): { fullName, email, password, roleID }
 */
export async function register(req, res, next) {
    try {
        const result = await userService.registerUser(req.body);
        return res.status(201).json({
            id: result.userID,
            email: result.email,
            fullName: result.fullName,
            roleID: result.roleID,
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

export async function changePassword(req, res, next) {
    try{
        const result = await userService.changePassword(req.body);
        return res.status(200).json({
            message: 'Password updated.',
            email: result.email,
        });
    } catch(err){
        if(err.statusCode) {
            return res.status(err.statusCode).json({ message: err.message });
        }
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'An account with this email already exists.' });
        }
        next(err)
    }
}
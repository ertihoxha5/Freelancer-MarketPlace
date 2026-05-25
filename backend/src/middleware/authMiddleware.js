import { verifyAccessToken } from '../utils/jwt.js';
import * as userRepository from '../repositories/userRepository.js';

export async function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
        return res.status(401).json({ message: 'Access token required.' });
    }
    try {
        const decoded = verifyAccessToken(token);
        const user = await userRepository.findActiveAuthUserById(Number(decoded.sub));
        if (!user || Number(user.tokenVersion) !== Number(decoded.tokenVersion ?? 0)) {
            return res.status(401).json({ message: 'Invalid or expired token.' });
        }
        req.user = {
            id: Number(user.id),
            email: user.email,
            roleID: Number(user.roleID),
            tokenVersion: Number(user.tokenVersion),
        };
        next();
    } catch {
        return res.status(401).json({ message: 'Invalid or expired token.' });
    }
}

export function requireRole(...allowedRoleIDs) {
    const allowed = new Set(allowedRoleIDs.map((id) => Number(id)));
    return (req, res, next) => {
        const roleID = Number(req.user?.roleID);
        if (!allowed.has(roleID)) {
            return res.status(403).json({ message: 'You do not have access to this resource.' });
        }
        next();
    };
}

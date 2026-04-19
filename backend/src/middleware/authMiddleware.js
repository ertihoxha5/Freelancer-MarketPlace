import { verifyAccessToken } from '../utils/jwt.js';

export function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
        return res.status(401).json({ message: 'Access token required.' });
    }
    try {
        const decoded = verifyAccessToken(token);
        req.user = {
            id: Number(decoded.sub),
            email: decoded.email,
            roleID: Number(decoded.roleID),
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

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

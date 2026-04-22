import { verifyAccessToken } from '../../utils/jwt.js';

export function authenticateSocket(socket, next) {
    try {
        const token = socket.handshake.auth?.token;
        if (!token) {
            return next(new Error('Unauthorized'));
        }
        const decoded = verifyAccessToken(token);
        socket.user = {
            id: Number(decoded.sub),
            email: decoded.email,
            roleID: Number(decoded.roleID),
        };
        return next();
    } catch {
        return next(new Error('Unauthorized'));
    }
}

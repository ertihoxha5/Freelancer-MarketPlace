import { verifyAccessToken } from '../../utils/jwt.js';
import * as userRepository from '../../repositories/userRepository.js';

export async function authenticateSocket(socket, next) {
    try {
        const token = socket.handshake.auth?.token;
        if (!token) {
            return next(new Error('Unauthorized'));
        }
        const decoded = verifyAccessToken(token);
        const user = await userRepository.findActiveAuthUserById(Number(decoded.sub));
        if (!user || Number(user.tokenVersion) !== Number(decoded.tokenVersion ?? 0)) {
            return next(new Error('Unauthorized'));
        }
        socket.user = {
            id: Number(user.id),
            email: user.email,
            fullName: user.fullName,
            roleID: Number(user.roleID),
            tokenVersion: Number(user.tokenVersion),
        };
        return next();
    } catch {
        return next(new Error('Unauthorized'));
    }
}

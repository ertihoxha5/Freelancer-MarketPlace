import { Server } from 'socket.io';
import { authenticateSocket } from './middleware/authSocket.js';
import { registerChatHandlers } from './handlers/chatHandlers.js';

const presenceState = new Map();

function markOnline(io, userID, socketID) {
    let sockets = presenceState.get(userID);
    if (!sockets) {
        sockets = new Set();
        presenceState.set(userID, sockets);
        io.emit('presence:online', { userID });
    }
    sockets.add(socketID);
}

function markOffline(io, userID, socketID) {
    const sockets = presenceState.get(userID);
    if (!sockets) return;
    sockets.delete(socketID);
    if (sockets.size === 0) {
        presenceState.delete(userID);
        io.emit('presence:offline', { userID });
    }
}

export function initSocketServer(httpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
            methods: ['GET', 'POST'],
        },
    });

    io.use(authenticateSocket);

    io.on('connection', (socket) => {
        const userID = socket.user.id;
        socket.join(`user:${userID}`);
        markOnline(io, userID, socket.id);

        registerChatHandlers({ io, socket, presenceState });

        socket.on('disconnect', () => {
            markOffline(io, userID, socket.id);
        });
    });

    return io;
}

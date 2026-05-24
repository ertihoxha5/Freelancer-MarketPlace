import { Server } from "socket.io";
import { authenticateSocket } from "./middleware/authSocket.js";
import { registerChatHandlers } from "./handlers/chatHandlers.js";
import { registerBusinessHandlers } from "./handlers/businessHandlers.js";

const SOCKET_CORS_ORIGINS = (
  process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const presenceState = new Map();

function markOnline(io, userID, socketID) {
  let sockets = presenceState.get(userID);
  if (!sockets) {
    sockets = new Set();
    presenceState.set(userID, sockets);
    io.emit("presence:online", { userID });
  }
  sockets.add(socketID);
}

function markOffline(io, userID, socketID) {
  const sockets = presenceState.get(userID);
  if (!sockets) return;
  sockets.delete(socketID);
  if (sockets.size === 0) {
    presenceState.delete(userID);
    io.emit("presence:offline", { userID });
  }
}

let _io = null;
export function getIO() {
  return _io;
}
export function initSocketServer(httpServer) {
  _io = new Server(httpServer, {
    path: "/socket.io",
    cors: {
      origin: SOCKET_CORS_ORIGINS,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  _io.use(authenticateSocket);

  _io.on("connection", (socket) => {
    const userID = socket.user.id;
    socket.join(`user:${userID}`);
    markOnline(_io, userID, socket.id);

    registerChatHandlers({ io: _io, socket, presenceState });
    registerBusinessHandlers({ io: _io, socket, presenceState });

    socket.on("disconnect", () => {
      markOffline(_io, userID, socket.id);
    });
  });

  return _io;
}

import { io } from "socket.io-client";
import { API_BASE, getAccessToken } from "../apiServices";

let socket = null;

export function connectSocket() {
  const token = getAccessToken();
  if (!token) {
    disconnectSocket();
    return null;
  }

  if (socket) {
    const currentToken = socket.auth?.token;
    if (currentToken !== token) {
      disconnectSocket();
    } else if (socket.connected) {
      return socket;
    }
  }

  socket = io(API_BASE, {
    path: "/socket.io",
    transports: ["polling", "websocket"],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 5,
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

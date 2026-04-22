import { io } from "socket.io-client";
import { API_BASE, getAccessToken } from "../apiServices";

let socket = null;

export function connectSocket() {
  const token = getAccessToken();
  if (!token) return null;

  if (socket?.connected) return socket;

  socket = io(API_BASE, {
    transports: ["websocket", "polling"],
    auth: { token },
    withCredentials: true,
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

import * as chatService from "../../services/chatService.js";
import * as chatRepository from "../../repositories/chatRepository.js";
import { pushNotification } from "../../services/notificationService.js";

function conversationRoom(conversationID) {
  return `conversation:${conversationID}`;
}

export function registerChatHandlers({ io, socket, presenceState }) {
  socket.on("conversation:join", async (payload = {}, ack) => {
    try {
      const conversationID = Number(payload.conversationID);
      const conversation = await chatRepository.getConversationByIdForUser(
        conversationID,
        socket.user.id,
      );
      if (!conversation) {
        throw new Error("Conversation not found.");
      }
      socket.join(conversationRoom(conversationID));
      ack?.({ ok: true });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on("message:send", async (payload = {}, ack) => {
    try {
      const message = await chatService.sendMessage({
        conversationID: payload.conversationID,
        senderID: socket.user.id,
        content: payload.content,
        msgType: payload.msgType || "text",
        field: payload.field || null,
      });

      io.to(conversationRoom(message.conversationID)).emit(
        "message:new",
        message,
      );

      const participants = await chatRepository.getConversationParticipants(
        message.conversationID,
      );
      for (const participant of participants) {
        if (participant.userID !== socket.user.id) {
          io.to(`user:${participant.userID}`).emit("conversation:updated", {
            conversationID: message.conversationID,
            lastMessageAt: message.sentAt,
          });

          const preview = String(message.content).slice(0, 40);
          await pushNotification({
            types: "message",
            receiverID: participant.userID,
            title: "New Message",
            msg: `${message.senderName}: ${preview}`,
          }).catch(() => {});

          io.to(`user:${participant.userID}`).emit("notification:new", {
            type: "message",
            senderName: message.senderName,
            conversationID: message.conversationID,
          });
        }
      }

      ack?.({ ok: true, message });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on("message:read", async (payload = {}, ack) => {
    try {
      const result = await chatService.markAsRead({
        conversationID: payload.conversationID,
        userID: socket.user.id,
      });
      io.to(conversationRoom(Number(payload.conversationID))).emit(
        "message:read",
        {
          conversationID: Number(payload.conversationID),
          userID: socket.user.id,
        },
      );
      ack?.({ ok: true, ...result });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on("typing:start", (payload = {}) => {
    const conversationID = Number(payload.conversationID);
    if (!Number.isInteger(conversationID) || conversationID <= 0) return;
    socket.to(conversationRoom(conversationID)).emit("typing:start", {
      conversationID,
      userID: socket.user.id,
    });
  });

  socket.on("typing:stop", (payload = {}) => {
    const conversationID = Number(payload.conversationID);
    if (!Number.isInteger(conversationID) || conversationID <= 0) return;
    socket.to(conversationRoom(conversationID)).emit("typing:stop", {
      conversationID,
      userID: socket.user.id,
    });
  });

  socket.on("presence:sync", async (ack) => {
    ack?.({
      ok: true,
      onlineUserIDs: Array.from(presenceState.keys()),
    });
  });
}

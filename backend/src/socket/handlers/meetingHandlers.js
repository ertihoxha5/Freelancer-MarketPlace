export function registerMeetingHandlers({ io, socket }) {

  if (!global.meetingParticipants) {
    global.meetingParticipants = new Map();
  }
  socket.data.meetingRooms = socket.data.meetingRooms || new Set();

  function getParticipants(room) {
    return Array.from((global.meetingParticipants.get(room) || new Map()).values());
  }

  function updateParticipants(room, userID, fullName, action) {
    if (!global.meetingParticipants.has(room)) {
      global.meetingParticipants.set(room, new Map());
    }
    const participants = global.meetingParticipants.get(room);

    if (action === 'add') {
      participants.set(Number(userID), { userID: Number(userID), fullName: fullName || `User ${userID}` });
    } else if (action === 'remove') {
      participants.delete(Number(userID));
      if (participants.size === 0) {
        global.meetingParticipants.delete(room);
      }
    }

    io.to(room).emit("meeting:participants-updated", {
      participants: getParticipants(room),
    });
  }

  socket.on("meeting:join", async ({ contractID }, ack) => {
    try {
      const room = `meeting:${contractID}`;
      socket.join(room);
      socket.data.meetingRooms.add(room);

      const userID = socket.user.id;
      const fullName = socket.user.fullName || "User";

      updateParticipants(room, userID, fullName, 'add');

      socket.to(room).emit("meeting:peer-joined", {
        userID,
        fullName,
      });

      ack?.({
        ok: true,
        room,
        participants: getParticipants(room)
      });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on("meeting:leave", ({ contractID }) => {
    const room = `meeting:${contractID}`;
    const userID = socket.user.id;

    updateParticipants(room, userID, null, 'remove');
    socket.leave(room);
    socket.data.meetingRooms.delete(room);

    socket.to(room).emit("meeting:peer-left", {
      userID,
    });
  });

  socket.on("disconnect", () => {
    const userID = socket.user.id;
    for (const room of socket.data.meetingRooms || []) {
      updateParticipants(room, userID, null, "remove");
      socket.to(room).emit("meeting:peer-left", { userID });
    }
  });

  socket.on("meeting:offer", ({ contractID, offer, toUserID }) => {
    const room = `meeting:${contractID}`;
    const payload = {
      offer,
      fromUserID: socket.user.id,
      fromFullName: socket.user.fullName || "User",
    };

    if (toUserID) {
      io.to(`user:${toUserID}`).emit("meeting:offer", payload);
    } else {
      socket.to(room).emit("meeting:offer", payload);
    }
  });

  socket.on("meeting:answer", ({ contractID, answer, toUserID }) => {
    const payload = {
      answer,
      fromUserID: socket.user.id,
    };
    if (toUserID) {
      io.to(`user:${toUserID}`).emit("meeting:answer", payload);
    } else {
      const room = `meeting:${contractID}`;
      socket.to(room).emit("meeting:answer", payload);
    }
  });

  socket.on("meeting:ice-candidate", ({ contractID, candidate, toUserID }) => {
    const payload = {
      candidate,
      fromUserID: socket.user.id,
    };
    if (toUserID) {
      io.to(`user:${toUserID}`).emit("meeting:ice-candidate", payload);
    } else {
      const room = `meeting:${contractID}`;
      socket.to(room).emit("meeting:ice-candidate", payload);
    }
  });

  socket.on("meeting:chat-message", ({ contractID, message }) => {
    const room = `meeting:${contractID}`;
    const chatMessage = {
      userID: socket.user.id,
      fullName: socket.user.fullName || "User",
      message: String(message).slice(0, 500),
      timestamp: new Date().toISOString(),
    };
    io.to(room).emit("meeting:chat-message", chatMessage);
  });

  socket.on("meeting:invite", ({ contractID }) => {
    const room = `meeting:${contractID}`;

    socket.to(room).emit("meeting:invited", {
      fromUserID: socket.user.id,
      fromFullName: socket.user.fullName || "User",
      contractID,
      message: "You have been invited to join the video meeting.",
    });
  });
}

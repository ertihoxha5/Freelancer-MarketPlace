export function registerMeetingHandlers({ io, socket }) {
  // Simple in-memory tracking of participants per meeting room
  // In production, use Redis or DB for persistence across restarts
  if (!global.meetingParticipants) {
    global.meetingParticipants = new Map(); // room -> Set of {userID, fullName}
  }

  function getParticipants(room) {
    return Array.from(global.meetingParticipants.get(room) || []);
  }

  function updateParticipants(room, userID, fullName, action) {
    if (!global.meetingParticipants.has(room)) {
      global.meetingParticipants.set(room, new Set());
    }
    const participants = global.meetingParticipants.get(room);

    if (action === 'add') {
      participants.add({ userID, fullName: fullName || `User ${userID}` });
    } else if (action === 'remove') {
      for (const p of participants) {
        if (p.userID === userID) {
          participants.delete(p);
          break;
        }
      }
    }

    // Broadcast updated list to room
    io.to(room).emit("meeting:participants-updated", {
      participants: getParticipants(room),
    });
  }

  // Join a meeting room for a specific contract/workspace
  socket.on("meeting:join", async ({ contractID }, ack) => {
    try {
      const room = `meeting:${contractID}`;
      socket.join(room);

      const userID = socket.user.id;
      const fullName = socket.user.fullName || "User";

      updateParticipants(room, userID, fullName, 'add');

      // Notify others that a new peer joined (for WebRTC)
      socket.to(room).emit("meeting:peer-joined", {
        userID,
        fullName,
      });

      // Send current participants to the joiner
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

    socket.to(room).emit("meeting:peer-left", {
      userID,
    });
  });

  // WebRTC Signaling
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

  // In-meeting chat (Google Meet style)
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

  // Invitation / share link notification (to notify the other party)
  socket.on("meeting:invite", ({ contractID }) => {
    const room = `meeting:${contractID}`;
    // Notify others in the workspace/contract that a meeting invitation was sent
    // We broadcast to the meeting room (they will see it if already in workspace)
    socket.to(room).emit("meeting:invited", {
      fromUserID: socket.user.id,
      fromFullName: socket.user.fullName || "User",
      contractID,
      message: "You have been invited to join the video meeting.",
    });
  });
}

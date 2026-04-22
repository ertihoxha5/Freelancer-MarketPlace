import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Header from "../components/Header.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  fetchChatConversations,
  searchChatUsers,
  createOrGetDirectConversation,
  fetchConversationMessages,
  markConversationRead,
} from "../apiServices.js";
import { connectSocket, disconnectSocket } from "../socket/socketClient.js";

export default function ClientMessages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversationID, setActiveConversationID] = useState(null);
  const [messagesByConversation, setMessagesByConversation] = useState({});
  const [draft, setDraft] = useState("");
  const [onlineUserIDs, setOnlineUserIDs] = useState(new Set());
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const activeConversationIDRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationID) ?? null,
    [conversations, activeConversationID],
  );
  const activeMessages = messagesByConversation[activeConversationID] ?? [];

  useEffect(() => {
    activeConversationIDRef.current = activeConversationID;
  }, [activeConversationID]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [activeConversationID, activeMessages.length]);

  const upsertMessageInConversation = useCallback((message) => {
    const conversationID = Number(message?.conversationID);
    if (!Number.isInteger(conversationID) || conversationID <= 0) return;

    setMessagesByConversation((prev) => {
      const current = prev[conversationID] ?? [];
      const exists = current.some((item) => Number(item.id) === Number(message.id));
      if (exists) return prev;
      return { ...prev, [conversationID]: [...current, message] };
    });

    setConversations((prev) =>
      prev.map((conv) =>
        Number(conv.id) === conversationID
          ? { ...conv, lastMessageAt: message.sentAt, lastMessagePreview: message.content }
          : conv,
      ),
    );
  }, []);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchChatConversations();
      const items = Array.isArray(data.conversations) ? data.conversations : [];
      setConversations(items);
      if (items.length > 0) {
        setActiveConversationID((prev) => prev ?? items[0].id);
      } else {
        setActiveConversationID(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversations.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversationID) => {
    try {
      const data = await fetchConversationMessages(conversationID, { limit: 30 });
      const items = Array.isArray(data.messages) ? data.messages : [];
      setMessagesByConversation((prev) => ({ ...prev, [conversationID]: items }));
      await markConversationRead(conversationID).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages.");
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!activeConversationID) return;
    if (messagesByConversation[activeConversationID]) return;
    loadMessages(activeConversationID);
  }, [activeConversationID, messagesByConversation, loadMessages]);

  useEffect(() => {
    const socket = connectSocket();
    if (!socket) return undefined;

    socket.on("connect_error", () => {
      setError("Realtime connection failed. Refresh token/session may be expired.");
    });

    socket.on("message:new", upsertMessageInConversation);

    socket.on("connect", () => {
      if (activeConversationIDRef.current) {
        socket.emit("conversation:join", { conversationID: activeConversationIDRef.current });
      }
    });

    socket.on("presence:online", ({ userID }) => {
      setOnlineUserIDs((prev) => new Set([...prev, Number(userID)]));
    });

    socket.on("presence:offline", ({ userID }) => {
      setOnlineUserIDs((prev) => {
        const next = new Set(prev);
        next.delete(Number(userID));
        return next;
      });
    });

    socket.emit("presence:sync", (res) => {
      if (res?.ok && Array.isArray(res.onlineUserIDs)) {
        setOnlineUserIDs(new Set(res.onlineUserIDs.map(Number)));
      }
    });

    return () => {
      socket.off("message:new");
      socket.off("connect");
      socket.off("presence:online");
      socket.off("presence:offline");
      disconnectSocket();
    };
  }, [upsertMessageInConversation]);

  useEffect(() => {
    const socket = connectSocket();
    if (!socket || !activeConversationID) return;
    socket.emit("conversation:join", { conversationID: activeConversationID });
  }, [activeConversationID]);

  async function handleSendMessage(event) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !activeConversationID || sending) return;

    const socket = connectSocket();
    if (!socket) {
      setError("Socket is not connected.");
      return;
    }

    setSending(true);
    setError("");
    socket.emit(
      "message:send",
      { conversationID: activeConversationID, content, msgType: "text" },
      (ack) => {
        setSending(false);
        if (!ack?.ok) {
          setError(ack?.error || "Failed to send message.");
          return;
        }
        if (ack?.message) {
          upsertMessageInConversation(ack.message);
        }
        setDraft("");
      },
    );
  }

  async function handleUserSearch(event) {
    event.preventDefault();
    const query = userQuery.trim();
    if (query.length < 2) {
      setError("Type at least 2 characters to search users.");
      return;
    }

    setSearchingUsers(true);
    setError("");
    try {
      const data = await searchChatUsers(query);
      setUserResults(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search users.");
    } finally {
      setSearchingUsers(false);
    }
  }

  async function handleStartDirectConversation(receiverID) {
    setCreatingConversation(true);
    setError("");
    try {
      const data = await createOrGetDirectConversation({ receiverID });
      const conversation = data?.conversation;
      if (!conversation?.id) {
        throw new Error("Failed to create conversation.");
      }
      setConversations((prev) => {
        const exists = prev.some((item) => item.id === conversation.id);
        if (exists) return prev;
        return [conversation, ...prev];
      });
      setActiveConversationID(conversation.id);
      await loadMessages(conversation.id);
      setUserResults([]);
      setUserQuery("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not start direct conversation.",
      );
    } finally {
      setCreatingConversation(false);
    }
  }

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 min-h-0 w-full p-0">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-hidden p-6 sm:p-8">
            <form
              onSubmit={handleUserSearch}
              className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3"
            >
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="Search users by name or email"
                  className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 bg-white"
                />
                <button
                  type="submit"
                  disabled={searchingUsers}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {searchingUsers ? "Searching..." : "Search"}
                </button>
              </div>
              {userResults.length > 0 && (
                <div className="mt-3 space-y-2">
                  {userResults.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{entry.fullName}</p>
                        <p className="text-xs text-slate-500">{entry.email}</p>
                      </div>
                      <button
                        type="button"
                        disabled={creatingConversation}
                        onClick={() => handleStartDirectConversation(entry.id)}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Message
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </form>

            {error && (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <div className="grid h-[calc(100%-6rem)] grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
              <aside className="rounded-2xl border border-slate-200 bg-white p-3 overflow-auto">
                {loading ? (
                  <p className="text-sm text-slate-500">Loading conversations...</p>
                ) : conversations.length === 0 ? (
                  <p className="text-sm text-slate-500">No conversations yet.</p>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => setActiveConversationID(conv.id)}
                      className={`w-full rounded-xl border p-3 text-left mb-2 ${
                        conv.id === activeConversationID
                          ? "border-slate-700 bg-slate-50"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <p className="text-sm font-semibold text-slate-900">
                        {conv.conversationType === "direct"
                          ? conv.peerName || "Direct message"
                          : `Project #${conv.projectID}`}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {conv.conversationType === "direct"
                          ? `Direct • ${conv.peerName || "User"}`
                          : "Project chat"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 truncate">
                        {conv.lastMessagePreview || "No messages yet"}
                      </p>
                    </button>
                  ))
                )}
              </aside>

              <div className="rounded-2xl border border-slate-200 bg-white flex flex-col min-h-0">
                <div className="border-b border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    {activeConversation ? `Conversation #${activeConversation.id}` : "Select a conversation"}
                  </p>
                </div>

                <div ref={messagesContainerRef} className="flex-1 overflow-auto p-4 space-y-3">
                  {activeMessages.length === 0 ? (
                    <p className="text-sm text-slate-500">No messages yet.</p>
                  ) : (
                    activeMessages.map((msg) => {
                      const mine = Number(msg.senderID) === Number(user?.id);
                      const isOnline = onlineUserIDs.has(Number(msg.senderID));
                      return (
                        <div
                          key={msg.id}
                          className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                            mine
                              ? "ml-auto bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-900"
                          }`}
                        >
                          <p className={`text-xs mb-1 ${mine ? "text-slate-300" : "text-slate-500"}`}>
                            {mine ? "You" : msg.senderName} {isOnline ? "• online" : "• offline"}
                          </p>
                          <p>{msg.content}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="border-t border-slate-200 p-3 flex gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    disabled={!activeConversationID}
                  />
                  <button
                    type="submit"
                    disabled={!activeConversationID || !draft.trim() || sending}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {sending ? "Sending..." : "Send"}
                  </button>
                </form>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

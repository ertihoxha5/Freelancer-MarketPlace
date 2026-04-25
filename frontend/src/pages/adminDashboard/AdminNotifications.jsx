import { useEffect, useState, useMemo, useCallback } from "react";
import Header from "../../components/Header.jsx";
import Sidebar from "../../components/Sidebar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  fetchAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  deleteAdminNotification,
  deleteAllAdminNotifications,
} from "../../apiServices.js";

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function NotificationIcon({ type, isRead }) {
  const base =
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-lg";
  if (type === "message") {
    return (
      <div
        className={`${base} ${isRead ? "bg-slate-100 text-slate-400" : "bg-blue-100 text-blue-600"}`}
      >
        💬
      </div>
    );
  }
  return (
    <div
      className={`${base} ${isRead ? "bg-slate-100 text-slate-400" : "bg-amber-100 text-amber-600"}`}
    >
      🔔
    </div>
  );
}

const FILTERS = ["all", "unread", "system", "message"];

export default function AdminNotifications() {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [processingId, setProcessingId] = useState(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAdminNotifications();
      setNotifications(
        Array.isArray(data.notifications) ? data.notifications : [],
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load notifications.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (activeFilter === "all") return notifications;
    if (activeFilter === "unread")
      return notifications.filter((n) => !n.isRead);
    return notifications.filter((n) => n.types === activeFilter);
  }, [notifications, activeFilter]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications],
  );

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("admin-notifications-unread", {
        detail: { count: unreadCount },
      }),
    );
  }, [unreadCount]);

  async function handleMarkRead(id) {
    setProcessingId(id);
    try {
      await markAdminNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDelete(id) {
    setProcessingId(id);
    try {
      await deleteAdminNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleMarkAllRead() {
    if (unreadCount === 0) return;
    setBulkProcessing(true);
    try {
      await markAllAdminNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed.");
    } finally {
      setBulkProcessing(false);
    }
  }

  async function handleDeleteAll() {
    if (!window.confirm("Delete all notifications? This cannot be undone."))
      return;
    setBulkProcessing(true);
    try {
      await deleteAllAdminNotifications();
      setNotifications([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed.");
    } finally {
      setBulkProcessing(false);
    }
  }

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col overflow-hidden">
      <Header />

      <main className="flex-1 min-h-0 w-full p-0">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />

          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Admin
                </p>
                <h1 className="mt-2 text-3xl font-semibold text-slate-900 flex items-center gap-3">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Platform activity — new users, projects, and system events.
                </p>
              </div>

              {notifications.length > 0 && (
                <div className="flex shrink-0 flex-wrap gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      disabled={bulkProcessing}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                    >
                      {bulkProcessing ? "Processing…" : "Mark all as read"}
                    </button>
                  )}
                  <button
                    onClick={handleDeleteAll}
                    disabled={bulkProcessing}
                    className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mb-6 flex gap-1 rounded-2xl bg-slate-100 p-1 w-fit">
              {FILTERS.map((f) => {
                const counts = {
                  all: notifications.length,
                  unread: unreadCount,
                  system: notifications.filter((n) => n.types === "system")
                    .length,
                  message: notifications.filter((n) => n.types === "message")
                    .length,
                };
                const labels = {
                  all: "All",
                  unread: "Unread",
                  system: "System",
                  message: "Messages",
                };
                return (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                      activeFilter === f
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {labels[f]} ({counts[f]})
                  </button>
                );
              })}
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-20 animate-pulse rounded-2xl border border-slate-100 bg-slate-50"
                  />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState filter={activeFilter} />
            ) : (
              <div className="space-y-3">
                {filtered.map((notif) => (
                  <NotificationCard
                    key={notif.id}
                    notif={notif}
                    processing={processingId === notif.id}
                    onMarkRead={handleMarkRead}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function NotificationCard({ notif, processing, onMarkRead, onDelete }) {
  return (
    <div
      className={`group relative flex gap-4 rounded-2xl border p-4 transition-all hover:shadow-sm ${
        notif.isRead
          ? "border-slate-100 bg-white"
          : "border-slate-900/10 bg-slate-50"
      }`}
    >
      {!notif.isRead && (
        <span className="absolute right-4 top-4 h-2 w-2 rounded-full bg-slate-900" />
      )}

      <NotificationIcon type={notif.types} isRead={notif.isRead} />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`truncate text-sm font-semibold ${notif.isRead ? "text-slate-600" : "text-slate-900"}`}
          >
            {notif.title}
          </p>
          <span className="shrink-0 text-xs text-slate-400">
            {timeAgo(notif.createdAt)}
          </span>
        </div>

        {notif.msg && (
          <p className="mt-1 text-sm text-slate-600 leading-relaxed">
            {notif.msg}
          </p>
        )}

        <div className="mt-2 flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              notif.types === "message"
                ? "bg-blue-50 text-blue-600"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {notif.types === "message" ? "💬 Message" : "🔔 System"}
          </span>
          {notif.isRead && <span className="text-xs text-slate-400">Read</span>}
        </div>
      </div>

      {/* Action buttons — visible on hover */}
      <div className="flex shrink-0 flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {!notif.isRead && (
          <button
            onClick={() => onMarkRead(notif.id)}
            disabled={processing}
            title="Mark as read"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 transition-colors"
          >
            ✓
          </button>
        )}
        <button
          onClick={() => onDelete(notif.id)}
          disabled={processing}
          title="Delete"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Processing overlay */}
      {processing && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/60">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
        </div>
      )}
    </div>
  );
}

function EmptyState({ filter }) {
  const messages = {
    all: {
      icon: "🔕",
      title: "No notifications",
      desc: "Platform events will appear here.",
    },
    unread: {
      icon: "✅",
      title: "All caught up",
      desc: "No unread notifications at the moment.",
    },
    system: {
      icon: "🔔",
      title: "No system notifications",
      desc: "System events like new users and projects will appear here.",
    },
    message: {
      icon: "💬",
      title: "No message notifications",
      desc: "User message notifications will appear here.",
    },
  };

  const { icon, title, desc } = messages[filter] ?? messages.all;

  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-20 text-center">
      <span className="text-5xl">{icon}</span>
      <h3 className="mt-5 text-lg font-semibold text-slate-800">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-slate-500">{desc}</p>
    </div>
  );
}

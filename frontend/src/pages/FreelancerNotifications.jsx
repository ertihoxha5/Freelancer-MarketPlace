import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  fetchFreelancerNotifications,
  markFreelancerNotificationRead,
  markAllFreelancerNotificationsRead,
  deleteFreelancerNotification,
  deleteAllFreelancerNotifications,
  fetchActivityFeed,
  markActivityRead,
  markAllActivitiesRead,
  deleteActivity,
  deleteAllActivities,
  fetchActivityUnreadCount,
} from "../apiServices.js";

// ─── HELPERS ────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return "tani";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString();
}

const PRIORITY_COLORS = {
  urgent: "border-l-4 border-l-red-500",
  high: "border-l-4 border-l-orange-400",
  medium: "border-l-4 border-l-blue-400",
  low: "border-l-4 border-l-slate-300",
};

const FILTERS_NOTIF = ["all", "unread", "system", "message"];
const FILTERS_ACTIVITY = [
  "all",
  "unread",
  "application_accepted",
  "application_rejected",
  "new_message",
];

// ═══════════════════════════════════════════════════════════════════════════
// KOMPONENTI KRYESOR
// ═══════════════════════════════════════════════════════════════════════════

export default function FreelancerNotifications() {
  const { user } = useAuth();

  // Tab aktiv: "notifications" (MySQL) ose "activities" (MongoDB)
  const [activeTab, setActiveTab] = useState("activities");

  // ─── STATE: Notifications (MySQL) ────────────────────────────────────
  const [notifications, setNotifications] = useState([]);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const [filterNotif, setFilterNotif] = useState("all");

  // ─── STATE: Activity Feed (MongoDB) ──────────────────────────────────
  const [activities, setActivities] = useState([]);
  const [activityPagination, setActivityPagination] = useState(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [filterActivity, setFilterActivity] = useState("all");
  const [activityUnread, setActivityUnread] = useState(0);

  // ─── STATE: Shared ────────────────────────────────────────────────────
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // ─── LOAD: Notifications (MySQL) ─────────────────────────────────────
  const loadNotifications = useCallback(async () => {
    setLoadingNotif(true);
    setError("");
    try {
      const data = await fetchFreelancerNotifications();
      setNotifications(
        Array.isArray(data.notifications) ? data.notifications : [],
      );
    } catch (err) {
      setError(err.message || "Gabim gjatë ngarkimit.");
    } finally {
      setLoadingNotif(false);
    }
  }, []);

  // ─── LOAD: Activity Feed (MongoDB) ───────────────────────────────────
  const loadActivities = useCallback(
    async (eventType = null, onlyUnread = false) => {
      setLoadingActivity(true);
      setError("");
      try {
        const params = { page: 1, limit: 20 };
        if (eventType && eventType !== "all" && eventType !== "unread") {
          params.eventType = eventType;
        }
        if (eventType === "unread" || onlyUnread) {
          params.onlyUnread = true;
        }
        const data = await fetchActivityFeed(params);
        setActivities(data.activities || []);
        setActivityPagination(data.pagination);
        setActivityUnread(data.unreadCount || 0);
      } catch (err) {
        setError(err.message || "Gabim gjatë ngarkimit të aktiviteteve.");
      } finally {
        setLoadingActivity(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (activeTab === "notifications") {
      loadNotifications();
    } else {
      const evType = filterActivity === "all" ? null : filterActivity;
      const onlyUnread = filterActivity === "unread";
      loadActivities(evType, onlyUnread);
    }
  }, [activeTab, filterActivity, loadNotifications, loadActivities]);

  // Dispatch badge event
  const notifUnread = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications],
  );
  const totalUnread = notifUnread + activityUnread;

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("freelancer-notifications-unread", {
        detail: { count: totalUnread },
      }),
    );
  }, [totalUnread]);

  // ─── HANDLERS: Notifications ──────────────────────────────────────────
  async function handleMarkNotifRead(id) {
    setProcessingId(id);
    try {
      await markFreelancerNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDeleteNotif(id) {
    setProcessingId(id);
    try {
      await deleteFreelancerNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessingId(null);
    }
  }

  // ─── HANDLERS: Activities ─────────────────────────────────────────────
  async function handleMarkActivityRead(id) {
    setProcessingId(id);
    try {
      await markActivityRead(id);
      setActivities((prev) =>
        prev.map((a) => (a._id === id ? { ...a, isRead: true } : a)),
      );
      setActivityUnread((prev) => Math.max(0, prev - 1));
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDeleteActivity(id) {
    setProcessingId(id);
    try {
      await deleteActivity(id);
      setActivities((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessingId(null);
    }
  }

  async function handleMarkAllRead() {
    setBulkProcessing(true);
    try {
      if (activeTab === "notifications") {
        await markAllFreelancerNotificationsRead();
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      } else {
        await markAllActivitiesRead();
        setActivities((prev) => prev.map((a) => ({ ...a, isRead: true })));
        setActivityUnread(0);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBulkProcessing(false);
    }
  }

  async function handleDeleteAll() {
    if (!window.confirm("Fshi të gjitha? Ky veprim nuk mund të kthehet."))
      return;
    setBulkProcessing(true);
    try {
      if (activeTab === "notifications") {
        await deleteAllFreelancerNotifications();
        setNotifications([]);
      } else {
        await deleteAllActivities();
        setActivities([]);
        setActivityUnread(0);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBulkProcessing(false);
    }
  }

  // ─── FILTERED NOTIFICATIONS ───────────────────────────────────────────
  const filteredNotif = useMemo(() => {
    if (filterNotif === "all") return notifications;
    if (filterNotif === "unread") return notifications.filter((n) => !n.isRead);
    return notifications.filter((n) => n.types === filterNotif);
  }, [notifications, filterNotif]);

  const currentUnread =
    activeTab === "notifications" ? notifUnread : activityUnread;
  const hasItems =
    activeTab === "notifications"
      ? filteredNotif.length > 0
      : activities.length > 0;

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 min-h-0 w-full p-0">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />

          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            {/* ── HEADER ── */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Freelancer
                </p>
                <h1 className="mt-2 text-3xl font-semibold text-slate-900 flex items-center gap-3">
                  Njoftime & Aktivitete
                  {totalUnread > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-2.5 py-0.5 text-xs font-bold text-white">
                      {totalUnread}
                    </span>
                  )}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Njoftime të sistemit dhe aktiviteti juaj i plotë i projekteve.
                </p>
              </div>

              {hasItems && (
                <div className="flex shrink-0 flex-wrap gap-2">
                  {currentUnread > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      disabled={bulkProcessing}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {bulkProcessing
                        ? "Duke procesuar…"
                        : "Shëno të gjitha si të lexuara"}
                    </button>
                  )}
                  <button
                    onClick={handleDeleteAll}
                    disabled={bulkProcessing}
                    className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Pastro të gjitha
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* ── TABS: MySQL vs MongoDB ── */}
            <div className="mb-6 flex gap-2 border-b border-slate-200">
              <TabButton
                active={activeTab === "activities"}
                onClick={() => setActiveTab("activities")}
                badge={activityUnread}
              >
                🗂️ Aktivitetet
                <span className="ml-1.5 text-xs text-slate-400">(MongoDB)</span>
              </TabButton>
              <TabButton
                active={activeTab === "notifications"}
                onClick={() => setActiveTab("notifications")}
                badge={notifUnread}
              >
                🔔 Njoftime
                <span className="ml-1.5 text-xs text-slate-400">(MySQL)</span>
              </TabButton>
            </div>

            {/* ═══ TAB: ACTIVITIES (MongoDB) ═══ */}
            {activeTab === "activities" && (
              <>
                {/* Filter tabs */}
                <div className="mb-6 flex gap-1 rounded-2xl bg-slate-100 p-1 w-fit flex-wrap">
                  {[
                    {
                      key: "all",
                      label: `Të gjitha (${activities.length + (activityPagination?.total ? activityPagination.total - activities.length : 0)})`,
                    },
                    { key: "unread", label: `Palexuara (${activityUnread})` },
                    { key: "application_accepted", label: "✅ Pranime" },
                    { key: "application_rejected", label: "❌ Refuzime" },
                    { key: "new_message", label: "💬 Mesazhe" },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setFilterActivity(key)}
                      className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                        filterActivity === key
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {loadingActivity ? (
                  <LoadingSkeleton />
                ) : activities.length === 0 ? (
                  <EmptyActivity filter={filterActivity} />
                ) : (
                  <div className="space-y-3">
                    {activities.map((activity) => (
                      <ActivityCard
                        key={activity._id}
                        activity={activity}
                        processing={processingId === activity._id}
                        onMarkRead={handleMarkActivityRead}
                        onDelete={handleDeleteActivity}
                      />
                    ))}

                    {activityPagination?.hasMore && (
                      <div className="pt-4 text-center">
                        <button className="rounded-2xl border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                          Ngarko më shumë
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ═══ TAB: NOTIFICATIONS (MySQL) ═══ */}
            {activeTab === "notifications" && (
              <>
                <div className="mb-6 flex gap-1 rounded-2xl bg-slate-100 p-1 w-fit">
                  {FILTERS_NOTIF.map((f) => {
                    const counts = {
                      all: notifications.length,
                      unread: notifUnread,
                      system: notifications.filter((n) => n.types === "system")
                        .length,
                      message: notifications.filter(
                        (n) => n.types === "message",
                      ).length,
                    };
                    const labels = {
                      all: "Të gjitha",
                      unread: "Palexuara",
                      system: "Sistem",
                      message: "Mesazhe",
                    };
                    return (
                      <button
                        key={f}
                        onClick={() => setFilterNotif(f)}
                        className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                          filterNotif === f
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        {labels[f]} ({counts[f]})
                      </button>
                    );
                  })}
                </div>

                {loadingNotif ? (
                  <LoadingSkeleton />
                ) : filteredNotif.length === 0 ? (
                  <EmptyNotif filter={filterNotif} />
                ) : (
                  <div className="space-y-3">
                    {filteredNotif.map((notif) => (
                      <NotifCard
                        key={notif.id}
                        notif={notif}
                        processing={processingId === notif.id}
                        onMarkRead={handleMarkNotifRead}
                        onDelete={handleDeleteNotif}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function TabButton({ active, onClick, badge, children }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
        active
          ? "border-emerald-700 text-emerald-700"
          : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
      }`}
    >
      {children}
      {badge > 0 && (
        <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-700 px-1.5 text-[10px] font-bold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

function ActivityCard({ activity, processing, onMarkRead, onDelete }) {
  const priorityClass =
    PRIORITY_COLORS[activity.priority] || PRIORITY_COLORS.low;

  return (
    <div
      className={`group relative flex gap-4 rounded-2xl border p-4 transition-all hover:shadow-sm ${priorityClass} ${
        activity.isRead
          ? "border-slate-100 bg-white"
          : "border-emerald-100 bg-emerald-50/40"
      }`}
    >
      {!activity.isRead && (
        <span className="absolute right-4 top-4 h-2 w-2 rounded-full bg-emerald-600" />
      )}

      {/* Icon */}
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl ${
          activity.isRead ? "bg-slate-100" : "bg-white shadow-sm"
        }`}
      >
        {activity.icon || "🔔"}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-sm font-semibold ${activity.isRead ? "text-slate-600" : "text-slate-900"}`}
          >
            {activity.title}
          </p>
          <span className="shrink-0 text-xs text-slate-400">
            {timeAgo(activity.createdAt)}
          </span>
        </div>

        {activity.message && (
          <p className="mt-1 text-sm text-slate-600 leading-relaxed">
            {activity.message}
          </p>
        )}

        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <EventTypeBadge eventType={activity.eventType} />
          <PriorityBadge priority={activity.priority} />

          {/* Metadata shtesë */}
          {activity.metadata?.projectTitle && (
            <span className="text-xs text-slate-400">
              📁 {activity.metadata.projectTitle}
            </span>
          )}
          {activity.metadata?.bidAmount && (
            <span className="text-xs text-slate-400">
              💰 ${activity.metadata.bidAmount.toLocaleString()}
            </span>
          )}
        </div>

        {/* Action URL */}
        {activity.metadata?.actionUrl && (
          <Link
            to={activity.metadata.actionUrl}
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            onClick={() => !activity.isRead && onMarkRead(activity._id)}
          >
            Shiko detajet →
          </Link>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {!activity.isRead && (
          <button
            onClick={() => onMarkRead(activity._id)}
            disabled={processing}
            title="Shëno si të lexuar"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
          >
            ✓
          </button>
        )}
        <button
          onClick={() => onDelete(activity._id)}
          disabled={processing}
          title="Fshi"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
        >
          ✕
        </button>
      </div>

      {processing && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/60">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-700" />
        </div>
      )}
    </div>
  );
}

function NotifCard({ notif, processing, onMarkRead, onDelete }) {
  return (
    <div
      className={`group relative flex gap-4 rounded-2xl border p-4 transition-all hover:shadow-sm ${
        notif.isRead
          ? "border-slate-100 bg-white"
          : "border-emerald-700/20 bg-emerald-50/30"
      }`}
    >
      {!notif.isRead && (
        <span className="absolute right-4 top-4 h-2 w-2 rounded-full bg-emerald-700" />
      )}
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-lg ${
          notif.isRead
            ? "bg-slate-100 text-slate-400"
            : "bg-emerald-100 text-emerald-600"
        }`}
      >
        {notif.types === "message" ? "💬" : "🔔"}
      </div>
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
          <p className="mt-1 text-sm text-slate-600">{notif.msg}</p>
        )}
        <div className="mt-2 flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              notif.types === "message"
                ? "bg-blue-50 text-blue-600"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {notif.types === "message" ? "💬 Mesazh" : "🔔 Sistem"}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {!notif.isRead && (
          <button
            onClick={() => onMarkRead(notif.id)}
            disabled={processing}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
          >
            ✓
          </button>
        )}
        <button
          onClick={() => onDelete(notif.id)}
          disabled={processing}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
        >
          ✕
        </button>
      </div>
      {processing && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/60">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-700" />
        </div>
      )}
    </div>
  );
}

function EventTypeBadge({ eventType }) {
  const config = {
    application_accepted: {
      label: "Pranuar",
      class: "bg-emerald-50 text-emerald-700",
    },
    application_rejected: {
      label: "Refuzuar",
      class: "bg-rose-50 text-rose-700",
    },
    application_submitted: {
      label: "Dërguar",
      class: "bg-blue-50 text-blue-700",
    },
    application_withdrawn: {
      label: "Tërhequr",
      class: "bg-slate-100 text-slate-600",
    },
    new_message: { label: "Mesazh", class: "bg-indigo-50 text-indigo-700" },
    project_completed: {
      label: "Kompletuar",
      class: "bg-emerald-50 text-emerald-700",
    },
    project_cancelled: {
      label: "Anuluar",
      class: "bg-orange-50 text-orange-700",
    },
    review_received: { label: "Vlerësim", class: "bg-amber-50 text-amber-700" },
  };
  const c = config[eventType] || {
    label: eventType,
    class: "bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.class}`}
    >
      {c.label}
    </span>
  );
}

function PriorityBadge({ priority }) {
  if (!priority || priority === "low") return null;
  const config = {
    urgent: { label: "Urgjent", class: "bg-red-50 text-red-600" },
    high: { label: "E lartë", class: "bg-orange-50 text-orange-600" },
    medium: { label: "Mesatare", class: "bg-blue-50 text-blue-600" },
  };
  const c = config[priority];
  if (!c) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.class}`}
    >
      {c.label}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-2xl border border-slate-100 bg-slate-50"
        />
      ))}
    </div>
  );
}

function EmptyActivity({ filter }) {
  const msgs = {
    all: {
      icon: "🗂️",
      title: "Asnjë aktivitet",
      desc: "Aktivitetet e projekteve tuaja do të shfaqen këtu.",
    },
    unread: {
      icon: "✅",
      title: "Të gjitha të lexuara!",
      desc: "Nuk keni aktivitete të palexuara.",
    },
    application_accepted: {
      icon: "✅",
      title: "Asnjë pranim",
      desc: "Aplikimet e pranuara do të shfaqen këtu.",
    },
    application_rejected: {
      icon: "❌",
      title: "Asnjë refuzim",
      desc: "Aplikimet e refuzuara do të shfaqen këtu.",
    },
    new_message: {
      icon: "💬",
      title: "Asnjë mesazh",
      desc: "Mesazhet nga klientët do të shfaqen këtu.",
    },
  };
  const { icon, title, desc } = msgs[filter] || msgs.all;
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-20 text-center">
      <span className="text-5xl">{icon}</span>
      <h3 className="mt-5 text-lg font-semibold text-slate-800">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-slate-500">{desc}</p>
      <Link
        to="/freelancer/browse-projects"
        className="mt-8 rounded-2xl bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
      >
        Shiko projektet
      </Link>
    </div>
  );
}

function EmptyNotif({ filter }) {
  const msgs = {
    all: {
      icon: "🔕",
      title: "Asnjë njoftim",
      desc: "Njoftime do të shfaqen këtu.",
    },
    unread: {
      icon: "✅",
      title: "Të gjitha të lexuara!",
      desc: "Nuk keni njoftime të palexuara.",
    },
    system: { icon: "🔔", title: "Asnjë njoftim sistemi", desc: "" },
    message: { icon: "💬", title: "Asnjë mesazh", desc: "" },
  };
  const { icon, title, desc } = msgs[filter] || msgs.all;
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-20 text-center">
      <span className="text-5xl">{icon}</span>
      <h3 className="mt-5 text-lg font-semibold text-slate-800">{title}</h3>
      {desc && <p className="mt-2 max-w-sm text-sm text-slate-500">{desc}</p>}
    </div>
  );
}

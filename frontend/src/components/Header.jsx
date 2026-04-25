import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useEffect, useState } from "react";
import {
  fetchUnreadCount,
  fetchAdminUnreadCount,
  fetchFreelancerUnreadCount,
} from "../apiServices.js";
import { getSocket } from "../socket/socketClient.js";

const roleLabel = (roleID) => {
  if (Number(roleID) === 1) return "Admin";
  if (Number(roleID) === 2) return "Client";
  if (Number(roleID) === 3) return "Freelancer";
  return "Member";
};

function NotificationBell({ user }) {
  const [unread, setUnread] = useState(0);
  const roleID = Number(user?.roleID);
  const isClient = roleID === 2;
  const isAdmin = roleID === 1;
  const isFreelancer = roleID === 3;

  useEffect(() => {
    if (!user || (!isClient && !isAdmin && !isFreelancer)) return;

    let cancelled = false;

    async function load() {
      try {
        let data;
        if (isAdmin) data = await fetchAdminUnreadCount();
        else if (isFreelancer) data = await fetchFreelancerUnreadCount();
        else data = await fetchUnreadCount();
        if (!cancelled) setUnread(Number(data.count) || 0);
      } catch {}
    }

    // Listen for local badge updates dispatched from the notifications page
    function onBadgeUpdate(event) {
      if (cancelled) return;
      const count = Number(event?.detail?.count);
      if (!Number.isNaN(count) && count >= 0) setUnread(count);
    }

    function onNotificationNew() {
      if (cancelled) return;
      setUnread((prev) => prev + 1);
    }

    load();

    const eventName = isAdmin
      ? "admin-notifications-unread"
      : isFreelancer
        ? "freelancer-notifications-unread"
        : "client-notifications-unread";

    window.addEventListener(eventName, onBadgeUpdate);
    const interval = setInterval(load, 60_000);

    const socket = getSocket();
    if (socket) {
      socket.on("notification:new", onNotificationNew);
    }

    return () => {
      cancelled = true;
      window.removeEventListener(eventName, onBadgeUpdate);
      clearInterval(interval);
    };
  }, [user, isClient, isAdmin, isFreelancer]);

  if (!user || (!isClient && !isAdmin && !isFreelancer)) return null;

  const href = isAdmin
    ? "/adminDashboard/notifications"
    : isFreelancer
      ? "/freelancer/notifications"
      : "/client/notifications";

  return (
    <Link
      to={href}
      title="Notifications"
      className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
    >
      {/* Bell SVG */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>

      {/* Unread badge */}
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-[#1a3c2e]">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
const Header = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      navigate("/login");
    }
  };

  return (
    <nav className="bg-[#1a3c2e] border-b border-[#2a5c46] sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Link to="/" className="inline-flex items-center gap-2">
          <span className="text-3xl font-bold tracking-tighter text-[#a3c9a3]">
            Freelancer
          </span>
          <span className="text-2xl font-semibold text-white tracking-tight">
            MARKETPLACE
          </span>
        </Link>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/90">
            <Link to="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <Link to="/features" className="hover:text-white transition-colors">
              Features
            </Link>
            <Link to="/about" className="hover:text-white transition-colors">
              About
            </Link>
            <Link to="/contact" className="hover:text-white transition-colors">
              Contact
            </Link>
          </div>

          <div className="relative">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-[#2a5c46] border border-white/30 text-white text-sm rounded-full px-4 py-2.5 focus:outline-none focus:border-white/50 transition-colors appearance-none pr-8 cursor-pointer"
            >
              <option value="en">English</option>
              <option value="al">Shqip</option>
              <option value="de">Deutsch</option>
              <option value="it">Italiano</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
            </select>

            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/70">
              ▼
            </div>
          </div>

          {loading ? (
            <span className="text-sm text-white/70">Loading...</span>
          ) : user ? (
            <div className="flex items-center gap-3">
              <NotificationBell user={user} />
              <div className="hidden sm:flex items-center gap-3 rounded-full bg-white/10 px-5 py-2 text-sm text-white">
                Hi, {user.fullName?.split(" ")[0]}
                <span className="bg-white/20 px-3 py-1 rounded-full text-xs uppercase tracking-widest">
                  {roleLabel(user.roleID)}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-full bg-white/10 hover:bg-white/20 px-6 py-2 text-sm font-medium text-white transition"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="rounded-full border border-white/30 hover:border-white/60 px-6 py-2 text-sm font-medium text-white transition"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-full bg-[#4a7043] hover:bg-[#5a8a52] px-6 py-2 text-sm font-semibold text-white transition shadow-sm"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Header;

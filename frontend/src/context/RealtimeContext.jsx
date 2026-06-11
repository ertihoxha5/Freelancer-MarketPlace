
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext.jsx";
import { connectSocket } from "../socket/socketClient.js";

const RealtimeContext = createContext(null);

const eventConfig = {
  "proposal:new": {
    title: "New proposal",
    message: (p) => p.projectTitle || "A freelancer submitted a proposal.",
    badge: "applications",
  },
  "proposal:accepted": {
    title: "Proposal accepted",
    message: (p) => p.projectTitle || "Your proposal was accepted.",
    badge: "contracts",
  },
  "proposal:rejected": {
    title: "Proposal rejected",
    message: (p) => p.projectTitle || "A proposal was rejected.",
    badge: "applications",
  },
  "contract:created": {
    title: "Contract created",
    message: (p) => p.projectTitle || "A new contract is active.",
    badge: "contracts",
  },
  "milestone:submitted": {
    title: "Milestone submitted",
    message: (p) => p.projectTitle || "A milestone is ready for review.",
    badge: "milestones",
  },
  "milestone:approved": {
    title: "Milestone approved",
    message: (p) => p.projectTitle || "A milestone was approved.",
    badge: "milestones",
  },
  "milestone:rejected": {
    title: "Milestone rejected",
    message: (p) => p.projectTitle || "A milestone needs changes.",
    badge: "milestones",
  },
  "review:received": {
    title: "Review received",
    message: (p) => `${p.stars || ""} star review received`.trim(),
    badge: "reviews",
  },
  "project:status_changed": {
    title: "Project status changed",
    message: (p) =>
      `${p.projectTitle || "Project"} is now ${p.newStatus || "updated"}.`,
    badge: "projects",
  },
};

export function RealtimeProvider({ children }) {
  const { user } = useAuth();
  const [toasts, setToasts] = useState([]);
  const [badges, setBadges] = useState({});

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((toast) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((current) => [...current.slice(-3), { id, ...toast }]);
    setTimeout(() => dismissToast(id), 5000);
  }, [dismissToast]);

  const clearBadge = useCallback((key) => {
    setBadges((current) => ({ ...current, [key]: 0 }));
  }, []);

  useEffect(() => {
    if (!user) {
      queueMicrotask(() => {
        setBadges({});
        setToasts([]);
      });
      return undefined;
    }

    const socket = connectSocket();
    if (!socket) return undefined;

    const cleanupFns = Object.entries(eventConfig).map(([eventName, config]) => {
      const handler = (payload = {}) => {
        pushToast({
          title: config.title,
          message: config.message(payload),
          eventName,
        });
        setBadges((current) => ({
          ...current,
          [config.badge]: Number(current[config.badge] || 0) + 1,
        }));
        window.dispatchEvent(
          new CustomEvent("realtime:business-event", {
            detail: { eventName, payload },
          }),
        );
        window.dispatchEvent(
          new CustomEvent(`realtime:${eventName}`, { detail: payload }),
        );
      };
      socket.on(eventName, handler);
      return () => socket.off(eventName, handler);
    });

    return () => cleanupFns.forEach((cleanup) => cleanup());
  }, [pushToast, user]);

  const value = useMemo(
    () => ({ badges, clearBadge, dismissToast, pushToast, toasts }),
    [badges, clearBadge, dismissToast, pushToast, toasts],
  );

  return (
    <RealtimeContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </RealtimeContext.Provider>
  );
}

function ToastViewport({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-24 z-[100] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-lg"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {toast.title}
              </p>
              <p className="mt-1 text-sm text-slate-600">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
              aria-label="Dismiss notification"
            >
              x
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    return {
      badges: {},
      clearBadge: () => {},
      dismissToast: () => {},
      pushToast: () => {},
      toasts: [],
    };
  }
  return context;
}

const typeStyles = {
  success: "border-green-200 bg-green-50 text-green-800",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
  warning: "border-yellow-200 bg-yellow-50 text-yellow-800",
};

export default function Toast({ message, type = "info", onClose }) {
  return (
    <div
      className={`flex w-full max-w-sm items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${typeStyles[type] ?? typeStyles.info}`}
      role="status"
    >
      <span className="min-w-0 flex-1 leading-5">{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 rounded px-1 text-lg leading-none opacity-70 hover:opacity-100"
        aria-label="Dismiss notification"
      >
        x
      </button>
    </div>
  );
}

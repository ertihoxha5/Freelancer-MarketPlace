import { Link } from "react-router-dom";

export default function EmptyState({
  icon = "",
  title,
  description,
  actionLabel,
  actionHref,
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
      {icon ? <div className="mb-3 text-3xl">{icon}</div> : null}
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          {description}
        </p>
      ) : null}
      {actionLabel && actionHref ? (
        <Link
          to={actionHref}
          className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

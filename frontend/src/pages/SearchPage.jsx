import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header.jsx";
import EmptyState from "../components/EmptyState.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { searchList } from "../apiServices.js";

const tabConfig = {
  projects: {
    label: "Projects",
    fields: ["categoryID", "minBudget", "maxBudget", "deadline", "sort"],
    sort: [
      ["date_desc", "Newest"],
      ["date_asc", "Oldest"],
      ["budget_desc", "Budget high"],
      ["budget_asc", "Budget low"],
    ],
  },
  freelancers: {
    label: "Freelancers",
    fields: ["skillID", "minRate", "maxRate", "sort"],
    sort: [
      ["date_desc", "Newest"],
      ["rate_desc", "Rate high"],
      ["rate_asc", "Rate low"],
      ["rating_desc", "Best rating"],
    ],
  },
  applications: {
    label: "Applications",
    fields: ["status", "projectID"],
  },
  contracts: {
    label: "Contracts",
    fields: ["status", "sort"],
    sort: [
      ["date_desc", "Newest"],
      ["amount_desc", "Amount high"],
    ],
  },
  users: {
    label: "Users",
    fields: ["roleID"],
  },
};

function Skeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-36 animate-pulse rounded-lg bg-slate-100" />
      ))}
    </div>
  );
}

function ResultCard({ row, tab }) {
  const title =
    row.title || row.fullName || row.projectTitle || `#${row.id}`;
  const subtitle =
    row.email || row.pDesc || row.coverLetter || row.clientName || row.freelancerName;
  const status = row.pStatus || row.propStatus || row.cStatus || row.roleName;
  const money = row.budget ?? row.hourlyRate ?? row.bidAmount ?? row.totalAmount;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">
            {tabConfig[tab].label}
          </p>
          <h3 className="mt-1 line-clamp-2 text-lg font-semibold text-slate-900">
            {title}
          </h3>
        </div>
        {status ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
            {status}
          </span>
        ) : null}
      </div>
      {subtitle ? (
        <p className="mt-3 line-clamp-3 text-sm text-slate-600">{subtitle}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
        {money != null ? <span>${money}</span> : null}
        {row.deadline ? <span>Due {String(row.deadline).slice(0, 10)}</span> : null}
        {row.createdAt ? <span>{new Date(row.createdAt).toLocaleDateString()}</span> : null}
      </div>
    </article>
  );
}

export default function SearchPage() {
  const { user } = useAuth();
  const isAdmin = Number(user?.roleID) === 1;
  const tabs = useMemo(
    () => Object.keys(tabConfig).filter((tab) => isAdmin || tab !== "users"),
    [isAdmin],
  );
  const [activeTab, setActiveTab] = useState("projects");
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ results: [], pagination: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!tabs.includes(activeTab)) setActiveTab(tabs[0]);
  }, [activeTab, tabs]);

  useEffect(() => {
    let active = true;
    async function runSearch() {
      setLoading(true);
      setError("");
      try {
        const result = await searchList(activeTab, {
          ...filters,
          q,
          page,
          limit: 9,
        });
        if (active) setData(result);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Search failed.");
      } finally {
        if (active) setLoading(false);
      }
    }
    const timeout = setTimeout(runSearch, 250);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [activeTab, filters, page, q]);

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  const config = tabConfig[activeTab];

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50">
      <Header />
      <main className="min-h-0 flex-1">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            <div className="mb-6">
              <h1 className="text-3xl font-semibold text-slate-900">Search</h1>
              <input
                value={q}
                onChange={(event) => {
                  setQ(event.target.value);
                  setPage(1);
                }}
                placeholder="Search titles, descriptions, names, or emails"
                className="mt-4 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setFilters({});
                    setPage(1);
                  }}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                    activeTab === tab
                      ? "bg-slate-900 text-white"
                      : "border border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  {tabConfig[tab].label}
                </button>
              ))}
            </div>

            <div className="mb-6 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
              {config.fields.includes("categoryID") ? (
                <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Category ID" value={filters.categoryID || ""} onChange={(e) => updateFilter("categoryID", e.target.value)} />
              ) : null}
              {config.fields.includes("skillID") ? (
                <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Skill ID" value={filters.skillID || ""} onChange={(e) => updateFilter("skillID", e.target.value)} />
              ) : null}
              {config.fields.includes("minBudget") ? (
                <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Min budget" type="number" value={filters.minBudget || ""} onChange={(e) => updateFilter("minBudget", e.target.value)} />
              ) : null}
              {config.fields.includes("maxBudget") ? (
                <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Max budget" type="number" value={filters.maxBudget || ""} onChange={(e) => updateFilter("maxBudget", e.target.value)} />
              ) : null}
              {config.fields.includes("minRate") ? (
                <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Min rate" type="number" value={filters.minRate || ""} onChange={(e) => updateFilter("minRate", e.target.value)} />
              ) : null}
              {config.fields.includes("maxRate") ? (
                <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Max rate" type="number" value={filters.maxRate || ""} onChange={(e) => updateFilter("maxRate", e.target.value)} />
              ) : null}
              {config.fields.includes("deadline") ? (
                <input className="rounded-lg border px-3 py-2 text-sm" type="date" value={filters.deadline || ""} onChange={(e) => updateFilter("deadline", e.target.value)} />
              ) : null}
              {config.fields.includes("status") ? (
                <select className="rounded-lg border px-3 py-2 text-sm" value={filters.status || ""} onChange={(e) => updateFilter("status", e.target.value)}>
                  <option value="">Any status</option>
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="completed">Completed</option>
                  <option value="terminated">Terminated</option>
                </select>
              ) : null}
              {config.fields.includes("roleID") ? (
                <select className="rounded-lg border px-3 py-2 text-sm" value={filters.roleID || ""} onChange={(e) => updateFilter("roleID", e.target.value)}>
                  <option value="">Any role</option>
                  <option value="1">Admin</option>
                  <option value="2">Client</option>
                  <option value="3">Freelancer</option>
                </select>
              ) : null}
              {config.fields.includes("projectID") ? (
                <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Project ID" value={filters.projectID || ""} onChange={(e) => updateFilter("projectID", e.target.value)} />
              ) : null}
              {config.sort ? (
                <select className="rounded-lg border px-3 py-2 text-sm" value={filters.sort || ""} onChange={(e) => updateFilter("sort", e.target.value)}>
                  <option value="">Default sort</option>
                  {config.sort.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              ) : null}
            </div>

            {error ? <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
            {loading ? (
              <Skeleton />
            ) : data.results?.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {data.results.map((row) => (
                  <ResultCard key={`${activeTab}-${row.id}`} row={row} tab={activeTab} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No results found"
                description="Try a different keyword or loosen the filters."
              />
            )}

            <div className="mt-6 flex items-center justify-between text-sm text-slate-600">
              <span>{data.pagination?.total || 0} results</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-50">Previous</button>
                <button disabled={page >= (data.pagination?.totalPages || 1)} onClick={() => setPage((p) => p + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-50">Next</button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Header from "../../components/Header.jsx";
import Sidebar from "../../components/Sidebar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  downloadProjectReport,
  fetchClientReport,
  fetchFreelancerReport,
  fetchPlatformSummaryReport,
} from "../../apiServices.js";

const colors = ["#0f172a", "#2563eb", "#16a34a", "#d97706", "#dc2626"];

export default function Reports() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [clientId, setClientId] = useState("");
  const [freelancerId, setFreelancerId] = useState("");
  const [clientReport, setClientReport] = useState(null);
  const [freelancerReport, setFreelancerReport] = useState(null);
  const [filters, setFilters] = useState({ from: "", to: "", status: "", format: "json" });
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPlatformSummaryReport()
      .then(setSummary)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load reports."));
  }, []);

  async function loadClientReport() {
    if (!clientId) return;
    setClientReport(await fetchClientReport(clientId));
  }

  async function loadFreelancerReport() {
    if (!freelancerId) return;
    setFreelancerReport(await fetchFreelancerReport(freelancerId));
  }

  const monthlyLine = freelancerReport?.earningsByMonth || clientReport?.monthlyActivity || [];

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50">
      <Header />
      <main className="min-h-0 flex-1">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            <div className="mb-6">
              <h1 className="text-3xl font-semibold text-slate-900">Reports</h1>
              <p className="mt-2 text-slate-600">Platform, client, freelancer, and project reporting.</p>
            </div>

            {error ? <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["Users", summary?.totalUsers],
                ["Projects", summary?.totalProjects],
                ["Contracts", summary?.totalContracts],
                ["Revenue", `$${Number(summary?.totalRevenue || 0).toLocaleString()}`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{value ?? "-"}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Projects by Status</h2>
                <div className="h-64">
                  <ResponsiveContainer>
                    <BarChart data={summary?.projectsByStatus || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0f172a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Users by Role</h2>
                <div className="h-64">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={summary?.usersByRole || []} dataKey="count" nameKey="roleName" outerRadius={90}>
                        {(summary?.usersByRole || []).map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Monthly Activity</h2>
                <div className="h-64">
                  <ResponsiveContainer>
                    <LineChart data={monthlyLine}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="amount" stroke="#2563eb" />
                      <Line type="monotone" dataKey="projectsPosted" stroke="#16a34a" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Client Report</h2>
                <div className="mt-3 flex gap-2">
                  <input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Client ID" className="rounded-lg border px-3 py-2 text-sm" />
                  <button onClick={loadClientReport} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Load</button>
                </div>
                {clientReport ? <pre className="mt-4 overflow-auto rounded-lg bg-slate-50 p-3 text-xs">{JSON.stringify(clientReport, null, 2)}</pre> : null}
              </section>
              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Freelancer Report</h2>
                <div className="mt-3 flex gap-2">
                  <input value={freelancerId} onChange={(e) => setFreelancerId(e.target.value)} placeholder="Freelancer ID" className="rounded-lg border px-3 py-2 text-sm" />
                  <button onClick={loadFreelancerReport} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Load</button>
                </div>
                {freelancerReport ? <pre className="mt-4 overflow-auto rounded-lg bg-slate-50 p-3 text-xs">{JSON.stringify(freelancerReport, null, 2)}</pre> : null}
              </section>
            </div>

            <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Project Report Export</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" />
                <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" />
                <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="rounded-lg border px-3 py-2 text-sm">
                  <option value="">Any status</option>
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <select value={filters.format} onChange={(e) => setFilters({ ...filters, format: e.target.value })} className="rounded-lg border px-3 py-2 text-sm">
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="xlsx">Excel</option>
                </select>
              </div>
              <button onClick={() => downloadProjectReport(filters.format, filters)} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Export Report</button>
            </section>
          </section>
        </div>
      </main>
    </div>
  );
}

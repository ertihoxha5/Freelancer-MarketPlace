import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  fetchAdminUsers,
  fetchPlatformSummaryReport,
} from "../../apiServices.js";

const COLORS = ["#0f172a", "#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed"];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [summaryData, usersData] = await Promise.all([
          fetchPlatformSummaryReport(),
          fetchAdminUsers({ page: 1, limit: 1 }),
        ]);
        if (!alive) return;
        setSummary(summaryData);
        setTotalUsers(Number(usersData.total) || 0);
      } catch (err) {
        if (alive) {
          setError(err instanceof Error ? err.message : "Unable to load dashboard.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  const kpis = [
    { label: "Projects", value: Number(summary?.totalProjects || 0) },
    { label: "Users", value: totalUsers },
    { label: "Revenue", value: `$${Number(summary?.totalRevenue || 0).toLocaleString()}` },
    { label: "This Month", value: Number(summary?.activeThisMonth || 0) },
    { label: "Contracts", value: Number(summary?.totalContracts || 0) },
  ];

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50">
      <Header />
      <main className="min-h-0 flex-1">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Admin command center</p>
                <h1 className="mt-2 text-4xl font-semibold text-slate-900">Platform dashboard</h1>
                <p className="mt-3 max-w-2xl text-slate-600">
                  Live system overview with user, project, contract, and revenue signals.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <QuickLink href="/adminDashboard/payments" label="Payments" />
                <QuickLink href="/adminDashboard/applications" label="Applications" />
                <QuickLink href="/adminDashboard/reports" label="Reports" />
                <QuickLink href="/adminDashboard/catalog" label="Catalog" />
                <QuickLink href="/adminDashboard/settings" label="Settings" />
                <QuickLink href="/adminDashboard/export" label="Exports" />
              </div>
            </div>

            {error ? (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="h-28 animate-pulse rounded-3xl bg-slate-200" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  {kpis.map((item) => (
                    <div key={item.label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <p className="text-sm font-medium text-slate-500">{item.label}</p>
                      <p className="mt-3 text-3xl font-semibold text-slate-900">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
                  <Card title="Projects by Status">
                    <div className="h-80">
                      <ResponsiveContainer>
                        <BarChart data={summary?.projectsByStatus || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="status" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#0f172a" radius={[10, 10, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <Card title="Users by Role">
                    <div className="h-80">
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={summary?.usersByRole || []}
                            dataKey="count"
                            nameKey="roleName"
                            outerRadius={110}
                            innerRadius={50}
                          >
                            {(summary?.usersByRole || []).map((_, index) => (
                              <Cell key={index} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                  <Card title="Top Freelancers">
                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-100 text-left">
                          <tr>
                            <th className="px-4 py-3">Freelancer</th>
                            <th className="px-4 py-3">Rating</th>
                            <th className="px-4 py-3">Earned</th>
                            <th className="px-4 py-3">Contracts</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {(summary?.topFreelancers || []).map((row) => (
                            <tr key={row.id}>
                              <td className="px-4 py-3">
                                <div className="font-medium text-slate-900">{row.fullName}</div>
                                <div className="text-xs text-slate-500">{row.email}</div>
                              </td>
                              <td className="px-4 py-3">{row.avgRating ?? "-"}</td>
                              <td className="px-4 py-3">${Number(row.totalEarned || 0).toLocaleString()}</td>
                              <td className="px-4 py-3">{row.contractCount ?? 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  <Card title="System Notes">
                    <div className="space-y-4 text-sm text-slate-600">
                      <p>Use the settings page to adjust general platform values and visible site content.</p>
                      <p>Use the reports page to drill into user, project, and revenue activity.</p>
                      <p>Catalog changes now flow through SQL so categories and skills stay in one source of truth.</p>
                    </div>
                  </Card>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function QuickLink({ href, label }) {
  return (
    <a
      href={href}
      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
    >
      {label}
    </a>
  );
}


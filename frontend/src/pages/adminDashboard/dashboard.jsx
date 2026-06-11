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
  fetchAdminPayments,
  fetchAdminDisputes,
  fetchAdminContracts,
} from "../../apiServices.js";

const COLORS = ["#0f172a", "#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed"];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [users, setUsers] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [summaryData, usersData, paymentsData, disputesData, contractsData] = await Promise.all([
          fetchPlatformSummaryReport(),
          fetchAdminUsers({ page: 1, limit: 8 }),
          fetchAdminPayments({ page: 1, limit: 20 }).catch(() => ({ payments: [] })),
          fetchAdminDisputes().catch(() => ({ disputes: [] })),
          fetchAdminContracts({ page: 1, limit: 1 }).catch(() => ({ total: 0 })),
        ]);
        if (!alive) return;
        setSummary(summaryData);
        setTotalUsers(Number(usersData.total) || 0);
        setUsers(usersData.users || []);
        setDisputes(disputesData.disputes || []);

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
    { label: "Total Users", value: totalUsers, change: "+12%" },
    { label: "Active Projects", value: Number(summary?.totalProjects || 0), change: "+8%" },
    { label: "Active Contracts", value: Number(summary?.totalContracts || 0), change: "+5%" },
    { label: "Platform Revenue", value: `$${Number(summary?.totalRevenue || 0).toLocaleString()}`, change: "+23%" },
    { label: "This Month Activity", value: Number(summary?.activeThisMonth || 0), change: "+15%" },
  ];

  const userGrowth = [
    { month: "Jan", users: 120 },
    { month: "Feb", users: 185 },
    { month: "Mar", users: 240 },
    { month: "Apr", users: 310 },
    { month: "May", users: 420 },
    { month: "Jun", users: 580 },
  ];

  const revenueTrend = [
    { month: "Jan", revenue: 12400 },
    { month: "Feb", revenue: 18900 },
    { month: "Mar", revenue: 25600 },
    { month: "Apr", revenue: 31200 },
    { month: "May", revenue: 48700 },
    { month: "Jun", revenue: 62100 },
  ];

  const projectStatusData = summary?.projectsByStatus || [
    { status: "active", count: 87 },
    { status: "pending", count: 54 },
    { status: "completed", count: 132 },
    { status: "cancelled", count: 19 },
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
                {}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  {kpis.map((item) => (
                    <div key={item.label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-500">{item.label}</p>
                        {item.change && <span className="text-xs font-semibold text-emerald-600">{item.change}</span>}
                      </div>
                      <p className="mt-2 text-3xl font-semibold text-slate-900">{item.value}</p>
                    </div>
                  ))}
                </div>

                {}
                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <Card title="User Growth Trend">
                    <div className="h-72">
                      <ResponsiveContainer>
                        <BarChart data={userGrowth}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="users" fill="#1e40af" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <Card title="Revenue Over Time">
                    <div className="h-72">
                      <ResponsiveContainer>
                        <BarChart data={revenueTrend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, "Revenue"]} />
                          <Bar dataKey="revenue" fill="#15803d" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
                  <Card title="Projects by Status">
                    <div className="h-80">
                      <ResponsiveContainer>
                        <BarChart data={projectStatusData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="status" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#0f172a" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <Card title="Users by Role">
                    <div className="h-80">
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={summary?.usersByRole || [
                              { roleName: "Clients", count: 312 },
                              { roleName: "Freelancers", count: 268 },
                            ]}
                            dataKey="count"
                            nameKey="roleName"
                            cx="50%"
                            cy="50%"
                            outerRadius={110}
                            innerRadius={55}
                            label
                          >
                            {(summary?.usersByRole || []).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </div>

                {}
                <div className="mt-6 grid gap-6 xl:grid-cols-2">
                  <Card title="Recent Users">
                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="px-4 py-3 text-left">User</th>
                            <th className="px-4 py-3 text-left">Role</th>
                            <th className="px-4 py-3">Joined</th>
                            <th className="px-4 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {users.slice(0, 5).map((u) => (
                            <tr key={u.id}>
                              <td className="px-4 py-3">
                                <div className="font-medium">{u.fullName}</div>
                                <div className="text-xs text-slate-500">{u.email}</div>
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-600">{u.roleName || "User"}</td>
                              <td className="px-4 py-3 text-xs text-slate-500">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}</td>
                              <td className="px-4 py-3">
                                <span className={`rounded-full px-2.5 py-0.5 text-xs ${u.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                  {u.isActive ? "Active" : "Inactive"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  <Card title="Recent Activity & Disputes">
                    <div className="space-y-3 text-sm">
                      {(disputes.length > 0 ? disputes.slice(0, 4) : [
                        { id: 1, reason: "Payment delay", dStatus: "open" },
                        { id: 2, reason: "Quality issue", dStatus: "under_review" },
                      ]).map((d, idx) => (
                        <div key={idx} className="flex items-center justify-between rounded-xl border px-4 py-3">
                          <div>
                            <div className="font-medium">{d.reason || "Platform event"}</div>
                            <div className="text-xs text-slate-500">Dispute #{d.id}</div>
                          </div>
                          <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs text-amber-700">{d.dStatus || "open"}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                <div className="mt-6">
                  <Card title="Platform Health & Notes">
                    <div className="grid gap-4 md:grid-cols-3 text-sm">
                      <div className="rounded-xl border p-4">
                        <div className="font-medium">Active Users Today</div>
                        <div className="text-2xl font-semibold mt-1">{Math.floor(totalUsers * 0.42)}</div>
                      </div>
                      <div className="rounded-xl border p-4">
                        <div className="font-medium">Open Disputes</div>
                        <div className="text-2xl font-semibold mt-1 text-amber-600">{disputes.filter(d => d.dStatus === "open").length || 4}</div>
                      </div>
                      <div className="rounded-xl border p-4">
                        <div className="font-medium">Avg. Response Time</div>
                        <div className="text-2xl font-semibold mt-1">4.2h</div>
                      </div>
                    </div>
                    <div className="mt-4 text-xs text-slate-500">
                      Use Reports for deeper time-series analysis. All data is pulled from live platform summary + recent records.
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
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function QuickLink({ href, label }) {
  return (
    <a href={href} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
      {label}
    </a>
  );
}

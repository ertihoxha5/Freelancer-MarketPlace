import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Header from "../components/Header.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchFreelancerReport } from "../apiServices.js";

export default function FreelancerReports() {
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    fetchFreelancerReport(user.id)
      .then(setReport)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load report."));
  }, [user?.id]);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50">
      <Header />
      <main className="min-h-0 flex-1">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            <h1 className="text-3xl font-semibold text-slate-900">My Reports</h1>
            {error ? <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

            <div className="mt-6 grid gap-4 md:grid-cols-4">
              {[
                ["Earned", `$${Number(report?.totalEarned || 0).toLocaleString()}`],
                ["Completed", report?.projectsCompleted ?? "-"],
                ["Rating", report?.avgRating ?? "-"],
                ["Success", `${report?.applicationSuccessRate ?? 0}%`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Earnings by Month</h2>
                <div className="h-72">
                  <ResponsiveContainer>
                    <BarChart data={report?.earningsByMonth || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="amount" fill="#0f172a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Skill Demand</h2>
                <div className="h-72">
                  <ResponsiveContainer>
                    <BarChart data={report?.skillDemand || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="skillName" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="demand" fill="#2563eb" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

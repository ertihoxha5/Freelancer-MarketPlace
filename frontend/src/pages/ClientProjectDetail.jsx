import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Header from "../components/Header.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { fetchClientApplications, fetchClientProject } from "../apiServices.js";
import { exportCSV, exportJSON } from "../utils/export.js";

function formatDate(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleDateString();
}

function statusClass(status) {
  if (status === "accepted") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "rejected") return "bg-rose-100 text-rose-700 border-rose-200";
  if (status === "withdrawn") return "bg-slate-100 text-slate-700 border-slate-200";
  return "bg-amber-100 text-amber-700 border-amber-200";
}

export default function ClientProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [project, setProject] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [projectData, applicationsData] = await Promise.all([
          fetchClientProject(id),
          fetchClientApplications(),
        ]);
        if (!active) return;
        setProject(projectData?.project ?? null);
        const allApplications = Array.isArray(applicationsData.applications)
          ? applicationsData.applications
          : [];
        const projectId = Number(id);
        setApplications(
          allApplications.filter((item) => Number(item.projectId) === projectId),
        );
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load project.");
          setProject(null);
          setApplications([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [id]);

  const summary = useMemo(() => {
    const total = applications.length;
    const pending = applications.filter((item) => item.propStatus === "pending").length;
    const accepted = applications.filter((item) => item.propStatus === "accepted").length;
    return { total, pending, accepted };
  }, [applications]);

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 min-h-0 w-full p-0">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <Link
                  to="/client/projects"
                  className="text-sm font-semibold text-slate-600 hover:text-slate-900"
                >
                  ← Back to projects
                </Link>
                <h1 className="mt-3 text-3xl font-semibold text-slate-900">
                  {project?.title || "Project details"}
                </h1>
                <p className="mt-2 max-w-2xl text-slate-600">
                  Review project information and proposals submitted for this listing.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm sm:min-w-[18rem]">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.total}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Pending</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.pending}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Accepted</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.accepted}</p>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {error}
              </div>
            )}

            {loading ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
                Loading project...
              </div>
            ) : !project ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">Project not found</h2>
                <p className="mt-2 text-slate-600">
                  This project may have been removed or you do not have access to it.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Budget</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">
                        {project.budget ? `$${project.budget}` : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Deadline</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">
                        {formatDate(project.deadline)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</p>
                      <p className="mt-2 text-lg font-semibold capitalize text-slate-900">
                        {project.pStatus || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Proposals</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">
                        {project.proposalCount ?? applications.length}
                      </p>
                    </div>
                  </div>
                  {project.pDesc && (
                    <p className="mt-6 text-slate-600 whitespace-pre-wrap">{project.pDesc}</p>
                  )}

                  {}
                  {Array.isArray(project.phases) && project.phases.length > 0 && (
                    <div className="mt-6">
                      <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Project Phases</h4>
                      <div className="space-y-2">
                        {project.phases.map((ph, idx) => (
                          <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                            <div className="font-medium text-slate-900">Phase {idx + 1}: {ph.title}</div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {ph.deadline ? `Due: ${new Date(ph.deadline).toLocaleDateString()} ` : ""}
                              {ph.budget ? `• Budget: $${ph.budget}` : ""}
                            </div>
                            {ph.description && <p className="mt-1 text-slate-600 text-sm">{ph.description}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {}
                  {project && project.maxFreelancers && project.maxFreelancers > 1 && project.acceptedCount >= 2 && (
                    <div className="mt-4">
                      <Link
                        to={`/contracts/${project.contracts?.[0]?.id || ''}/workspace`}
                        className="inline-flex items-center rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                      >
                        Open Shared Project Workspace (for all {project.maxFreelancers} freelancers)
                      </Link>
                    </div>
                  )}

                  {}
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const rows = [project];
                        exportCSV(rows, `project-${project.id}`);
                      }}
                      className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white"
                    >
                      Export CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => exportJSON([project], `project-${project.id}`)}
                      className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white"
                    >
                      Export JSON
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const html = `<table border="1"><tr><td>Title</td><td>${project.title}</td></tr><tr><td>Budget</td><td>${project.budget || ""}</td></tr><tr><td>Phases</td><td>${JSON.stringify(project.phases || [])}</td></tr></table>`;
                        const blob = new Blob(["\ufeff", html], { type: "application/vnd.ms-excel" });
                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(blob);
                        a.download = `project-${project.id}.xls`;
                        document.body.appendChild(a); a.click(); a.remove();
                      }}
                      className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white"
                    >
                      Export Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white"
                    >
                      Export PDF
                    </button>
                  </div>
                </div>

                {applications.length === 0 ? (
                  <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <h2 className="text-xl font-semibold text-slate-900">No proposals yet</h2>
                    <p className="mt-2 text-slate-600">
                      Freelancers have not submitted applications for this project yet.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Freelancer</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Bid</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Days</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Submitted</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {applications.map((item) => (
                          <tr key={item.applicationId} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-4">
                              <p className="font-medium text-slate-900">{item.freelancerName}</p>
                              <p className="text-slate-500">{item.freelancerEmail}</p>
                            </td>
                            <td className="px-4 py-4 text-slate-600">
                              {item.bidAmount ? `$${item.bidAmount}` : "-"}
                            </td>
                            <td className="px-4 py-4 text-slate-600">
                              {item.estimatedDays ?? "-"}
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusClass(item.propStatus)}`}
                              >
                                {item.propStatus || "pending"}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-slate-600">
                              {formatDate(item.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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

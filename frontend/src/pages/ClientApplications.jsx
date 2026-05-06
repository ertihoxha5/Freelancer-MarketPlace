import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchClientApplications, updateClientApplicationStatus } from "../apiServices.js";

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

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default function ClientApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [draftStatus, setDraftStatus] = useState("");

  useEffect(() => {
    let active = true;

    async function loadApplications() {
      setLoading(true);
      setError("");
      try {
        const data = await fetchClientApplications();
        if (active) {
          setApplications(Array.isArray(data.applications) ? data.applications : []);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load applications.");
          setApplications([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadApplications();
    return () => {
      active = false;
    };
  }, []);

  const filteredApplications = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return applications.filter((item) => {
      const matchesStatus = status === "all" || item.propStatus === status;
      const matchesQuery =
        !normalized ||
        item.projectTitle?.toLowerCase().includes(normalized) ||
        item.freelancerName?.toLowerCase().includes(normalized) ||
        item.coverLetter?.toLowerCase().includes(normalized);
      return matchesStatus && matchesQuery;
    });
  }, [applications, query, status]);

  const summary = useMemo(() => {
    const total = applications.length;
    const pending = applications.filter((item) => item.propStatus === "pending").length;
    const accepted = applications.filter((item) => item.propStatus === "accepted").length;
    const rejected = applications.filter((item) => item.propStatus === "rejected").length;
    return { total, pending, accepted, rejected };
  }, [applications]);

  function openDetails(item) {
    setSelectedApplication(item);
    setDraftStatus(item.propStatus || "pending");
    setStatusError("");
  }

  function closeDetails() {
    setSelectedApplication(null);
    setDraftStatus("");
    setStatusError("");
  }

  async function handleSaveStatus() {
    if (!selectedApplication || !draftStatus) return;
    setSavingStatus(true);
    setStatusError("");
    try {
      const result = await updateClientApplicationStatus(selectedApplication.applicationId, {
        propStatus: draftStatus,
      });
      setApplications((current) =>
        current.map((item) =>
          item.applicationId === selectedApplication.applicationId
            ? { ...item, propStatus: result?.application?.propStatus ?? draftStatus }
            : item,
        ),
      );
      setSelectedApplication((current) =>
        current ? { ...current, propStatus: result?.application?.propStatus ?? draftStatus } : current,
      );
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setSavingStatus(false);
    }
  }

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 min-h-0 w-full p-0">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Client applications</p>
                <h1 className="mt-3 text-3xl font-semibold text-slate-900">Applications</h1>
                <p className="mt-2 max-w-2xl text-slate-600">
                  Review every application submitted to the projects you posted.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm sm:min-w-[18rem]">
                <StatCard label="Total" value={summary.total} />
                <StatCard label="Pending" value={summary.pending} />
                <StatCard label="Accepted" value={summary.accepted} />
                <StatCard label="Rejected" value={summary.rejected} />
              </div>
            </div>

            <div className="mb-6 grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)]">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Search
                </label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Project, freelancer, or cover letter"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-[#1a3c2e] focus:outline-none focus:ring-2 focus:ring-[#1a3c2e]/15"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Application Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-[#1a3c2e] focus:outline-none focus:ring-2 focus:ring-[#1a3c2e]/15"
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {error}
              </div>
            )}

            {loading ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
                Loading applications...
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">No applications found</h2>
                <p className="mt-2 text-slate-600">
                  No freelancer applications match your current filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Project</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Freelancer</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredApplications.map((item) => (
                      <tr key={item.applicationId} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-4">
                          <p className="font-medium text-slate-900">{item.projectTitle || "Untitled project"}</p>
                          <p className="mt-1 text-xs text-slate-500">Project status: {item.projectStatus || "-"}</p>
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          <div>
                            <p className="font-medium text-slate-900">{item.freelancerName || "-"}</p>
                            <p className="text-xs text-slate-500">{item.freelancerEmail || ""}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => openDetails(item)}
                            className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

      {selectedApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex flex-col gap-4 border-b border-slate-200 p-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Application details</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                  {selectedApplication.projectTitle || "Untitled project"}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm font-medium text-slate-700">Change status</label>
                <select
                  value={draftStatus}
                  onChange={(e) => setDraftStatus(e.target.value)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#1a3c2e] focus:outline-none focus:ring-2 focus:ring-[#1a3c2e]/15"
                >
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>
                <button
                  type="button"
                  onClick={handleSaveStatus}
                  disabled={savingStatus || draftStatus === selectedApplication.propStatus}
                  className="rounded-xl bg-[#1a3c2e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#214b38] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingStatus ? "Saving..." : "Save status"}
                </button>
                <button
                  type="button"
                  onClick={closeDetails}
                  className="rounded-full border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid gap-6 p-6 lg:grid-cols-2">
              <div className="space-y-4">
                <Section title="Freelancer">
                  <p className="font-medium text-slate-900">{selectedApplication.freelancerName || "-"}</p>
                  <p className="text-sm text-slate-600">{selectedApplication.freelancerEmail || "-"}</p>
                </Section>

                <Section title="Application info">
                  <DetailRow label="Status" value={selectedApplication.propStatus || "pending"} />
                  <DetailRow label="Bid amount" value={selectedApplication.bidAmount != null ? `$${Number(selectedApplication.bidAmount).toLocaleString()}` : "-"} />
                  <DetailRow label="Estimated days" value={selectedApplication.estimatedDays ?? "-"} />
                  <DetailRow label="Applied on" value={formatDate(selectedApplication.createdAt)} />
                </Section>
              </div>

              <div className="space-y-4">
                <Section title="Project info">
                  <DetailRow
                    label="Budget"
                    value={selectedApplication.projectBudget != null ? `$${Number(selectedApplication.projectBudget).toLocaleString()}` : "-"}
                  />
                  <DetailRow label="Project status" value={selectedApplication.projectStatus || "-"} />
                  <DetailRow label="Deadline" value={formatDate(selectedApplication.projectDeadline)} />
                </Section>

                <Section title="Cover letter">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {selectedApplication.coverLetter || "-"}
                  </p>
                </Section>
              </div>
            </div>

            <div className="border-t border-slate-200 px-6 py-4">
              {statusError && <p className="text-sm text-rose-600">{statusError}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}
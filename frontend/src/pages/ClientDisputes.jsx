import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";

import {
  fetchMyContracts,
  fetchMyContract,
  createContractDispute,
} from "../apiServices.js";
import { exportCSV, exportJSON } from "../utils/export.js";

function formatDate(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleDateString();
}

function StatusBadge({ status }) {
  const styles = {
    open: "bg-amber-100 text-amber-700 border-amber-200",
    under_review: "bg-blue-100 text-blue-700 border-blue-200",
    resolved: "bg-emerald-100 text-emerald-700 border-emerald-200",
    rejected: "bg-rose-100 text-rose-700 border-rose-200",
    escalated: "bg-purple-100 text-purple-700 border-purple-200",
  };
  const label = String(status || "open").replace("_", " ");
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${styles[status] || styles.open}`}>
      {label}
    </span>
  );
}

export default function ClientDisputes() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState("");
  const [reason, setReason] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const contractsData = await fetchMyContracts();
        const contractList = Array.isArray(contractsData.contracts) ? contractsData.contracts : [];
        if (!active) return;
        setContracts(contractList);

        const allDisputes = [];
        for (const c of contractList) {
          try {
            const detail = await fetchMyContract(c.id);
            const ds = detail?.contract?.disputes || [];
            ds.forEach((d) => {
              allDisputes.push({
                ...d,
                contractTitle: c.projectTitle || c.title || `Contract #${c.id}`,
                freelancerName: c.freelancerName || "-",
                contractId: c.id,
              });
            });
          } catch (e) {

          }
        }
        if (active) setDisputes(allDisputes);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load disputes.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return disputes.filter((d) => {
      const matchesStatus = statusFilter === "all" || d.dStatus === statusFilter;
      const matchesQuery =
        !q ||
        (d.reason || "").toLowerCase().includes(q) ||
        (d.contractTitle || "").toLowerCase().includes(q) ||
        (d.freelancerName || "").toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [disputes, query, statusFilter]);

  const stats = useMemo(() => {
    const total = disputes.length;
    const open = disputes.filter((d) => d.dStatus === "open" || d.dStatus === "under_review").length;
    const resolved = disputes.filter((d) => d.dStatus === "resolved").length;
    return { total, open, resolved };
  }, [disputes]);

  const activeContracts = useMemo(
    () => contracts.filter((c) => c.cStatus === "active" || c.cStatus === "draft"),
    [contracts]
  );

  async function handleCreateDispute(e) {
    e.preventDefault();
    if (!selectedContractId || reason.trim().length < 10) return;

    setCreating(true);
    try {
      await createContractDispute(selectedContractId, { reason: reason.trim() });

      const contractsData = await fetchMyContracts();
      const contractList = Array.isArray(contractsData.contracts) ? contractsData.contracts : [];
      setContracts(contractList);

      const allDisputes = [];
      for (const c of contractList) {
        try {
          const detail = await fetchMyContract(c.id);
          const ds = detail?.contract?.disputes || [];
          ds.forEach((d) =>
            allDisputes.push({
              ...d,
              contractTitle: c.projectTitle || c.title || `Contract #${c.id}`,
              freelancerName: c.freelancerName || "-",
              contractId: c.id,
            })
          );
        } catch {}
      }
      setDisputes(allDisputes);

      setShowCreate(false);
      setSelectedContractId("");
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit dispute.");
    } finally {
      setCreating(false);
    }
  }

  function openDisputeDetail(d) {
    setSelectedDispute(d);
  }

  function closeDisputeDetail() {
    setSelectedDispute(null);
  }

  function handleExportCSV() {
    const rows = filtered.map((d) => ({
      id: d.id,
      contract: d.contractTitle,
      freelancer: d.freelancerName,
      status: d.dStatus,
      reason: d.reason,
      created: d.createdAt,
    }));
    exportCSV(rows, "my-disputes");
  }

  function handleExportJSON() {
    exportJSON(filtered, "my-disputes");
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
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Client</p>
                <h1 className="mt-2 text-3xl font-semibold text-slate-900">Disputes</h1>
                <p className="mt-2 max-w-2xl text-slate-600">
                  Manage disputes you have raised on contracts. Create new ones and review resolution status.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowCreate(true)}
                  className="rounded-2xl bg-[#1a3c2e] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2a5c46]"
                >
                  + Raise New Dispute
                </button>
                <button
                  onClick={handleExportCSV}
                  className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
                >
                  Export CSV
                </button>
                <button
                  onClick={handleExportJSON}
                  className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
                >
                  Export JSON
                </button>
              </div>
            </div>

            {}
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs uppercase tracking-widest text-slate-500">Total Disputes</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">{stats.total}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs uppercase tracking-widest text-slate-500">Open / In Review</div>
                <div className="mt-2 text-3xl font-semibold text-amber-600">{stats.open}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs uppercase tracking-widest text-slate-500">Resolved</div>
                <div className="mt-2 text-3xl font-semibold text-emerald-600">{stats.resolved}</div>
              </div>
            </div>

            {error && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
            )}

            {}
            <div className="mb-4 flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search reason, project or freelancer..."
                className="flex-1 rounded-2xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3c2e]/10"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3c2e]/10"
              >
                <option value="all">All statuses</option>
                <option value="open">Open</option>
                <option value="under_review">Under Review</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
                <option value="escalated">Escalated</option>
              </select>
            </div>

            {loading ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500">Loading disputes...</div>
            ) : filtered.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <p className="text-lg font-medium text-slate-700">No disputes found</p>
                <p className="mt-1 text-sm text-slate-500">Raise a dispute from an active contract if needed.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Contract / Project</th>
                      <th className="px-4 py-3 text-left font-semibold">Freelancer</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-left font-semibold">Reason</th>
                      <th className="px-4 py-3 text-left font-semibold">Created</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filtered.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="px-4 py-4 font-medium text-slate-900">{d.contractTitle}</td>
                        <td className="px-4 py-4 text-slate-700">{d.freelancerName}</td>
                        <td className="px-4 py-4"><StatusBadge status={d.dStatus} /></td>
                        <td className="px-4 py-4 text-slate-600 max-w-[320px] truncate">{d.reason}</td>
                        <td className="px-4 py-4 text-slate-500">{formatDate(d.createdAt)}</td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => openDisputeDetail(d)}
                            className="rounded-xl border border-slate-300 px-3 py-1 text-xs font-semibold hover:bg-white"
                          >
                            View details
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

      {}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b px-6 py-4">
              <h2 className="text-xl font-semibold">Raise a Dispute</h2>
              <p className="text-sm text-slate-500">Select the contract and explain the issue.</p>
            </div>
            <form onSubmit={handleCreateDispute} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Contract</label>
                <select
                  value={selectedContractId}
                  onChange={(e) => setSelectedContractId(e.target.value)}
                  className="w-full rounded-2xl border px-4 py-2.5 text-sm"
                  required
                >
                  <option value="">Select a contract...</option>
                  {activeContracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.projectTitle || `Contract #${c.id}`} — {c.freelancerName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Reason / Description</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={5}
                  placeholder="Describe the problem in detail (minimum 10 characters)..."
                  className="w-full rounded-2xl border px-4 py-3 text-sm"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowCreate(false); setReason(""); setSelectedContractId(""); }} className="rounded-2xl border px-5 py-2 text-sm">Cancel</button>
                <button
                  type="submit"
                  disabled={creating || !selectedContractId || reason.trim().length < 10}
                  className="rounded-2xl bg-[#1a3c2e] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {creating ? "Submitting..." : "Submit Dispute"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {}
      {selectedDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">Dispute #{selectedDispute.id}</p>
                <h3 className="text-xl font-semibold">{selectedDispute.contractTitle}</h3>
              </div>
              <button onClick={closeDisputeDetail} className="text-2xl leading-none text-slate-400 hover:text-slate-700">×</button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <StatusBadge status={selectedDispute.dStatus} />
                <span className="text-sm text-slate-500">Raised on {formatDate(selectedDispute.createdAt)}</span>
              </div>

              <div>
                <div className="text-sm font-semibold text-slate-500 mb-1">Reason</div>
                <p className="text-slate-800 whitespace-pre-wrap">{selectedDispute.reason}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-slate-500">Freelancer</div>
                  <div className="font-medium">{selectedDispute.freelancerName}</div>
                </div>
                <div>
                  <div className="text-slate-500">Contract ID</div>
                  <div className="font-medium">#{selectedDispute.contractId}</div>
                </div>
              </div>

              {selectedDispute.resolution && (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
                  <div className="text-sm font-semibold text-emerald-700 mb-1">Resolution</div>
                  <p className="text-emerald-900">{selectedDispute.resolution}</p>
                </div>
              )}
            </div>
            <div className="border-t px-6 py-4 text-right">
              <button onClick={closeDisputeDetail} className="rounded-2xl border px-5 py-2 text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

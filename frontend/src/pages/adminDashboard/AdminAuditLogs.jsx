import { useEffect, useState } from "react";
import Header from "../../components/Header.jsx";
import Sidebar from "../../components/Sidebar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

import {
  fetchAdminAuditLogs,
  deleteAdminAuditLog,
  deleteOldAdminAuditLogs,
} from "../../apiServices.js";

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString();
}

function JsonView({ data, label }) {
  if (!data) return <span className="text-slate-400">null</span>;
  try {
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    return (
      <pre className="bg-slate-100 p-3 rounded text-xs overflow-auto max-h-64">
        {JSON.stringify(parsed, null, 2)}
      </pre>
    );
  } catch {
    return <div className="text-sm">{data}</div>;
  }
}

export default function AdminAuditLogs() {
  const { user } = useAuth();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState({
    entity: "",
    actionPerformed: "",
    fromDate: "",
    toDate: "",
  });

  const [selectedLog, setSelectedLog] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function loadLogs(currentPage = page) {
    setLoading(true);
    setError("");
    try {
      const params = { page: currentPage, limit, ...filters };

      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });
      const data = await fetchAdminAuditLogs(params);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setPage(currentPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit logs.");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs(1);
  }, [filters]);

  async function handleDelete(id) {
    if (!window.confirm("Delete this audit log entry?")) return;
    setDeleting(true);
    try {
      await deleteAdminAuditLog(id);
      await loadLogs(page);
      if (selectedLog && selectedLog.id === id) setSelectedLog(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteOld(days) {
    if (!window.confirm(`Delete all audit logs older than ${days} days? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteOldAdminAuditLogs(days);
      await loadLogs(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk delete failed.");
    } finally {
      setDeleting(false);
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 min-h-0 w-full p-0">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Admin</p>
                <h1 className="mt-2 text-3xl font-semibold text-slate-900">Audit Logs</h1>
                <p className="mt-1 text-sm text-slate-500">System activity and change tracking.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleDeleteOld(30)}
                  disabled={deleting}
                  className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Delete old logs (30)
                </button>
                <button
                  onClick={() => handleDeleteOld(90)}
                  disabled={deleting}
                  className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Delete old logs (90)
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {}
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder={`$Entity (e.g. User, Project)`}
                value={filters.entity}
                onChange={(e) => setFilters({ ...filters, entity: e.target.value })}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm"
              />
              <input
                type="text"
                placeholder={`$Action (e.g. update, create)`}
                value={filters.actionPerformed}
                onChange={(e) => setFilters({ ...filters, actionPerformed: e.target.value })}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm"
              />
              <input
                type="date"
                value={filters.fromDate}
                onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm"
              />
              <input
                type="date"
                value={filters.toDate}
                onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm"
              />
            </div>

            <div className="mb-3 flex justify-between items-center">
              <button
                onClick={() => loadLogs(1)}
                className="rounded-xl border border-slate-300 px-4 py-1.5 text-sm hover:bg-slate-50"
              >
                Apply Filters
              </button>
              <div className="text-sm text-slate-500">
                {total} total logs
              </div>
            </div>

            {loading ? (
              <div className="p-10 text-center text-slate-500">Loading...</div>
            ) : logs.length === 0 ? (
              <div className="rounded-3xl border border-dashed p-10 text-center text-slate-500">
                No audit logs
              </div>
            ) : (
              <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left">ID</th>
                      <th className="px-4 py-3 text-left">Entity</th>
                      <th className="px-4 py-3 text-left">Entity ID</th>
                      <th className="px-4 py-3 text-left">Action</th>
                      <th className="px-4 py-3 text-left">Timestamp</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs">{log.id}</td>
                        <td className="px-4 py-3">{log.entity}</td>
                        <td className="px-4 py-3">{log.entityID}</td>
                        <td className="px-4 py-3">
                          <span className="rounded bg-slate-200 px-2 py-0.5 text-xs">{log.actionPerformed}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{formatDate(log.createdAt)}</td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="rounded border px-2 py-1 text-xs hover:bg-white"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDelete(log.id)}
                            disabled={deleting}
                            className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => loadLogs(page - 1)}
                  className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="text-sm">Page {page} of {totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => loadLogs(page + 1)}
                  className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </section>
        </div>
      </main>

      {}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-3xl border bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-6">
              <div>
                <div className="text-sm text-slate-500">Audit Log #${selectedLog.id}</div>
                <div className="text-xl font-semibold">{selectedLog.entity} #{selectedLog.entityID} — {selectedLog.actionPerformed}</div>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-2xl text-slate-400 hover:text-slate-600">×</button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">Timestamp</div>
                <div>{formatDate(selectedLog.createdAt)}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">Old Value</div>
                  <JsonView data={selectedLog.oldValue} label="Old" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">New Value</div>
                  <JsonView data={selectedLog.newValue} label="New" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t p-6">
              <button onClick={() => setSelectedLog(null)} className="rounded-xl border px-4 py-2 text-sm">Close</button>
              <button
                onClick={() => handleDelete(selectedLog.id)}
                disabled={deleting}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                Delete Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import Header from '../../components/Header.jsx';
import Sidebar from '../../components/Sidebar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

import { useEffect, useState } from 'react';
import { fetchAdminApplications, downloadExport } from '../../apiServices.js';

export default function AdminApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadApplications() {
      setLoading(true);
      setError('');
      try {
        const params = { page: 1, limit: 100 };
        if (filterStatus) params.propStatus = filterStatus;
        const data = await fetchAdminApplications(params);
        if (mounted) {
          setApplications(Array.isArray(data.applications) ? data.applications : []);
          setStatistics(data.statistics || null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load applications.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadApplications();
    return () => { mounted = false; };
  }, [filterStatus]);

  async function handleExport(kind, fmt) {
    try {
      await downloadExport(kind, fmt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.');
    }
  }

  function formatDate(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString();
  }

  function getStatusBadge(status) {
    const statusClasses = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      withdrawn: 'bg-gray-100 text-gray-800',
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
  }

  function openDetails(app) {
    setSelectedApp(app);
    setDetailOpen(true);
  }

  function closeDetails() {
    setDetailOpen(false);
    setSelectedApp(null);
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50">
      <Header />
      <main className="min-h-0 flex-1">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            <div className="mb-8">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Platform activity</p>
              <h1 className="mt-2 text-4xl font-semibold text-slate-900">Applications</h1>
              <p className="mt-2 text-slate-600">
                All freelancer applications (proposals) submitted across projects.
              </p>
            </div>

            {}
            <div className="mb-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Total Applications</div>
                <div className="mt-1 text-3xl font-semibold text-slate-900">
                  {statistics?.totalApplications || applications.length}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm col-span-2">
                <div className="text-sm text-slate-500 mb-2">By Status</div>
                <div className="flex flex-wrap gap-2">
                  {statistics && Object.keys(statistics.byStatus || {}).length > 0 ? (
                    Object.entries(statistics.byStatus).map(([status, count]) => (
                      <span
                        key={status}
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getStatusBadge(status)}`}
                      >
                        {status}: {count}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-400">No data</span>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {}
            <div className="mb-4 flex items-center gap-3">
              <label className="text-sm font-medium text-slate-600">Filter by status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
              <button onClick={() => setFilterStatus('')} className="text-sm text-slate-500 hover:text-slate-700">Clear</button>

              <div className="ml-auto flex gap-2">
                <button onClick={() => handleExport('applications', 'csv')} className="rounded-lg border px-3 py-1 text-sm">Export CSV</button>
                <button onClick={() => handleExport('applications', 'xlsx')} className="rounded-lg border px-3 py-1 text-sm">Export Excel</button>
                <button onClick={() => handleExport('applications', 'json')} className="rounded-lg border px-3 py-1 text-sm">Export JSON</button>
                <button onClick={() => handleExport('applications', 'pdf')} className="rounded-lg border px-3 py-1 text-sm">Export PDF</button>
              </div>
            </div>

            {}
            {loading ? (
              <div className="rounded-2xl border border-slate-200 p-8 text-center text-slate-500">Loading applications...</div>
            ) : applications.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 p-8 text-center text-slate-500">No applications found.</div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Application ID</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Project ID / Title</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Freelancer ID</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Bid</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Submitted</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Client</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {applications.map((app) => (
                      <tr key={app.proposalId} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs text-slate-900">#{app.proposalId}</td>
                        <td className="px-4 py-3">
                          <div className="font-mono text-xs text-slate-500">#{app.projectID}</div>
                          <div className="font-medium text-slate-900 truncate max-w-[220px]">{app.projectTitle}</div>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          #{app.freelancerID}<br />
                          <span className="text-slate-500">{app.freelancerName}</span>
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          ${Number(app.bidAmount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(app.propStatus)}`}>
                            {app.propStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">{formatDate(app.createdAt)}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{app.clientName} (#{app.projectID})</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openDetails(app)}
                            className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium hover:bg-slate-100"
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

            {}
            {detailOpen && selectedApp && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
                  <div className="flex justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-semibold">Application #{selectedApp.proposalId}</h2>
                      <p className="text-sm text-slate-500">Project: {selectedApp.projectTitle} (#{selectedApp.projectID})</p>
                    </div>
                    <button onClick={closeDetails} className="text-2xl text-slate-400 hover:text-slate-600">×</button>
                  </div>

                  <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-slate-500">Freelancer</div>
                        <div>{selectedApp.freelancerName} (#{selectedApp.freelancerID})</div>
                        <div className="text-xs text-slate-500">{selectedApp.freelancerEmail}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">Client</div>
                        <div>{selectedApp.clientName}</div>
                        <div className="text-xs text-slate-500">{selectedApp.clientEmail}</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-slate-500">Bid Amount</div>
                      <div className="text-xl font-semibold">${Number(selectedApp.bidAmount || 0).toFixed(2)} • Est. {selectedApp.estimatedDays || '?'} days</div>
                    </div>

                    <div>
                      <div className="text-slate-500">Status</div>
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium mt-1 ${getStatusBadge(selectedApp.propStatus)}`}>
                        {selectedApp.propStatus}
                      </span>
                    </div>

                    <div>
                      <div className="text-slate-500">Cover Letter</div>
                      <div className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-slate-700 border">
                        {selectedApp.coverLetter || 'No cover letter provided.'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs text-slate-500">
                      <div>Submitted: {formatDate(selectedApp.createdAt)}</div>
                      <div>Updated: {formatDate(selectedApp.updatedAt)}</div>
                      <div>Deleted: {selectedApp.isDeleted ? 'Yes' : 'No'}</div>
                      <div>Project Budget: ${Number(selectedApp.projectBudget || 0).toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button onClick={closeDetails} className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white">
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

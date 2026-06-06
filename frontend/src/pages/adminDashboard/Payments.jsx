import Header from '../../components/Header.jsx';
import Sidebar from '../../components/Sidebar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useEffect, useState } from 'react';
import { fetchAdminPayments, downloadExport } from '../../apiServices.js';

export default function AdminPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadPayments() {
      setLoading(true);
      setError('');
      try {
        const params = { page: 1, limit: 100 };
        if (filterStatus) params.pStatus = filterStatus;
        const data = await fetchAdminPayments(params);
        if (mounted) {
          setPayments(Array.isArray(data.payments) ? data.payments : []);
          setStatistics(data.statistics || null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load payments.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadPayments();
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
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatCurrency(amount, currency = 'USD') {
    return `${currency} ${Number(amount || 0).toFixed(2)}`;
  }

  function getStatusBadge(status) {
    const statusClasses = {
      succeeded: 'bg-green-100 text-green-800',
      processing: 'bg-blue-100 text-blue-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      canceled: 'bg-gray-100 text-gray-800',
      refunded: 'bg-orange-100 text-orange-800',
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
  }

  function openDetails(payment) {
    setSelectedPayment(payment);
    setDetailOpen(true);
  }

  function closeDetails() {
    setDetailOpen(false);
    setSelectedPayment(null);
  }

  const totalVolume = statistics?.totalVolume || 0;
  const totalCount = statistics?.totalPayments || payments.length;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50">
      <Header />
      <main className="min-h-0 flex-1">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            <div className="mb-8">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Platform finance</p>
              <h1 className="mt-2 text-4xl font-semibold text-slate-900">Payments</h1>
              <p className="mt-2 text-slate-600">
                All payment transactions across the platform. Focused on IDs for quick reference.
              </p>
            </div>

            {/* Statistics */}
            <div className="mb-8 grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Total Payments</div>
                <div className="mt-1 text-3xl font-semibold text-slate-900">{totalCount}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Total Volume</div>
                <div className="mt-1 text-3xl font-semibold text-emerald-700">
                  ${Number(totalVolume).toLocaleString()}
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

            {/* Filter */}
            <div className="mb-4 flex items-center gap-3">
              <label className="text-sm font-medium text-slate-600">Filter by status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              >
                <option value="">All</option>
                <option value="succeeded">Succeeded</option>
                <option value="processing">Processing</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="canceled">Canceled</option>
                <option value="refunded">Refunded</option>
              </select>
              <button
                onClick={() => setFilterStatus('')}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Clear
              </button>

              <div className="ml-auto flex gap-2">
                <button onClick={() => handleExport('payments', 'csv')} className="rounded-lg border px-3 py-1 text-sm">Export CSV</button>
                <button onClick={() => handleExport('payments', 'xlsx')} className="rounded-lg border px-3 py-1 text-sm">Export Excel</button>
                <button onClick={() => handleExport('payments', 'json')} className="rounded-lg border px-3 py-1 text-sm">Export JSON</button>
                <button onClick={() => handleExport('payments', 'pdf')} className="rounded-lg border px-3 py-1 text-sm">Export PDF</button>
              </div>
            </div>

            {/* Payments Table - ID focused */}
            {loading ? (
              <div className="rounded-2xl border border-slate-200 p-8 text-center text-slate-500">Loading payments...</div>
            ) : payments.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 p-8 text-center text-slate-500">No payments found.</div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Payment ID</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Contract ID</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Milestone ID</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Amount</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Transaction</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Created</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Client / Freelancer</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs text-slate-900">#{p.id}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">#{p.contractID}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.milestoneID ? `#${p.milestoneID}` : '-'}</td>
                        <td className="px-4 py-3 font-semibold">{formatCurrency(p.amount, p.currency)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(p.pStatus)}`}>
                            {p.pStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[10px] text-slate-500 truncate max-w-[120px]">
                          {p.transactionID || '-'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">{formatDate(p.createdAt)}</td>
                        <td className="px-4 py-3 text-xs">
                          <div>C: #{p.clientID}</div>
                          <div>F: #{p.freelancerID}</div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openDetails(p)}
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

            {/* Details Modal */}
            {detailOpen && selectedPayment && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-2xl font-semibold">Payment #{selectedPayment.id}</h2>
                      <p className="text-sm text-slate-500">Contract #{selectedPayment.contractID}</p>
                    </div>
                    <button onClick={closeDetails} className="text-xl leading-none text-slate-400 hover:text-slate-600">×</button>
                  </div>

                  <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                    <div>
                      <div className="text-slate-500">Amount</div>
                      <div className="font-semibold text-lg">{formatCurrency(selectedPayment.amount, selectedPayment.currency)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Status</div>
                      <span className={`inline-block mt-0.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(selectedPayment.pStatus)}`}>
                        {selectedPayment.pStatus}
                      </span>
                    </div>

                    <div>
                      <div className="text-slate-500">Milestone</div>
                      <div>{selectedPayment.milestoneTitle || '—'} {selectedPayment.milestoneID ? `(ID #${selectedPayment.milestoneID})` : ''}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Project</div>
                      <div>{selectedPayment.projectTitle || '—'}</div>
                    </div>

                    <div>
                      <div className="text-slate-500">Client</div>
                      <div>{selectedPayment.clientName} (#{selectedPayment.clientID})</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Freelancer</div>
                      <div>{selectedPayment.freelancerName} (#{selectedPayment.freelancerID})</div>
                    </div>

                    <div>
                      <div className="text-slate-500">Transaction ID</div>
                      <div className="font-mono text-xs break-all">{selectedPayment.transactionID || '—'}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Milestone Payment Status</div>
                      <div>{selectedPayment.milestonePaymentStatus || '—'}</div>
                    </div>

                    <div className="col-span-2">
                      <div className="text-slate-500">Notes</div>
                      <div className="text-slate-700 whitespace-pre-wrap">{selectedPayment.notes || '—'}</div>
                    </div>

                    <div>
                      <div className="text-slate-500">Created</div>
                      <div>{formatDate(selectedPayment.createdAt)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Updated</div>
                      <div>{formatDate(selectedPayment.updatedAt)}</div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
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

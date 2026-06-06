import Header from '../components/Header.jsx';
import Sidebar from '../components/Sidebar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useEffect, useState } from 'react';
import { fetchFreelancerPayments, fetchFreelancerPayment } from '../apiServices.js';

export default function FreelancerPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [totalEarnings, setTotalEarnings] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadPayments() {
      setLoading(true);
      setError('');
      try {
        const data = await fetchFreelancerPayments({
          page: 1,
          limit: 100,
        });
        if (mounted) {
          setPayments(Array.isArray(data.payments) ? data.payments : []);
          const total = data.payments
            ? data.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
            : 0;
          setTotalEarnings(total);
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

    return () => {
      mounted = false;
    };
  }, []);

  function formatDate(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString();
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

  function getMilestoneStatusBadge(status) {
    const statusClasses = {
      held: 'bg-yellow-100 text-yellow-800',
      released: 'bg-green-100 text-green-800',
      refunded: 'bg-red-100 text-red-800',
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
  }

  async function handleViewDetails(payment) {
    setDetailLoading(true);
    try {
      const data = await fetchFreelancerPayment(payment.id);
      setSelectedPayment(data);
      setDetailOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment details.');
    } finally {
      setDetailLoading(false);
    }
  }

  const filteredPayments = filterStatus
    ? payments.filter((p) => p.pStatus === filterStatus)
    : payments;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50">
      <Header />
      <main className="min-h-0 flex-1">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            <div className="mb-8">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-500">
                Earnings management
              </p>
              <h1 className="mt-2 text-4xl font-semibold text-slate-900">
                My Payments
              </h1>
              <p className="mt-3 max-w-2xl text-slate-600">
                View and manage all your earnings from completed milestones.
              </p>
            </div>

            {error ? (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {/* Summary Cards */}
            <div className="mb-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-6">
                <p className="text-sm font-medium text-slate-600">Total Earnings</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">
                  ${Number(totalEarnings || 0).toFixed(2)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-6">
                <p className="text-sm font-medium text-slate-600">Total Payments</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">
                  {filteredPayments.length}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-6">
                <p className="text-sm font-medium text-slate-600">Pending Release</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">
                  {filteredPayments.filter((p) => p.milestonePaymentStatus === 'held')
                    .length}
                </p>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="mb-6 flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Filter by Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="succeeded">Succeeded</option>
                  <option value="processing">Processing</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
            </div>

            {/* Payments Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />
                </div>
              ) : filteredPayments.length === 0 ? (
                <div className="p-8 text-center text-slate-600">
                  No payments found.
                </div>
              ) : (
                <table className="w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700">
                        Project
                      </th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700">
                        Milestone
                      </th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700">
                        Payment Status
                      </th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-slate-900">
                          #{payment.id}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {payment.projectTitle || '-'}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {payment.milestoneTitle || '-'}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {formatCurrency(payment.amount, payment.currency)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block rounded-full px-3 py-1 font-medium ${getStatusBadge(
                              payment.pStatus
                            )}`}
                          >
                            {payment.pStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {payment.milestonePaymentStatus ? (
                            <span
                              className={`inline-block rounded-full px-3 py-1 font-medium ${getMilestoneStatusBadge(
                                payment.milestonePaymentStatus
                              )}`}
                            >
                              {payment.milestonePaymentStatus}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {formatDate(payment.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleViewDetails(payment)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Detail Modal */}
      {detailOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/10 backdrop-blur-md p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-slate-900">
                Payment #{selectedPayment?.id}
              </h2>
              <button
                onClick={() => setDetailOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {detailLoading ? (
              <div className="flex justify-center py-8">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />
              </div>
            ) : selectedPayment ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      Project
                    </p>
                    <p className="text-slate-900">
                      {selectedPayment.projectTitle || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      Milestone
                    </p>
                    <p className="text-slate-900">
                      {selectedPayment.milestoneTitle || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      Amount
                    </p>
                    <p className="text-2xl font-semibold text-slate-900">
                      {formatCurrency(
                        selectedPayment.amount,
                        selectedPayment.currency
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      Client
                    </p>
                    <p className="text-slate-900">
                      {selectedPayment.clientName} (
                      {selectedPayment.clientEmail})
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      Payment Status
                    </p>
                    <span
                      className={`inline-block rounded-full px-3 py-1 font-medium mt-1 ${getStatusBadge(
                        selectedPayment.pStatus
                      )}`}
                    >
                      {selectedPayment.pStatus}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      Milestone Status
                    </p>
                    <span
                      className={`inline-block rounded-full px-3 py-1 font-medium mt-1 ${getMilestoneStatusBadge(
                        selectedPayment.milestonePaymentStatus || 'held'
                      )}`}
                    >
                      {selectedPayment.milestonePaymentStatus || 'held'}
                    </span>
                  </div>
                </div>

                {selectedPayment.releasedAt && (
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      Released Date
                    </p>
                    <p className="text-slate-900">
                      {formatDate(selectedPayment.releasedAt)}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-slate-600 mb-2">
                    Created
                  </p>
                  <p className="text-slate-600">
                    {formatDate(selectedPayment.createdAt)}
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setDetailOpen(false)}
                    className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

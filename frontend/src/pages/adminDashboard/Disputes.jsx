import Header from '../../components/Header.jsx';
import Sidebar from '../../components/Sidebar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

import { useEffect, useState } from 'react';
import {
    fetchAdminDisputes,
    fetchAdminDispute,
    updateAdminDispute,
    downloadExport,
} from '../../apiServices.js';

export default function Disputes() {
    const { user } = useAuth();
    const [disputes, setDisputes] = useState([]);
    const [filterStatus, setFilterStatus] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedDispute, setSelectedDispute] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');
    const [updating, setUpdating] = useState(false);
    const [updateForm, setUpdateForm] = useState({
        status: 'open',
        resolution: '',
    });

    useEffect(() => {
        let mounted = true;

        async function loadDisputes() {
            setLoading(true);
            setError('');
            try {
                const data = await fetchAdminDisputes(filterStatus || null);
                if (mounted) {
                    setDisputes(Array.isArray(data.disputes) ? data.disputes : []);
                }
            } catch (err) {
                if (mounted) {
                    setError(err instanceof Error ? err.message : 'Failed to load disputes.');
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        loadDisputes();

        return () => {
            mounted = false;
        };
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
            open: 'bg-yellow-100 text-yellow-800',
            in_review: 'bg-blue-100 text-blue-800',
            resolved: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800',
        };
        return statusClasses[status] || 'bg-gray-100 text-gray-800';
    }

    async function handleViewDetails(row) {
        setDetailError('');
        setDetailOpen(true);
        setDetailLoading(true);
        try {
            const data = await fetchAdminDispute(row.id);
            setSelectedDispute(data);
            setUpdateForm({
                status: data.dStatus || 'open',
                resolution: data.resolution || '',
            });
        } catch (err) {
            setDetailError(err instanceof Error ? err.message : 'Failed to load dispute details.');
        } finally {
            setDetailLoading(false);
        }
    }

    async function handleUpdateDispute(e) {
        e.preventDefault();
        if (!selectedDispute) return;

        setUpdating(true);
        setDetailError('');
        try {
            const result = await updateAdminDispute(selectedDispute.id, {
                status: updateForm.status,
                resolution: updateForm.resolution || null,
            });

            // Update disputes list and selected dispute
            setDisputes((prev) =>
                prev.map((d) => (d.id === result.dispute.id ? result.dispute : d))
            );
            setSelectedDispute(result.dispute);
            setDetailError('Dispute updated successfully.');
        } catch (err) {
            setDetailError(err instanceof Error ? err.message : 'Failed to update dispute.');
        } finally {
            setUpdating(false);
        }
    }

    return (
        <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50">
            <Header />
            <main className="min-h-0 flex-1">
                <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
                    <Sidebar roleID={user?.roleID} />
                    <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
                        <div className="mb-8">
                            <p className="text-sm uppercase tracking-[0.25em] text-slate-500">
                                Admin command center
                            </p>
                            <h1 className="mt-2 text-4xl font-semibold text-slate-900">
                                Manage Disputes
                            </h1>
                            <p className="mt-3 max-w-2xl text-slate-600">
                                View and manage contract disputes raised by clients or freelancers.
                            </p>
                        </div>

                        {error ? (
                            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                {error}
                            </div>
                        ) : null}

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
                                    <option value="open">Open</option>
                                    <option value="in_review">In Review</option>
                                    <option value="resolved">Resolved</option>
                                    <option value="rejected">Rejected</option>
                                </select>

                                <div className="ml-4 flex gap-1">
                                  <button onClick={() => handleExport('disputes', 'csv')} className="text-xs border px-2 py-1 rounded">CSV</button>
                                  <button onClick={() => handleExport('disputes', 'xlsx')} className="text-xs border px-2 py-1 rounded">Excel</button>
                                  <button onClick={() => handleExport('disputes', 'pdf')} className="text-xs border px-2 py-1 rounded">PDF</button>
                                </div>
                            </div>
                        </div>

                        {/* Disputes Table */}
                        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                            {loading ? (
                                <div className="p-8 text-center">
                                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />
                                </div>
                            ) : disputes.length === 0 ? (
                                <div className="p-8 text-center text-slate-600">
                                    No disputes found.
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
                                                Raised By
                                            </th>
                                            <th className="px-6 py-3 text-left font-semibold text-slate-700">
                                                Against
                                            </th>
                                            <th className="px-6 py-3 text-left font-semibold text-slate-700">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left font-semibold text-slate-700">
                                                Created
                                            </th>
                                            <th className="px-6 py-3 text-left font-semibold text-slate-700">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {disputes.map((dispute) => (
                                            <tr key={dispute.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-4 text-slate-900">
                                                    #{dispute.id}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600">
                                                    {dispute.projectTitle || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600">
                                                    {dispute.raisedByName || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600">
                                                    {dispute.raisedAgainstName || '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`inline-block rounded-full px-3 py-1 font-medium ${getStatusBadge(
                                                            dispute.dStatus
                                                        )}`}
                                                    >
                                                        {dispute.dStatus.replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600">
                                                    {formatDate(dispute.createdAt)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => handleViewDetails(dispute)}
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
                                Dispute #{selectedDispute?.id}
                            </h2>
                            <button
                                onClick={() => setDetailOpen(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                ✕
                            </button>
                        </div>

                        {detailError ? (
                            <div className={`mb-4 rounded-lg p-3 text-sm ${
                                detailError.includes('successfully')
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                            }`}>
                                {detailError}
                            </div>
                        ) : null}

                        {detailLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />
                            </div>
                        ) : selectedDispute ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm font-medium text-slate-600">
                                            Project
                                        </p>
                                        <p className="text-slate-900">
                                            {selectedDispute.projectTitle || '-'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-600">
                                            Contract ID
                                        </p>
                                        <p className="text-slate-900">
                                            {selectedDispute.contractID || '-'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-600">
                                            Raised By
                                        </p>
                                        <p className="text-slate-900">
                                            {selectedDispute.raisedByName} (
                                            {selectedDispute.raisedByEmail})
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-600">
                                            Against
                                        </p>
                                        <p className="text-slate-900">
                                            {selectedDispute.raisedAgainstName} (
                                            {selectedDispute.raisedAgainstEmail})
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-sm font-medium text-slate-600">
                                        Reason
                                    </p>
                                    <p className="text-slate-900">
                                        {selectedDispute.reason || '-'}
                                    </p>
                                </div>

                                <form onSubmit={handleUpdateDispute} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Status
                                        </label>
                                        <select
                                            value={updateForm.status}
                                            onChange={(e) =>
                                                setUpdateForm({
                                                    ...updateForm,
                                                    status: e.target.value,
                                                })
                                            }
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="open">Open</option>
                                            <option value="in_review">In Review</option>
                                            <option value="resolved">Resolved</option>
                                            <option value="rejected">Rejected</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Resolution Notes
                                        </label>
                                        <textarea
                                            value={updateForm.resolution}
                                            onChange={(e) =>
                                                setUpdateForm({
                                                    ...updateForm,
                                                    resolution: e.target.value,
                                                })
                                            }
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            rows="4"
                                            placeholder="Enter resolution details..."
                                        />
                                    </div>

                                    <div className="flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setDetailOpen(false)}
                                            className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 font-medium"
                                        >
                                            Close
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={updating}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                                        >
                                            {updating ? 'Updating...' : 'Update Dispute'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

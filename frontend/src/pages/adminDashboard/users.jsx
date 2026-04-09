import Header from '../../components/Header.jsx';
import Sidebar from '../../components/Sidebar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useEffect, useState } from 'react';
import { deleteAdminUser, fetchAdminUsers, updateAdminUser } from '../../apiServices.js';

export default function User() {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editOpen, setEditOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [editForm, setEditForm] = useState({
        id: null,
        fullName: '',
    });

    useEffect(() => {
        let mounted = true;

        async function loadUsers() {
            setLoading(true);
            setError('');
            try {
                const data = await fetchAdminUsers();
                if (mounted) {
                    setUsers(Array.isArray(data.users) ? data.users : []);
                }
            } catch (err) {
                if (mounted) {
                    setError(err instanceof Error ? err.message : 'Failed to load users.');
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        loadUsers();

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

    function handleEdit(row) {
        setError('');
        setEditForm({
            id: row.id,
            fullName: row.fullName || '',
        });
        setEditOpen(true);
    }

    async function handleDelete(row) {
        const ok = window.confirm(`Set ${row.fullName || row.email} to inactive?`);
        if (!ok) return;

        setDeletingId(row.id);
        setError('');
        try {
            await deleteAdminUser(row.id);
            // Active list excludes inactive users, so remove it from current state.
            setUsers((prev) => prev.filter((u) => u.id !== row.id));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to inactivate user.');
        } finally {
            setDeletingId(null);
        }
    }

    async function handleEditSubmit(e) {
        e.preventDefault();
        if (!editForm.fullName.trim()) {
            setError('Full name is required.');
            return;
        }

        setSaving(true);
        setError('');
        try {
            const data = await updateAdminUser(editForm.id, {
                fullName: editForm.fullName.trim(),
            });

            setUsers((prev) =>
                prev.map((row) =>
                    row.id === editForm.id
                        ? {
                              ...row,
                              fullName: data.user?.fullName ?? editForm.fullName.trim(),
                          }
                        : row
                )
            );
            setEditOpen(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update user.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="h-screen w-full bg-slate-50 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 min-h-0 w-full p-0">
                <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
                    <Sidebar roleID={user?.roleID} />

                    <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
                        <h1 className="text-3xl font-semibold text-slate-900">Users</h1>

                        {loading ? <p className="mt-6 text-slate-600">Loading users...</p> : null}
                        {error ? <p className="mt-6 text-red-600">{error}</p> : null}

                        {!loading && !error ? (
                            <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
                                <table className="min-w-full divide-y divide-slate-200 text-sm">
                                    <thead className="bg-slate-100">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700">ID</th>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700">Full Name</th>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700">Email</th>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700">Role</th>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700">Created</th>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 bg-white">
                                        {users.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-6 text-center text-slate-500">No users found.</td>
                                            </tr>
                                        ) : (
                                            users.map((row) => (
                                                <tr key={row.id}>
                                                    <td className="px-4 py-3 text-slate-700">{row.id}</td>
                                                    <td className="px-4 py-3 text-slate-700">{row.fullName}</td>
                                                    <td className="px-4 py-3 text-slate-700">{row.email}</td>
                                                    <td className="px-4 py-3 text-slate-700">{row.roleName || row.roleID || '-'}</td>
                                                    <td className="px-4 py-3 text-slate-700">{formatDate(row.createdAt)}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEdit(row)}
                                                                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(row)}
                                                                disabled={deletingId === row.id}
                                                                className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                                                            >
                                                                {deletingId === row.id ? 'Updating...' : 'Delete'}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ) : null}
                    </section>
                </div>
            </main>

            {editOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
                        <h2 className="text-xl font-semibold text-slate-900">Edit User</h2>
                        <form className="mt-4 space-y-4" onSubmit={handleEditSubmit}>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
                                <input
                                    type="text"
                                    value={editForm.fullName}
                                    onChange={(e) =>
                                        setEditForm((prev) => ({ ...prev, fullName: e.target.value }))
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditOpen(false)}
                                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                                >
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
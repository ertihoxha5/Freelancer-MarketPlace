import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchClientProjects, updateClientProject, deleteClientProject } from "../apiServices.js";

export default function ClientProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("any");
  const [deadlineFrom, setDeadlineFrom] = useState("");
  const [deadlineTo, setDeadlineTo] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editForm, setEditForm] = useState({
    id: null,
    title: "",
    pDesc: "",
    budget: "",
    deadline: "",
    pStatus: "pending",
  });

  useEffect(() => {
    let active = true;
    async function loadProjects() {
      setLoading(true);
      setError("");
      try {
        const data = await fetchClientProjects();
        if (active) {
          setProjects(Array.isArray(data.projects) ? data.projects : []);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load projects.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadProjects();
    return () => {
      active = false;
    };
  }, []);

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesQuery =
        !query ||
        project.title?.toLowerCase().includes(query) ||
        project.pDesc?.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "any" || project.pStatus === statusFilter;
      const deadline = project.deadline ? new Date(project.deadline) : null;
      const fromOk = deadlineFrom === "" || (deadline && deadline >= new Date(deadlineFrom));
      const toOk = deadlineTo === "" || (deadline && deadline <= new Date(deadlineTo));
      return matchesQuery && matchesStatus && fromOk && toOk;
    });
  }, [projects, searchQuery, statusFilter, deadlineFrom, deadlineTo]);

  function formatDate(value) {
    if (!value) return "-";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleDateString();
  }

  function openEdit(project) {
    setEditForm({
      id: project.id,
      title: project.title || "",
      pDesc: project.pDesc || "",
      budget: project.budget ?? "",
      deadline: project.deadline ? project.deadline.slice(0, 10) : "",
      pStatus: project.pStatus || "pending",
    });
    setError("");
    setEditOpen(true);
  }

  async function handleEdit(e) {
    e.preventDefault();
    if (!editForm.title.trim()) {
      setError("Project title is required.");
      return;
    }
    setSaving(true);
    try {
      const result = await updateClientProject(editForm.id, {
        title: editForm.title.trim(),
        pDesc: editForm.pDesc.trim(),
        budget: editForm.budget !== "" ? Number(editForm.budget) : null,
        deadline: editForm.deadline || null,
        pStatus: editForm.pStatus,
      });
      setProjects((current) =>
        current.map((project) => (project.id === editForm.id ? { ...project, ...result.project } : project))
      );
      setEditOpen(false);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(project) {
    if (!window.confirm(`Delete project "${project.title}"?`)) return;
    setDeletingId(project.id);
    try {
      await deleteClientProject(project.id);
      setProjects((current) => current.filter((item) => item.id !== project.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 min-h-0 w-full p-0">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-slate-900">My Projects</h1>
                <p className="mt-2 text-slate-600 max-w-2xl">Filter, review, and manage the projects you posted.</p>
              </div>
              <Link to="/client/post-project" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                Post New Project
              </Link>
            </div>

            <div className="grid gap-4 xl:grid-cols-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Title or description"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="any">Any</option>
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Deadline from</label>
                <input
                  type="date"
                  value={deadlineFrom}
                  onChange={(e) => setDeadlineFrom(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Deadline to</label>
                <input
                  type="date"
                  value={deadlineTo}
                  onChange={(e) => setDeadlineTo(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading projects...</div>
            ) : filteredProjects.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">No matching projects found.</div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Title</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Budget</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Deadline</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredProjects.map((project) => (
                      <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-4 text-slate-900 font-medium">{project.title}</td>
                        <td className="px-4 py-4 text-slate-600">{project.budget ? `$${project.budget}` : '-'}</td>
                        <td className="px-4 py-4 text-slate-600">{formatDate(project.deadline)}</td>
                        <td className="px-4 py-4 capitalize text-slate-600">{project.pStatus || '-'}</td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(project)}
                              className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(project)}
                              disabled={deletingId === project.id}
                              className="rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-50"
                            >
                              {deletingId === project.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
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

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900">Edit Project</h2>
              <button onClick={() => setEditOpen(false)} className="text-2xl text-slate-500 hover:text-slate-700">×</button>
            </div>
            <form onSubmit={handleEdit} className="space-y-5 p-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
                <input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                <textarea
                  value={editForm.pDesc}
                  onChange={(e) => setEditForm({ ...editForm, pDesc: e.target.value })}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Budget</label>
                  <input
                    type="number"
                    value={editForm.budget}
                    onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Deadline</label>
                  <input
                    type="date"
                    value={editForm.deadline}
                    onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                <select
                  value={editForm.pStatus}
                  onChange={(e) => setEditForm({ ...editForm, pStatus: e.target.value })}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-3 justify-end">
                <button type="button" onClick={() => setEditOpen(false)} className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import Header from "../../components/Header.jsx";
import Sidebar from "../../components/Sidebar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  fetchProjectsWithoutFreelancer,
  fetchClientList,
  createAdminProject,
  updateAdminProject,
  deleteAdminProject,
} from "../../apiServices.js";

const emptyForm = {
  title: "",
  pDesc: "",
  budget: "",
  deadline: "",
  clientID: "",
  pStatus: "pending",
};

export default function JobsWithoutFreelancer() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [formError, setFormError] = useState("");
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState({ ...emptyForm, id: null });

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [pData, cData] = await Promise.all([
          fetchProjectsWithoutFreelancer(),
          fetchClientList(),
        ]);
        if (alive) {
          setProjects(Array.isArray(pData.projects) ? pData.projects : []);
          setClients(Array.isArray(cData.clients) ? cData.clients : []);
        }
      } catch (err) {
        if (alive)
          setError(err instanceof Error ? err.message : "Failed to load.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  function formatDate(v) {
    if (!v) return "-";
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
  }

  function statusBadge(status) {
    const map = {
      pending: "bg-yellow-100 text-yellow-700",
      active: "bg-green-100 text-green-700",
      completed: "bg-blue-100 text-blue-700",
      cancelled: "bg-red-100 text-red-700",
    };
    return (
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${map[status] ?? "bg-slate-100 text-slate-600"}`}
      >
        {status}
      </span>
    );
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFormError("");
    if (!createForm.clientID) {
      setFormError("Please select a client.");
      return;
    }
    setSaving(true);
    try {
      const data = await createAdminProject({
        title: createForm.title.trim(),
        pDesc: createForm.pDesc.trim(),
        budget: createForm.budget ? Number(createForm.budget) : null,
        deadline: createForm.deadline || null,
        clientID: Number(createForm.clientID),
        pStatus: createForm.pStatus,
      });
      const client = clients.find((c) => c.id === Number(createForm.clientID));
      setProjects((prev) => [
        ...prev,
        {
          ...data.project,
          clientName: client?.fullName ?? "",
          clientEmail: client?.email ?? "",
          proposalCount: 0,
        },
      ]);
      setCreateOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(row) {
    setFormError("");
    setEditForm({
      id: row.id,
      title: row.title || "",
      pDesc: row.pDesc || "",
      budget: row.budget ?? "",
      pStatus: row.pStatus || "pending",
      deadline: row.deadline ? row.deadline.slice(0, 10) : "",
      clientID: row.clientID || "",
    });
    setEditOpen(true);
  }

  async function handleEdit(e) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const data = await updateAdminProject(editForm.id, {
        title: editForm.title.trim(),
        pDesc: editForm.pDesc.trim(),
        budget: editForm.budget !== "" ? Number(editForm.budget) : null,
        deadline: editForm.deadline || null,
        pStatus: editForm.pStatus,
      });
      setProjects((prev) =>
        prev.map((p) => (p.id === editForm.id ? { ...p, ...data.project } : p)),
      );
      setEditOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row) {
    if (!window.confirm(`Delete project "${row.title}"?`)) return;
    setDeletingId(row.id);
    setError("");
    try {
      await deleteAdminProject(row.id);
      setProjects((prev) => prev.filter((p) => p.id !== row.id));
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
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-semibold text-slate-900">
                  Jobs without Freelancer
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Open projects waiting for a freelancer to be assigned.
                </p>
              </div>
              <button
                onClick={() => {
                  setCreateForm(emptyForm);
                  setFormError("");
                  setCreateOpen(true);
                }}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                + New Project
              </button>
            </div>

            {loading && <p className="text-slate-500">Loading…</p>}
            {error && <p className="text-red-600 mb-4">{error}</p>}

            {!loading && (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      {[
                        "ID",
                        "Title",
                        "Description",
                        "Budget",
                        "Status",
                        "Deadline",
                        "Client",
                        "Proposals",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left font-semibold text-slate-700 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {projects.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-8 text-center text-slate-400"
                        >
                          No open projects without a freelancer.
                        </td>
                      </tr>
                    ) : (
                      projects.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-600">{row.id}</td>
                          <td className="px-4 py-3 font-medium text-slate-800 max-w-[120px] truncate">
                            {row.title}
                          </td>
                          <td className="px-4 py-3 text-slate-500 max-w-[160px] truncate">
                            {row.pDesc || "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {row.budget != null
                              ? `$${Number(row.budget).toLocaleString()}`
                              : "-"}
                          </td>
                          <td className="px-4 py-3">
                            {statusBadge(row.pStatus)}
                          </td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            {formatDate(row.deadline)}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800">
                              {row.clientName}
                            </p>
                            <p className="text-xs text-slate-400">
                              {row.clientEmail}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.proposalCount > 0 ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"}`}
                            >
                              {row.proposalCount ?? 0}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => openEdit(row)}
                                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(row)}
                                disabled={deletingId === row.id}
                                className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                              >
                                {deletingId === row.id ? "Deleting…" : "Delete"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

      {createOpen && (
        <Modal title="Create New Project" onClose={() => setCreateOpen(false)}>
          <ProjectForm
            form={createForm}
            onChange={setCreateForm}
            clients={clients}
            showClientField
            error={formError}
            saving={saving}
            submitLabel="Create Project"
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
          />
        </Modal>
      )}
      {editOpen && (
        <Modal
          title={`Edit Project #${editForm.id}`}
          onClose={() => setEditOpen(false)}
        >
          <ProjectForm
            form={editForm}
            onChange={setEditForm}
            clients={clients}
            showClientField={false}
            error={formError}
            saving={saving}
            submitLabel="Save Changes"
            onSubmit={handleEdit}
            onCancel={() => setEditOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ProjectForm({
  form,
  onChange,
  clients,
  showClientField,
  error,
  saving,
  submitLabel,
  onSubmit,
  onCancel,
}) {
  const f = (name, value) => onChange((prev) => ({ ...prev, [name]: value }));
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Title <span className="text-slate-400">(max 20 chars)</span>
        </label>
        <input
          type="text"
          maxLength={20}
          required
          value={form.title}
          onChange={(e) => f("title", e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Description
        </label>
        <textarea
          rows={3}
          maxLength={255}
          value={form.pDesc}
          onChange={(e) => f("pDesc", e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Budget ($)
          </label>
          <input
            type="number"
            min={0}
            value={form.budget}
            onChange={(e) => f("budget", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Deadline
          </label>
          <input
            type="date"
            value={form.deadline}
            onChange={(e) => f("deadline", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Status
        </label>
        <select
          value={form.pStatus}
          onChange={(e) => f("pStatus", e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          {["pending", "active", "completed", "cancelled"].map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>
      {showClientField && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Client
          </label>
          <select
            required
            value={form.clientID}
            onChange={(e) => f("clientID", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <option value="">— Select a client —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName} ({c.email})
              </option>
            ))}
          </select>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

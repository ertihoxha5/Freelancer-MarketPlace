import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { createClientProject } from "../apiServices.js";

const initialPhase = () => ({ title: "", deadline: "", budget: "", description: "" });
const emptyForm = {
  title: "",
  pDesc: "",
  budget: "",
  deadline: "",
  pStatus: "pending",
  category: "Website",
  priority: "normal",
  clientType: "Business",
  phases: [initialPhase(), initialPhase()],
};

function buildPrintableHtml(form, userName) {
  const phaseRows = form.phases
    .filter((phase) => phase.title.trim())
    .map(
      (phase, index) => `
      <h3 style="margin-bottom: 8px;">Phase ${index + 1}: ${phase.title}</h3>
      <p style="margin: 0 0 6px 0;"><strong>Deadline:</strong> ${phase.deadline || '-'}</p>
      <p style="margin: 0 0 6px 0;"><strong>Budget:</strong> ${phase.budget ? '$' + phase.budget : '-'}</p>
      <p style="margin: 0 0 16px 0;">${phase.description || '-'}</p>
    `,
    )
    .join("");

  return `
    <html>
      <head>
        <title>Project Brief</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; padding: 24px; }
          h1 { margin-bottom: 12px; }
          h2 { margin-top: 24px; margin-bottom: 10px; }
          p { margin: 0 0 10px; }
        </style>
      </head>
      <body>
        <h1>Project Brief</h1>
        <p><strong>Prepared for:</strong> ${userName}</p>
        <h2>Project Details</h2>
        <p><strong>Title:</strong> ${form.title || '-'}</p>
        <p><strong>Category:</strong> ${form.category}</p>
        <p><strong>Priority:</strong> ${form.priority}</p>
        <p><strong>Client Type:</strong> ${form.clientType}</p>
        <p><strong>Budget:</strong> ${form.budget ? '$' + form.budget : '-'}</p>
        <p><strong>Deadline:</strong> ${form.deadline || '-'}</p>
        <p><strong>Status:</strong> ${form.pStatus}</p>
        <h2>Description</h2>
        <p>${form.pDesc || '-'}</p>
        <h2>Phases</h2>
        ${phaseRows || '<p>No phases planned yet.</p>'}
      </body>
    </html>
  `;
}

function downloadFile(filename, blob) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

export default function ClientPostProject() {
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updatePhase(index, field, value) {
    setForm((current) => {
      const phases = [...current.phases];
      phases[index] = { ...phases[index], [field]: value };
      return { ...current, phases };
    });
  }

  function addPhase() {
    if (form.phases.length >= 6) return;
    setForm((current) => ({ ...current, phases: [...current.phases, initialPhase()] }));
  }

  function buildPhaseDescription() {
    return form.phases
      .filter((phase) => phase.title.trim())
      .map(
        (phase, index) =>
          `Phase ${index + 1}: ${phase.title}\nDeadline: ${phase.deadline || '-'}\nBudget: ${phase.budget ? '$' + phase.budget : '-'}\nDescription: ${phase.description || '-'}\n`,
      )
      .join("\n");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!form.title.trim()) {
      setError("Project title is required.");
      return;
    }

    setSaving(true);
    try {
      await createClientProject({
        title: form.title.trim(),
        pDesc: [form.pDesc.trim(), buildPhaseDescription()].filter(Boolean).join("\n\n"),
        budget: form.budget ? Number(form.budget) : null,
        deadline: form.deadline || null,
        pStatus: form.pStatus,
      });
      setForm(emptyForm);
      alert("Project posted successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function exportCsv() {
    const rows = [
      [
        "Title",
        "Category",
        "Priority",
        "Client Type",
        "Budget",
        "Deadline",
        "Status",
        "Description",
        "Phases",
      ],
      [
        form.title,
        form.category,
        form.priority,
        form.clientType,
        form.budget,
        form.deadline,
        form.pStatus,
        form.pDesc,
        form.phases
          .filter((phase) => phase.title.trim())
          .map(
            (phase, index) =>
              `Phase ${index + 1}: ${phase.title} | Deadline: ${phase.deadline || '-'} | Budget: ${phase.budget || '-'} | Desc: ${phase.description || '-'} `,
          )
          .join(" ; "),
      ],
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    downloadFile("project-brief.csv", new Blob([csv], { type: "text/csv" }));
  }

  function exportWord() {
    const html = buildPrintableHtml(form, user?.fullName ?? "Client");
    const blob = new Blob(["\ufeff", html], { type: "application/msword" });
    downloadFile("project-brief.doc", blob);
  }

  function exportPdf() {
    const html = buildPrintableHtml(form, user?.fullName ?? "Client");
    const newWindow = window.open("", "_blank");
    if (!newWindow) {
      alert("Please allow popups to export as PDF.");
      return;
    }
    newWindow.document.write(html);
    newWindow.document.close();
    newWindow.print();
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
                <h1 className="text-3xl font-semibold text-slate-900">Post a Project</h1>
                <p className="mt-2 text-slate-600 max-w-2xl">Create a detailed brief with phase planning and export it to keep your team aligned.</p>
              </div>
              <Link to="/client/projects" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                View My Projects
              </Link>
            </div>

            <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

              <div className="grid gap-4 xl:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Title *</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Project title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option>Website</option>
                    <option>Mobile App</option>
                    <option>Branding</option>
                    <option>Marketing</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                <textarea
                  value={form.pDesc}
                  onChange={(e) => setForm({ ...form, pDesc: e.target.value })}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the project requirements."
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                  <select
                    value={form.pStatus}
                    onChange={(e) => setForm({ ...form, pStatus: e.target.value })}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Budget ($)</label>
                  <input
                    type="number"
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: e.target.value })}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Deadline</label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Client type</label>
                  <select
                    value={form.clientType}
                    onChange={(e) => setForm({ ...form, clientType: e.target.value })}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Business">Business</option>
                    <option value="Personal">Personal</option>
                    <option value="Startup">Startup</option>
                    <option value="Non-profit">Non-profit</option>
                  </select>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Project Phases</h2>
                    <p className="text-sm text-slate-500">Add up to 6 detailed phases for this brief.</p>
                  </div>
                  <button type="button" onClick={addPhase} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">+ Add Phase</button>
                </div>
                <div className="space-y-4">
                  {form.phases.map((phase, index) => (
                    <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900">Phase {index + 1}</p>
                          <p className="text-sm text-slate-500">Define the scope and timing for this step.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setForm((current) => ({ ...current, phases: current.phases.filter((_, idx) => idx !== index) }))}
                          className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-200"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid gap-4 xl:grid-cols-2 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
                          <input
                            value={phase.title}
                            onChange={(e) => updatePhase(index, 'title', e.target.value)}
                            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Deadline</label>
                          <input
                            type="date"
                            value={phase.deadline}
                            onChange={(e) => updatePhase(index, 'deadline', e.target.value)}
                            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div className="grid gap-4 xl:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Budget</label>
                          <input
                            type="number"
                            value={phase.budget}
                            onChange={(e) => updatePhase(index, 'budget', e.target.value)}
                            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                          <textarea
                            rows={2}
                            value={phase.description}
                            onChange={(e) => updatePhase(index, 'description', e.target.value)}
                            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 justify-between items-center">
                <div className="text-sm text-slate-500">Export your brief before posting or update it later.</div>
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={exportCsv} className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">Export CSV</button>
                  <button type="button" onClick={exportWord} className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">Export Word</button>
                  <button type="button" onClick={exportPdf} className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">Export PDF</button>
                  <button type="submit" disabled={saving} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">{saving ? 'Posting...' : 'Post Project'}</button>
                </div>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}

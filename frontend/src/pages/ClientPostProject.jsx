import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { createClientProject, fetchPublicCategories } from "../apiServices.js";
import { exportCSV, exportJSON } from "../utils/export.js";

const initialPhase = () => ({ title: "", deadline: "", budget: "", description: "" });
const emptyForm = {
  title: "",
  pDesc: "",
  budget: "",
  maxFreelancers: "1",
  deadline: "",
  pStatus: "pending",
  categoryID: "",
  priority: "normal",
  clientType: "Business",
  experienceLevel: "Intermediate",
  skills: "",
  projectType: "Milestone-based",
  phases: [],
};

const EXTRA_FIELDS = [
  { key: "priority", label: "Priority" },
  { key: "clientType", label: "Client type" },
  { key: "experienceLevel", label: "Experience level" },
  { key: "projectType", label: "Project type" },
];

function buildPrintableHtml(form, userName, categoryLabel) {
  const phaseRows = form.phases
    .filter((phase) => phase.title.trim())
    .map(
      (phase, index) => `
      <h3 style="margin-bottom: 8px;">Phase ${index + 1}: ${phase.title}</h3>
      <p style="margin: 0 0 6px 0;"><strong>Deadline:</strong> ${phase.deadline || "-"}</p>
      <p style="margin: 0 0 6px 0;"><strong>Budget:</strong> ${phase.budget ? "$" + phase.budget : "-"}</p>
      <p style="margin: 0 0 16px 0;">${phase.description || "-"}</p>
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
        <p><strong>Title:</strong> ${form.title || "-"}</p>
        <p><strong>Category:</strong> ${categoryLabel || "-"}</p>
        <p><strong>Priority:</strong> ${form.priority}</p>
        <p><strong>Client Type:</strong> ${form.clientType}</p>
        <p><strong>Budget:</strong> ${form.budget ? "$" + form.budget : "-"}</p>
        <p><strong>Deadline:</strong> ${form.deadline || "-"}</p>
        <p><strong>Status:</strong> ${form.pStatus}</p>
        <h2>Description</h2>
        <p>${form.pDesc || "-"}</p>
        <h2>Phases</h2>
        ${phaseRows || "<p>No phases planned yet.</p>"}
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

function flattenCategories(nodes, depth = 0, output = []) {
  if (!Array.isArray(nodes)) return output;
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    output.push({
      id: node.id,
      cName: node.cName || node.name || "Uncategorized",
      depth,
    });
    const children =
      node.children || node.subcategories || node.items || node.subCategories || [];
    if (Array.isArray(children) && children.length > 0) {
      flattenCategories(children, depth + 1, output);
    }
  }
  return output;
}

export default function ClientPostProject() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [phasesEnabled, setPhasesEnabled] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchPublicCategories()
      .then((data) => {
        if (!alive) return;
        const flat = flattenCategories(Array.isArray(data.categories) ? data.categories : []);
        setCategories(flat);
        setForm((current) =>
          current.categoryID || flat.length === 0
            ? current
            : { ...current, categoryID: String(flat[0].id) },
        );
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Unable to load categories.");
      })
      .finally(() => {
        if (alive) setLoadingCategories(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const selectedCategory = useMemo(
    () => categories.find((category) => String(category.id) === String(form.categoryID)),
    [categories, form.categoryID],
  );

  function updatePhase(index, field, value) {
    setForm((current) => {
      const phases = [...current.phases];
      phases[index] = { ...phases[index], [field]: value };
      return { ...current, phases };
    });
  }

  function addPhase() {
    const currentPhases = form.phases || [];
    if (currentPhases.length >= 10) return;
    setForm((current) => ({ ...current, phases: [...(current.phases || []), initialPhase()] }));
  }

  function getActivePhases() {
    return (form.phases || []).filter((phase) => (phase.title || "").trim());
  }

  function buildPhaseDescription() {
    const active = getActivePhases();
    if (!active.length) return "";
    return active
      .map(
        (phase, index) =>
          `Phase ${index + 1}: ${phase.title}\nDeadline: ${phase.deadline || "-"}\nBudget: ${phase.budget ? "$" + phase.budget : "-"}\nDescription: ${phase.description || "-"}\n`,
      )
      .join("\n");
  }

  function buildRichDescription() {
    const meta = [];
    if (form.experienceLevel) meta.push(`Experience Level: ${form.experienceLevel}`);
    if (form.skills) meta.push(`Required Skills: ${form.skills}`);
    if (form.projectType) meta.push(`Payment / Type: ${form.projectType}`);
    if (form.priority) meta.push(`Priority: ${form.priority}`);
    if (form.clientType) meta.push(`Client Type: ${form.clientType}`);

    const metaBlock = meta.length ? `Brief Details:\n${meta.map((m) => `- ${m}`).join("\n")}\n` : "";
    const phasesBlock = buildPhaseDescription();
    const base = form.pDesc ? form.pDesc.trim() : "";

    return [base, metaBlock, phasesBlock].filter(Boolean).join("\n\n");
  }

  function getBriefExportData() {
    const activePhases = getActivePhases();
    return {
      title: form.title,
      category: selectedCategory?.cName || "",
      priority: form.priority,
      clientType: form.clientType,
      experienceLevel: form.experienceLevel,
      skills: form.skills,
      projectType: form.projectType,
      budget: form.budget || null,
      deadline: form.deadline || null,
      status: form.pStatus,
      description: form.pDesc,
      phases: activePhases.map((p, i) => ({
        index: i + 1,
        title: p.title,
        deadline: p.deadline || null,
        budget: p.budget ? Number(p.budget) : null,
        description: p.description || "",
      })),
      exportedAt: new Date().toISOString(),
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!form.title.trim()) {
      setError("Project title is required.");
      return;
    }
    if (!form.categoryID) {
      setError("Please select a category.");
      return;
    }

    setSaving(true);
    try {
      const activePhases = phasesEnabled ? getActivePhases() : [];
      await createClientProject({
        title: form.title.trim(),

        pDesc: form.pDesc ? form.pDesc.trim() : "",
        budget: form.budget ? Number(form.budget) : null,
        categoryID: Number(form.categoryID),
        maxFreelancers: form.maxFreelancers ? Number(form.maxFreelancers) : 1,
        deadline: form.deadline || null,
        pStatus: form.pStatus,
        phases: activePhases,
        experienceLevel: form.experienceLevel || null,
        skills: form.skills || null,
        projectType: form.projectType || null,
      });
      setForm({
        ...emptyForm,
        categoryID: categories.length > 0 ? String(categories[0].id) : "",
      });
      setPhasesEnabled(false);
      showToast("Project posted successfully.", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function exportCsv() {
    const data = getBriefExportData();

    const flat = [{
      ...data,
      phases: data.phases.length ? JSON.stringify(data.phases) : "",
    }];
    exportCSV(flat, "project-brief");
  }

  function exportJson() {
    const data = getBriefExportData();
    exportJSON([data], "project-brief");
  }

  function exportExcel() {

    const data = getBriefExportData();
    const activePhases = data.phases;

    let table = `<table border="1" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;">
      <tr><th colspan="2" style="background:#1a3c2e;color:#fff;padding:8px;">Project Brief</th></tr>
      <tr><td><strong>Title</strong></td><td>${data.title || ""}</td></tr>
      <tr><td><strong>Category</strong></td><td>${data.category || ""}</td></tr>
      <tr><td><strong>Priority</strong></td><td>${data.priority}</td></tr>
      <tr><td><strong>Client Type</strong></td><td>${data.clientType}</td></tr>
      <tr><td><strong>Experience Level</strong></td><td>${data.experienceLevel || ""}</td></tr>
      <tr><td><strong>Project Type</strong></td><td>${data.projectType}</td></tr>
      <tr><td><strong>Skills</strong></td><td>${data.skills || ""}</td></tr>
      <tr><td><strong>Budget</strong></td><td>${data.budget ? "$" + data.budget : ""}</td></tr>
      <tr><td><strong>Deadline</strong></td><td>${data.deadline || ""}</td></tr>
      <tr><td><strong>Status</strong></td><td>${data.status}</td></tr>
      <tr><td><strong>Description</strong></td><td>${(data.description || "").replace(/</g, "&lt;")}</td></tr>
    </table>`;

    if (activePhases.length) {
      table += `<br/><table border="1" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;">
        <tr style="background:#f1f5f9;"><th>#</th><th>Title</th><th>Deadline</th><th>Budget</th><th>Description</th></tr>`;
      activePhases.forEach((ph, i) => {
        table += `<tr>
          <td>${i + 1}</td>
          <td>${ph.title || ""}</td>
          <td>${ph.deadline || ""}</td>
          <td>${ph.budget ? "$" + ph.budget : ""}</td>
          <td>${(ph.description || "").replace(/</g, "&lt;")}</td>
        </tr>`;
      });
      table += `</table>`;
    }

    const blob = new Blob(["\ufeff", table], { type: "application/vnd.ms-excel" });
    downloadFile("project-brief.xls", blob);
  }

  function exportPdf() {
    const html = buildPrintableHtml(form, user?.fullName ?? "Client", selectedCategory?.cName);
    const newWindow = window.open("", "_blank");
    if (!newWindow) {
      showToast("Please allow popups to export as PDF.", "warning");
      return;
    }
    newWindow.document.write(html);
    newWindow.document.close();
    newWindow.print();
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50">
      <Header />
      <main className="min-h-0 flex-1 w-full p-0">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-slate-900">Post a Project</h1>
                <p className="mt-2 max-w-2xl text-slate-600">
                  Create a detailed brief with phase planning and export it to keep your team aligned.
                </p>
              </div>
              <Link
                to="/client/projects"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                View My Projects
              </Link>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="grid gap-4 xl:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Title *</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Project title"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Category</label>
                  <select
                    value={form.categoryID}
                    onChange={(e) => setForm({ ...form, categoryID: e.target.value })}
                    disabled={loadingCategories}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                  >
                    <option value="">{loadingCategories ? "Loading categories..." : "Select category"}</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {`${"—".repeat(category.depth)} ${category.cName}`.trim()}
                      </option>
                    ))}
                  </select>
                  {selectedCategory ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Selected: {selectedCategory.cName}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Priority</label>
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
                <label className="mb-2 block text-sm font-medium text-slate-700">Description</label>
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
                  <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
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
                  <label className="mb-2 block text-sm font-medium text-slate-700">Budget ($)</label>
                  <input
                    type="number"
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: e.target.value })}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Max freelancers</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={form.maxFreelancers}
                    onChange={(e) => setForm({ ...form, maxFreelancers: e.target.value })}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Deadline</label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Client type</label>
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
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Experience level</label>
                  <select
                    value={form.experienceLevel}
                    onChange={(e) => setForm({ ...form, experienceLevel: e.target.value })}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Entry">Entry / Junior</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Expert">Expert / Senior</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Project type</label>
                  <select
                    value={form.projectType}
                    onChange={(e) => setForm({ ...form, projectType: e.target.value })}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Fixed">Fixed Price</option>
                    <option value="Hourly">Hourly Rate</option>
                    <option value="Milestone-based">Milestone-based</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Required skills / technologies</label>
                <input
                  value={form.skills}
                  onChange={(e) => setForm({ ...form, skills: e.target.value })}
                  placeholder="e.g. React, Node.js, PostgreSQL, Figma"
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-slate-500">Comma separated. Helps matching freelancers find your project.</p>
              </div>

              {}
              {!phasesEnabled ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                  <div className="mb-2 text-2xl">📋</div>
                  <h3 className="text-base font-semibold text-slate-800">Add project phases?</h3>
                  <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
                    Break the work into clear, trackable phases. This helps freelancers understand scope, timing and budget per step.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setPhasesEnabled(true);

                      if (!form.phases || form.phases.length === 0) {
                        setForm((current) => ({
                          ...current,
                          phases: [initialPhase(), initialPhase()],
                        }));
                      }
                    }}
                    className="mt-4 rounded-2xl bg-[#1a3c2e] px-5 py-2 text-sm font-semibold text-white hover:bg-[#2a5c46]"
                  >
                    + Add project phases
                  </button>
                  <p className="mt-2 text-[11px] text-slate-400">Optional — you can always add them later when editing the project.</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Project Phases</h2>
                      <p className="text-sm text-slate-500">Define up to 10 detailed phases (optional).</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={addPhase}
                        className="rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-700"
                      >
                        + Add Phase
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPhasesEnabled(false);
                          setForm((current) => ({ ...current, phases: [] }));
                        }}
                        className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        Remove phases
                      </button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {(form.phases || []).map((phase, index) => (
                      <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="mb-4 flex items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold text-slate-900">Phase {index + 1}</p>
                            <p className="text-sm text-slate-500">Define the scope and timing for this step.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setForm((current) => ({
                                ...current,
                                phases: current.phases.filter((_, idx) => idx !== index),
                              }))
                            }
                            className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-200"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="mb-4 grid gap-4 xl:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">Title</label>
                            <input
                              value={phase.title}
                              onChange={(e) => updatePhase(index, "title", e.target.value)}
                              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">Deadline</label>
                            <input
                              type="date"
                              value={phase.deadline}
                              onChange={(e) => updatePhase(index, "deadline", e.target.value)}
                              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        <div className="grid gap-4 xl:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">Budget</label>
                            <input
                              type="number"
                              value={phase.budget}
                              onChange={(e) => updatePhase(index, "budget", e.target.value)}
                              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">Description</label>
                            <textarea
                              rows={2}
                              value={phase.description}
                              onChange={(e) => updatePhase(index, "description", e.target.value)}
                              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!form.phases || form.phases.length === 0) && (
                      <button type="button" onClick={addPhase} className="text-sm text-[#1a3c2e] underline">+ Add your first phase</button>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-slate-500">
                  Export your brief before posting or update it later.
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={exportCsv}
                    className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={exportJson}
                    className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Export JSON
                  </button>
                  <button
                    type="button"
                    onClick={exportExcel}
                    className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Export Excel
                  </button>
                  <button
                    type="button"
                    onClick={exportPdf}
                    className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Export PDF
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                  >
                    {saving ? "Posting..." : "Post Project"}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}

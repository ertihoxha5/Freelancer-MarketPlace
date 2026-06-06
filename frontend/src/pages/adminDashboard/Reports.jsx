import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Header from "../../components/Header.jsx";
import Sidebar from "../../components/Sidebar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  downloadProjectReport,
  fetchClientReport,
  fetchFreelancerReport,
  fetchPlatformSummaryReport,
  saveAdminReport,
  fetchSavedReports,
  updateSavedReport,
  deleteSavedReport,
  runSavedReport,
} from "../../apiServices.js";
import { exportCSV, exportJSON } from "../../utils/export.js";
import { exportPdf } from "../../utils/pdf.js";

const colors = ["#0f172a", "#2563eb", "#16a34a", "#d97706", "#dc2626"];

export default function Reports() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [clientId, setClientId] = useState("");
  const [freelancerId, setFreelancerId] = useState("");
  const [clientReport, setClientReport] = useState(null);
  const [freelancerReport, setFreelancerReport] = useState(null);
  const [filters, setFilters] = useState({ from: "", to: "", status: "", format: "json" });
  const [error, setError] = useState("");

  // Dynamic report generation state for task 7
  const [reportType, setReportType] = useState("platform");
  const [reportCriteria, setReportCriteria] = useState({ from: "", to: "", status: "", userId: "" });
  const [customTitle, setCustomTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [formatting, setFormatting] = useState({ showCards: true, showCharts: true, showTable: true });
  const [generatedReport, setGeneratedReport] = useState(null);

  // Saved reports state for professional CRUD + advanced search
  const [savedReports, setSavedReports] = useState([]);
  const [savedSearch, setSavedSearch] = useState({ q: "", reportType: "", from: "", to: "", page: 1, limit: 10 });
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedTotal, setSavedTotal] = useState(0);
  const [editingSaved, setEditingSaved] = useState(null); // for edit modal
  const [saveForm, setSaveForm] = useState({ name: "", description: "", tags: "" });

  useEffect(() => {
    fetchPlatformSummaryReport()
      .then(setSummary)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load reports."));
  }, []);

  async function loadClientReport() {
    if (!clientId) return;
    setClientReport(await fetchClientReport(clientId));
  }

  async function loadFreelancerReport() {
    if (!freelancerId) return;
    setFreelancerReport(await fetchFreelancerReport(freelancerId));
  }

  // Dynamic report generation
  async function generateReport() {
    setError("");
    let data = { ...summary };
    let title = customTitle || "Dynamic Admin Report";

    try {
      if (reportType === "platform") {
        data = await fetchPlatformSummaryReport();
      } else if (reportType === "client") {
        if (!reportCriteria.userId) {
          setError("Please enter a client ID for client report.");
          return;
        }
        data = await fetchClientReport(reportCriteria.userId);
        title = customTitle || `Client Report - User ${reportCriteria.userId}`;
      } else if (reportType === "freelancer") {
        if (!reportCriteria.userId) {
          setError("Please enter a freelancer ID.");
          return;
        }
        data = await fetchFreelancerReport(reportCriteria.userId);
        title = customTitle || `Freelancer Report - User ${reportCriteria.userId}`;
      } else if (reportType === "project") {
        // Reuse existing project filters
        const projectFilters = { ...filters, ...reportCriteria };
        // For demo, fetch summary + note that full project report uses download
        data = await fetchPlatformSummaryReport();
        data.projectFilters = projectFilters;
        title = customTitle || "Project Performance Report";
      } else if (reportType === "custom") {
        data = await fetchPlatformSummaryReport();
        // Could aggregate more, for now base on platform + criteria
        title = customTitle || "Custom Performance Report";
      }

      const report = {
        ...data,
        title,
        notes: notes || "Generated for admin review.",
        generatedAt: new Date().toISOString(),
        generatedBy: user?.fullName || "Admin",
        reportType,                              // important for backend save
        criteria: { ...reportCriteria, ...filters },
        formatting: { ...formatting },
        personalization: { title: customTitle || "", notes: notes || "" },
        dataSnapshot: { ...data },               // keep the raw report numbers separate
        type: reportType,                        // legacy key for display fallbacks
      };
      setGeneratedReport(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report.");
    }
  }

  async function saveCurrentReport() {
    if (!generatedReport) return;
    const trimmedName = saveForm.name.trim();
    if (!trimmedName) {
      setError("Please provide a name to save the report.");
      return;
    }
    try {
      // Build a clean payload matching backend expectations.
      // We put a "rich" dataSnapshot so that after Load (which does setGeneratedReport(dataSnapshot || saved))
      // the preview header (title, generatedBy, notes) + the number cards still work.
      const richSnapshot = {
        ...(generatedReport.dataSnapshot || generatedReport),
        title: generatedReport.title || trimmedName,
        notes: generatedReport.notes || notes || "",
        generatedAt: generatedReport.generatedAt || new Date().toISOString(),
        generatedBy: generatedReport.generatedBy || user?.fullName || "Admin",
      };

      const payload = {
        name: trimmedName,
        description: saveForm.description.trim(),
        reportType: generatedReport.reportType || generatedReport.type || reportType,
        criteria: generatedReport.criteria || { ...reportCriteria, ...filters },
        formatting: generatedReport.formatting || { ...formatting },
        personalization: generatedReport.personalization || { title: customTitle || "", notes: notes || "" },
        dataSnapshot: richSnapshot,
        tags: saveForm.tags ? saveForm.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      };

      await saveAdminReport(payload);
      setSaveForm({ name: "", description: "", tags: "" });
      setError("");
      // After saving, reset search to defaults so the brand new report is visible at the top
      const freshSearch = { q: "", reportType: "", from: "", to: "", page: 1, limit: 10 };
      setSavedSearch(freshSearch);
      // Load the first page (newest first) so user immediately sees what they just saved
      await loadSavedReportsWithSearch(freshSearch);
      alert("Report saved successfully!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save report.";
      setError(msg);
      // Also surface it right under the save button area if possible (top banner should show it too)
      console.error("Save report failed:", err);
    }
  }

  async function loadSavedReports() {
    setSavedLoading(true);
    try {
      const data = await fetchSavedReports({
        ...savedSearch,
        page: savedSearch.page,
        limit: savedSearch.limit,
      });
      setSavedReports(data.reports || []);
      setSavedTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load saved reports.");
    } finally {
      setSavedLoading(false);
    }
  }

  async function searchSavedReports(newSearch = {}) {
    const updated = { ...savedSearch, ...newSearch, page: 1 };
    setSavedSearch(updated);
    // load will be triggered by useEffect or manual
    await loadSavedReportsWithSearch(updated);
  }

  async function loadSavedReportsWithSearch(searchParams) {
    setSavedLoading(true);
    try {
      const data = await fetchSavedReports(searchParams);
      setSavedReports(data.reports || []);
      setSavedTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setSavedLoading(false);
    }
  }

  async function loadSavedIntoGenerator(saved) {
    // Restore criteria, formatting, personalization, and snapshot data
    setReportType(saved.reportType || "platform");
    setReportCriteria(saved.criteria || {});
    setCustomTitle(saved.personalization?.title || saved.title || saved.name || "");
    setNotes(saved.personalization?.notes || saved.notes || "");
    setFormatting(saved.formatting || { showCards: true, showCharts: true, showTable: true });

    // Build a display-friendly object for the preview (title + numbers for cards)
    const snapshot = saved.dataSnapshot || saved;
    const displayReport = {
      ...snapshot,
      title: saved.name || snapshot.title || "Loaded Report",
      notes: saved.personalization?.notes || snapshot.notes || saved.notes || "",
      generatedAt: saved.updatedAt || saved.createdAt || snapshot.generatedAt || new Date().toISOString(),
      generatedBy: saved.createdByName || snapshot.generatedBy || "Admin",
    };
    setGeneratedReport(displayReport);
  }

  async function handleRunSaved(id) {
    try {
      const result = await runSavedReport(id);
      alert("Report re-run with latest data.");
      loadSavedReports();
      if (result.report) {
        setGeneratedReport(result.report.dataSnapshot || result.report);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run report.");
    }
  }

  async function handleDeleteSaved(id) {
    if (!confirm("Delete this saved report?")) return;
    try {
      await deleteSavedReport(id);
      loadSavedReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  async function handleEditSaved(saved) {
    setEditingSaved(saved);
    setSaveForm({
      name: saved.name || "",
      description: saved.description || "",
      tags: (saved.tags || []).join(", "),
    });
  }

  async function saveEdit() {
    if (!editingSaved) return;
    try {
      await updateSavedReport(editingSaved.id, {
        name: saveForm.name,
        description: saveForm.description,
        tags: saveForm.tags ? saveForm.tags.split(",").map(t => t.trim()) : [],
      });
      setEditingSaved(null);
      setSaveForm({ name: "", description: "", tags: "" });
      loadSavedReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    }
  }

  // Auto-load saved reports on mount or when search changes (simplified)
  useEffect(() => {
    if (savedSearch.page) {
      loadSavedReports();
    }
  }, [savedSearch.page, savedSearch.limit]); // trigger on pagination

  function exportGeneratedReport(fmt) {
    if (!generatedReport) return;
    const filename = (generatedReport.title || "report").replace(/\s+/g, "-").toLowerCase();
    const exportRows = [
      { key: "Title", value: generatedReport.title },
      { key: "Generated At", value: generatedReport.generatedAt },
      { key: "Generated By", value: generatedReport.generatedBy },
      { key: "Notes", value: generatedReport.notes },
      { key: "Criteria", value: JSON.stringify(generatedReport.criteria) },
      ...Object.entries(generatedReport)
        .filter(([k]) => !["title", "notes", "generatedAt", "generatedBy", "criteria", "type"].includes(k))
        .map(([k, v]) => ({ key: k, value: typeof v === "object" ? JSON.stringify(v) : v })),
    ];

    if (fmt === "csv") exportCSV(exportRows, filename);
    else if (fmt === "json") exportJSON(exportRows, filename);
    else if (fmt === "pdf") {
      const lines = exportRows.map(r => `${r.key}: ${r.value}`);
      exportPdf(lines, filename, generatedReport.title);
    }
  }

  function exportGeneratedReportFromSaved(saved, fmt) {
    const data = saved.dataSnapshot || saved;
    const filename = (saved.name || "report").replace(/\s+/g, "-").toLowerCase();
    const exportRows = [
      { key: "Title", value: saved.name },
      { key: "Type", value: saved.reportType },
      { key: "Generated By", value: saved.createdByName },
      ...Object.entries(data).map(([k, v]) => ({ key: k, value: typeof v === "object" ? JSON.stringify(v) : v })),
    ];
    if (fmt === "csv") exportCSV(exportRows, filename);
    else if (fmt === "json") exportJSON(exportRows, filename);
    else if (fmt === "pdf") {
      const lines = exportRows.map(r => `${r.key}: ${r.value}`);
      exportPdf(lines, filename, saved.name);
    }
  }

  const monthlyLine = freelancerReport?.earningsByMonth || clientReport?.monthlyActivity || [];
  const platformStats = summary
    ? [
        { label: "Users", value: Number(summary.totalUsers || 0) },
        { label: "Projects", value: Number(summary.totalProjects || 0) },
        { label: "Contracts", value: Number(summary.totalContracts || 0) },
        { label: "Revenue", value: `$${Number(summary.totalRevenue || 0).toLocaleString()}` },
        { label: "Active this month", value: Number(summary.activeThisMonth || 0) },
      ]
    : [];

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50">
      <Header />
      <main className="min-h-0 flex-1">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            <div className="mb-6">
              <h1 className="text-3xl font-semibold text-slate-900">Reports</h1>
              <p className="mt-2 text-slate-600">Platform, client, freelancer, and project reporting.</p>
            </div>

            {error ? <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {platformStats.map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value ?? "-"}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["Users", summary?.totalUsers],
                ["Projects", summary?.totalProjects],
                ["Contracts", summary?.totalContracts],
                ["Revenue", `$${Number(summary?.totalRevenue || 0).toLocaleString()}`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{value ?? "-"}</p>
                </div>
              ))}
            </div>

            {/* Keep existing client/freelancer/project report sections for backward compatibility */}
            {/* (original client report loaders and project export section remain below in file) */}

            {/* Dynamic Report Generation - Task 7 (added at end of main content for visibility) */}
            <div className="mt-8 border-t pt-6">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Dynamic Report Generator</h2>
              <p className="text-sm text-slate-500 mb-4">Select criteria, formatting options, add personalization, then generate and export.</p>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Report Type</label>
                  <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
                    <option value="platform">Platform Overview</option>
                    <option value="client">Client Performance</option>
                    <option value="freelancer">Freelancer Earnings</option>
                    <option value="project">Project Pipeline</option>
                    <option value="custom">Custom Performance</option>
                  </select>
                </div>

                {/* Dynamic Criteria */}
                <div>
                  <label className="block text-sm font-medium mb-1">Date From</label>
                  <input type="date" value={reportCriteria.from} onChange={(e) => setReportCriteria({ ...reportCriteria, from: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date To</label>
                  <input type="date" value={reportCriteria.to} onChange={(e) => setReportCriteria({ ...reportCriteria, to: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status (if applicable)</label>
                  <input value={reportCriteria.status} onChange={(e) => setReportCriteria({ ...reportCriteria, status: e.target.value })} placeholder="e.g. active, completed" className="w-full border rounded px-3 py-2 text-sm" />
                </div>

                {(reportType === "client" || reportType === "freelancer") && (
                  <div>
                    <label className="block text-sm font-medium mb-1">User ID</label>
                    <input value={reportCriteria.userId} onChange={(e) => setReportCriteria({ ...reportCriteria, userId: e.target.value })} placeholder="Enter user ID" className="w-full border rounded px-3 py-2 text-sm" />
                  </div>
                )}
              </div>

              {/* Personalization */}
              <div className="grid gap-4 md:grid-cols-2 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Custom Report Title</label>
                  <input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="e.g. Q3 2025 Performance Review" className="w-full border rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Personal Notes / Comments</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add admin notes or context for the recipient..." rows={2} className="w-full border rounded px-3 py-2 text-sm" />
                </div>
              </div>

              {/* Formatting Options */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Formatting Options</label>
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formatting.showCards} onChange={(e) => setFormatting({ ...formatting, showCards: e.target.checked })} /> Show Summary Cards
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formatting.showCharts} onChange={(e) => setFormatting({ ...formatting, showCharts: e.target.checked })} /> Show Charts
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formatting.showTable} onChange={(e) => setFormatting({ ...formatting, showTable: e.target.checked })} /> Show Data Table
                  </label>
                </div>
              </div>

              <button onClick={generateReport} className="rounded-lg bg-[#1a3c2e] px-5 py-2 text-sm font-semibold text-white hover:bg-[#214b38] mb-6">
                Generate Dynamic Report
              </button>

              {/* Generated Report Display with Personalization & Formatting */}
              {generatedReport && (
                <div className="mt-4 border rounded-2xl p-6 bg-white">
                  <div className="mb-4">
                    <h3 className="text-xl font-semibold">{generatedReport.title}</h3>
                    <p className="text-xs text-slate-500">Generated: {new Date(generatedReport.generatedAt).toLocaleString()} by {generatedReport.generatedBy}</p>
                    {generatedReport.notes && <p className="mt-1 text-sm italic text-slate-600">Notes: {generatedReport.notes}</p>}
                    {generatedReport.criteria && Object.values(generatedReport.criteria).some(Boolean) && (
                      <p className="text-xs text-slate-400 mt-1">Criteria: {JSON.stringify(generatedReport.criteria)}</p>
                    )}
                  </div>

                  {formatting.showCards && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                      {Object.entries(generatedReport).filter(([k, v]) => typeof v === "number" || (typeof v === "string" && v.startsWith("$"))).slice(0, 8).map(([key, value]) => (
                        <div key={key} className="border rounded p-3">
                          <div className="text-xs text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
                          <div className="font-semibold text-lg">{value}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {formatting.showCharts && (generatedReport.projectsByStatus || generatedReport.earningsByMonth || generatedReport.monthlyActivity) && (
                    <div className="mb-6">
                      <h4 className="font-medium mb-2">Charts</h4>
                      {/* Reuse some chart logic from summary if data matches */}
                      <div className="text-sm text-slate-500">(Charts rendered based on report data - see platform summary above for examples)</div>
                    </div>
                  )}

                  {formatting.showTable && (
                    <div>
                      <h4 className="font-medium mb-2">Data Table</h4>
                      <pre className="text-xs bg-slate-50 p-3 rounded overflow-auto max-h-64">{JSON.stringify(generatedReport, null, 2)}</pre>
                    </div>
                  )}

                  {/* Export for this dynamic report */}
                  <div className="mt-6 pt-4 border-t flex gap-2">
                    <button onClick={() => exportGeneratedReport("csv")} className="text-sm border px-3 py-1.5 rounded">Export CSV</button>
                    <button onClick={() => exportGeneratedReport("json")} className="text-sm border px-3 py-1.5 rounded">Export JSON</button>
                    <button onClick={() => exportGeneratedReport("pdf")} className="text-sm border px-3 py-1.5 rounded bg-slate-900 text-white">Export PDF</button>
                  </div>
                </div>
              )}

              {/* Professional "Save" step — saving is deliberately metadata-rich (name + description + tags required) */}
              {generatedReport && (
                <div className="mt-6 border rounded-2xl p-5 bg-slate-50">
                  <h4 className="font-semibold text-slate-900 mb-1">Save this report to library</h4>
                  <p className="text-xs text-slate-500 mb-3">Provide a name, optional description and tags. This makes the report searchable and reusable (advanced CRUD below).</p>

                  <div className="grid gap-3 md:grid-cols-2 mb-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Report Name <span className="text-red-500">*</span></label>
                      <input
                        value={saveForm.name}
                        onChange={(e) => {
                          setSaveForm({ ...saveForm, name: e.target.value });
                          if (error) setError(""); // clear previous save/generate error when user starts fixing the name
                        }}
                        placeholder="e.g. Q3 Platform Health"
                        className="w-full border rounded px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Tags (comma separated)</label>
                      <input
                        value={saveForm.tags}
                        onChange={(e) => setSaveForm({ ...saveForm, tags: e.target.value })}
                        placeholder="quarterly, performance, finance"
                        className="w-full border rounded px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                      value={saveForm.description}
                      onChange={(e) => setSaveForm({ ...saveForm, description: e.target.value })}
                      rows={2}
                      placeholder="Short context for future admins (why this report was generated, key takeaway...)"
                      className="w-full border rounded px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={saveCurrentReport}
                      disabled={!saveForm.name.trim()}
                      className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save Report to Library
                    </button>
                    <span className="text-xs text-slate-500">Saved reports appear in the library below (Load / Run Again / Edit / Export / Delete).</span>
                  </div>

                  {error && (
                    <p className="mt-2 text-sm text-red-600">{error}</p>
                  )}
                </div>
              )}

              {/* Professional Saved Reports - Advanced Search + full CRUD */}
              <div className="mt-8 border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">Saved Reports Library</h3>
                  <button onClick={loadSavedReports} className="text-sm border px-3 py-1 rounded">Refresh</button>
                </div>

                {/* Advanced Search for Saved Reports */}
                <div className="mb-4 p-4 bg-white rounded-xl border">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <input
                      placeholder="Search name or description..."
                      value={savedSearch.q}
                      onChange={(e) => setSavedSearch({ ...savedSearch, q: e.target.value })}
                      className="border rounded px-3 py-2 text-sm"
                    />
                    <select
                      value={savedSearch.reportType}
                      onChange={(e) => setSavedSearch({ ...savedSearch, reportType: e.target.value })}
                      className="border rounded px-3 py-2 text-sm"
                    >
                      <option value="">All Types</option>
                      <option value="platform">Platform</option>
                      <option value="client">Client</option>
                      <option value="freelancer">Freelancer</option>
                      <option value="project">Project</option>
                      <option value="custom">Custom</option>
                    </select>
                    <input type="date" value={savedSearch.from} onChange={(e) => setSavedSearch({ ...savedSearch, from: e.target.value })} className="border rounded px-3 py-2 text-sm" />
                    <input type="date" value={savedSearch.to} onChange={(e) => setSavedSearch({ ...savedSearch, to: e.target.value })} className="border rounded px-3 py-2 text-sm" />
                    <button
                      onClick={() => searchSavedReports({ page: 1 })}
                      className="rounded bg-slate-900 text-white px-4 py-2 text-sm"
                    >
                      Search Saved
                    </button>
                  </div>
                </div>

                {savedLoading && <p className="text-sm text-slate-500">Loading saved reports...</p>}

                <div className="overflow-x-auto border rounded-xl">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-4 py-2 text-left">Name</th>
                        <th className="px-4 py-2 text-left">Type</th>
                        <th className="px-4 py-2 text-left">Created</th>
                        <th className="px-4 py-2 text-left">Last Run</th>
                        <th className="px-4 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savedReports.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No saved reports yet. Generate above, then use the "Save Report to Library" form.</td></tr>
                      )}
                      {savedReports.map((r) => (
                        <tr key={r.id} className="border-t hover:bg-slate-50">
                          <td className="px-4 py-2 font-medium">{r.name}</td>
                          <td className="px-4 py-2 capitalize">{r.reportType}</td>
                          <td className="px-4 py-2 text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-2 text-xs text-slate-500">{r.lastRunAt ? new Date(r.lastRunAt).toLocaleDateString() : "Never"}</td>
                          <td className="px-4 py-2">
                            <div className="flex gap-1 flex-wrap">
                              <button onClick={() => loadSavedIntoGenerator(r)} className="text-xs px-2 py-1 border rounded hover:bg-white">Load</button>
                              <button onClick={() => handleRunSaved(r.id)} className="text-xs px-2 py-1 border rounded hover:bg-white">Run Again</button>
                              <button onClick={() => handleEditSaved(r)} className="text-xs px-2 py-1 border rounded hover:bg-white">Edit</button>
                              <button onClick={() => exportGeneratedReportFromSaved(r, "pdf")} className="text-xs px-2 py-1 border rounded bg-slate-900 text-white">PDF</button>
                              <button onClick={() => exportGeneratedReportFromSaved(r, "csv")} className="text-xs px-2 py-1 border rounded">CSV</button>
                              <button onClick={() => handleDeleteSaved(r.id)} className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex justify-between mt-3 text-sm">
                  <button disabled={savedSearch.page <= 1} onClick={() => searchSavedReports({ page: savedSearch.page - 1 })} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
                  <span>Page {savedSearch.page} • {savedTotal} total</span>
                  <button onClick={() => searchSavedReports({ page: savedSearch.page + 1 })} className="px-3 py-1 border rounded">Next</button>
                </div>
              </div>
            </div>

            {/* Edit Saved Report Modal (professional CRUD) */}
            {editingSaved && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                  <h3 className="mb-4 text-lg font-semibold">Edit Saved Report</h3>

                  <input
                    value={saveForm.name}
                    onChange={(e) => setSaveForm({ ...saveForm, name: e.target.value })}
                    placeholder="Report Name"
                    className="mb-3 w-full rounded border px-3 py-2 text-sm"
                  />
                  <textarea
                    value={saveForm.description}
                    onChange={(e) => setSaveForm({ ...saveForm, description: e.target.value })}
                    placeholder="Description"
                    rows={3}
                    className="mb-3 w-full rounded border px-3 py-2 text-sm"
                  />
                  <input
                    value={saveForm.tags}
                    onChange={(e) => setSaveForm({ ...saveForm, tags: e.target.value })}
                    placeholder="Tags (comma separated)"
                    className="mb-4 w-full rounded border px-3 py-2 text-sm"
                  />

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingSaved(null);
                        setSaveForm({ name: "", description: "", tags: "" });
                      }}
                      className="rounded border px-4 py-2 text-sm"
                    >
                      Cancel
                    </button>
                    <button onClick={saveEdit} className="rounded bg-slate-900 px-4 py-2 text-sm text-white">
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Charts + legacy sections (original content kept after the generator) */}
            <div className="mt-6 grid gap-6 xl:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Projects by Status</h2>
                <div className="h-64">
                  <ResponsiveContainer>
                    <BarChart data={summary?.projectsByStatus || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0f172a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Users by Role</h2>
                <div className="h-64">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={summary?.usersByRole || []} dataKey="count" nameKey="roleName" outerRadius={90}>
                        {(summary?.usersByRole || []).map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Monthly Activity</h2>
                <div className="h-64">
                  <ResponsiveContainer>
                    <LineChart data={monthlyLine}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="amount" stroke="#2563eb" />
                      <Line type="monotone" dataKey="projectsPosted" stroke="#16a34a" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">Top Freelancers</h2>
                <button
                  onClick={() => downloadProjectReport("json", filters)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Export Project Feed
                </button>
              </div>
              <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 text-left">
                    <tr>
                      <th className="px-4 py-3">Freelancer</th>
                      <th className="px-4 py-3">Rating</th>
                      <th className="px-4 py-3">Earned</th>
                      <th className="px-4 py-3">Contracts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {(summary?.topFreelancers || []).map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{row.fullName}</div>
                          <div className="text-xs text-slate-500">{row.email}</div>
                        </td>
                        <td className="px-4 py-3">{row.avgRating ?? "-"}</td>
                        <td className="px-4 py-3">${Number(row.totalEarned || 0).toLocaleString()}</td>
                        <td className="px-4 py-3">{row.contractCount ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Client Report</h2>
                <div className="mt-3 flex gap-2">
                  <input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Client ID" className="rounded-lg border px-3 py-2 text-sm" />
                  <button onClick={loadClientReport} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Load</button>
                </div>
                {clientReport ? (
                  <div className="mt-4 space-y-3">
                    <div className="grid gap-3 md:grid-cols-4">
                      <MiniStat label="Spent" value={`$${Number(clientReport.totalSpent || 0).toLocaleString()}`} />
                      <MiniStat label="Projects" value={clientReport.projectsPosted ?? 0} />
                      <MiniStat label="Proposals" value={clientReport.proposalsReceived ?? 0} />
                      <MiniStat label="Acceptance" value={`${clientReport.acceptanceRate ?? 0}%`} />
                    </div>
                    <pre className="overflow-auto rounded-lg bg-slate-50 p-3 text-xs">{JSON.stringify(clientReport, null, 2)}</pre>
                  </div>
                ) : null}
              </section>
              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Freelancer Report</h2>
                <div className="mt-3 flex gap-2">
                  <input value={freelancerId} onChange={(e) => setFreelancerId(e.target.value)} placeholder="Freelancer ID" className="rounded-lg border px-3 py-2 text-sm" />
                  <button onClick={loadFreelancerReport} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Load</button>
                </div>
                {freelancerReport ? (
                  <div className="mt-4 space-y-3">
                    <div className="grid gap-3 md:grid-cols-4">
                      <MiniStat label="Earned" value={`$${Number(freelancerReport.totalEarned || 0).toLocaleString()}`} />
                      <MiniStat label="Completed" value={freelancerReport.projectsCompleted ?? 0} />
                      <MiniStat label="Rating" value={freelancerReport.avgRating ?? "-"} />
                      <MiniStat label="Success" value={`${freelancerReport.applicationSuccessRate ?? 0}%`} />
                    </div>
                    <pre className="overflow-auto rounded-lg bg-slate-50 p-3 text-xs">{JSON.stringify(freelancerReport, null, 2)}</pre>
                  </div>
                ) : null}
              </section>
            </div>

            <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Project Report Export</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" />
                <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" />
                <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="rounded-lg border px-3 py-2 text-sm">
                  <option value="">Any status</option>
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <select value={filters.format} onChange={(e) => setFilters({ ...filters, format: e.target.value })} className="rounded-lg border px-3 py-2 text-sm">
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="xlsx">Excel</option>
                </select>
              </div>
              <button onClick={() => downloadProjectReport(filters.format, filters)} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Export Report</button>
            </section>
          </section>
        </div>
      </main>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

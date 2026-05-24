import { useState } from "react";
import Header from "../../components/Header.jsx";
import Sidebar from "../../components/Sidebar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { downloadExport, importFile } from "../../apiServices.js";

const categories = [
  ["projects", "Projects"],
  ["applications", "Applications"],
  ["users", "Users"],
  ["contracts", "Contracts"],
  ["freelancers", "Freelancers"],
];

export default function ExportImport() {
  const { user } = useAuth();
  const [format, setFormat] = useState("csv");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const [importKind, setImportKind] = useState("users");

  async function handleExport(kind) {
    setBusy(kind);
    setMessage("");
    try {
      await downloadExport(kind, format);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setBusy("");
    }
  }

  async function handleImport(event) {
    event.preventDefault();
    if (!file) return;
    setBusy(`import-${importKind}`);
    setMessage("");
    try {
      const result = await importFile(importKind, file);
      setMessage(`${result.message} Created: ${result.created ?? 0}`);
      setFile(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50">
      <Header />
      <main className="min-h-0 flex-1">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold text-slate-900">Export/Import</h1>
                <p className="mt-2 text-slate-600">Download operational data or bulk import records.</p>
              </div>
              <select value={format} onChange={(e) => setFormat(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="csv">CSV</option>
                <option value="xlsx">Excel</option>
                <option value="json">JSON</option>
              </select>
            </div>

            {message ? <div className="mb-5 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">{message}</div> : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {categories.map(([kind, label]) => (
                <div key={kind} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">{label}</h2>
                  <p className="mt-2 text-sm text-slate-500">Export as {format.toUpperCase()}.</p>
                  <button
                    onClick={() => handleExport(kind)}
                    disabled={busy === kind}
                    className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {busy === kind ? "Exporting..." : "Export"}
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleImport} className="mt-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Bulk Import</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <select value={importKind} onChange={(e) => setImportKind(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="users">Users</option>
                  <option value="projects">Projects</option>
                </select>
                <input type="file" accept=".csv,.json" onChange={(e) => setFile(e.target.files?.[0] || null)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <button disabled={!file || Boolean(busy)} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {busy.startsWith("import") ? "Importing..." : "Import"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}

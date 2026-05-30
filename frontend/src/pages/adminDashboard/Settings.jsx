import { useEffect, useMemo, useState } from "react";
import Header from "../../components/Header.jsx";
import Sidebar from "../../components/Sidebar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { fetchAdminSettings, updateAdminSettings } from "../../apiServices.js";

const DEFAULT_ROWS = [
  {
    sKey: "platformName",
    sValue: "Freelancer MarketPlace",
    sDesc: "Public platform name",
    group: "Brand & Homepage",
  },
  {
    sKey: "landingHeadline",
    sValue: "Hire exceptional talent",
    sDesc: "Homepage hero heading",
    group: "Brand & Homepage",
  },
  {
    sKey: "landingSubheadline",
    sValue: "Connect with verified freelancers and deliver projects with confidence.",
    sDesc: "Homepage hero subheading",
    group: "Brand & Homepage",
  },
  {
    sKey: "supportEmail",
    sValue: "support@example.com",
    sDesc: "Support contact email",
    group: "Access & Support",
  },
  {
    sKey: "commissionRate",
    sValue: "10",
    sDesc: "Platform commission percent",
    group: "Billing & Growth",
  },
  {
    sKey: "allowNewRegistrations",
    sValue: "true",
    sDesc: "Allow new users to register",
    group: "Access & Support",
  },
  {
    sKey: "maxFeaturedFreelancers",
    sValue: "6",
    sDesc: "Number of featured freelancers on the homepage",
    group: "Billing & Growth",
  },
  {
    sKey: "defaultProjectFreelancers",
    sValue: "1",
    sDesc: "Default number of freelancers per project",
    group: "Project Workflow",
  },
];

const GROUPS = [
  "Brand & Homepage",
  "Access & Support",
  "Billing & Growth",
  "Project Workflow",
];

function cloneDefaults() {
  return DEFAULT_ROWS.map((row) => ({ ...row }));
}

export default function Settings() {
  const { user } = useAuth();
  const [items, setItems] = useState(cloneDefaults());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;
    fetchAdminSettings()
      .then((data) => {
        if (!alive) return;
        const incoming = Array.isArray(data.settings) ? data.settings : [];
        const merged = DEFAULT_ROWS.map((row) => {
          const match = incoming.find((item) => item.sKey === row.sKey);
          return match
            ? { ...row, ...match, group: row.group }
            : { ...row };
        });
        const extras = incoming
          .filter((item) => !DEFAULT_ROWS.some((row) => row.sKey === item.sKey))
          .map((item) => ({ ...item, group: "Custom" }));
        setItems([...merged, ...extras]);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load settings."))
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const groupedItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = items.filter((item) => {
      if (!q) return true;
      return [item.sKey, item.sValue, item.sDesc, item.group]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });

    return GROUPS.concat("Custom").map((group) => ({
      group,
      items: filtered.filter((item) => (item.group || "Custom") === group),
    }));
  }, [items, search]);

  const summary = useMemo(() => {
    const platformName = items.find((item) => item.sKey === "platformName")?.sValue || "Freelancer MarketPlace";
    const supportEmail = items.find((item) => item.sKey === "supportEmail")?.sValue || "support@example.com";
    const enabledCount = items.filter((item) => String(item.sValue).toLowerCase() === "true").length;
    return { platformName, supportEmail, enabledCount };
  }, [items]);

  function updateItem(index, field, value) {
    setItems((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    );
  }

  function addSetting() {
    setItems((current) => [
      ...current,
      {
        sKey: "",
        sValue: "",
        sDesc: "",
        group: "Custom",
      },
    ]);
  }

  function removeSetting(index) {
    setItems((current) => current.filter((_, rowIndex) => rowIndex !== index));
  }

  function resetDefaults() {
    setItems(cloneDefaults());
    setMessage("Restored the default settings list.");
  }

  async function save() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const payload = {
        items: items
          .filter((item) => item.sKey.trim())
          .map((item) => ({
            sKey: item.sKey.trim(),
            sValue: String(item.sValue ?? "").trim(),
            sDesc: String(item.sDesc ?? "").trim(),
          })),
      };
      await updateAdminSettings(payload);
      setMessage("Settings saved to the database.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50">
      <Header />
      <main className="min-h-0 flex-1">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-slate-500">System configuration</p>
                <h1 className="mt-2 text-4xl font-semibold text-slate-900">System Settings</h1>
                <p className="mt-3 max-w-2xl text-slate-600">
                  Manage the platform identity, homepage text, registration rules, and project defaults. Every value saved here is stored in the database.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Settings" value={items.length} />
                <StatCard label="Enabled" value={summary.enabledCount} />
                <StatCard label="Platform" value={summary.platformName} wide />
                <StatCard label="Support" value={summary.supportEmail} wide />
              </div>
            </div>

            {loading ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500">Loading settings...</div>
            ) : null}
            {message ? (
              <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                {message}
              </div>
            ) : null}
            {error ? (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {!loading ? (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search settings..."
                    className="min-w-0 flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={addSetting}
                      className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Add Setting
                    </button>
                    <button
                      type="button"
                      onClick={resetDefaults}
                      className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Reset Defaults
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={save}
                      className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {saving ? "Saving..." : "Save Settings"}
                    </button>
                  </div>
                </div>

                {groupedItems.map(({ group, items: groupItems }) => (
                  <section key={group} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">{group}</h2>
                        <p className="mt-1 text-sm text-slate-500">
                          {groupItems.length} setting{groupItems.length === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>

                    {groupItems.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                        No matching settings in this group.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {groupItems.map((item) => {
                          const index = items.findIndex(
                            (row) =>
                              row.sKey === item.sKey &&
                              row.group === item.group &&
                              row.sValue === item.sValue,
                          );
                          return (
                            <div
                              key={`${item.group}-${item.sKey}-${index}`}
                              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                            >
                              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">
                                    {item.sKey || "Custom key"}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Stored in the `Settings` table and exposed to the platform runtime.
                                  </p>
                                </div>
                                {!DEFAULT_ROWS.some((row) => row.sKey === item.sKey) ? (
                                  <button
                                    type="button"
                                    onClick={() => removeSetting(index)}
                                    className="rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                                  >
                                    Remove
                                  </button>
                                ) : null}
                              </div>

                              <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                                <div>
                                  <label className="mb-1 block text-sm font-medium text-slate-700">Key</label>
                                  <input
                                    value={item.sKey}
                                    onChange={(e) => updateItem(index, "sKey", e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-sm font-medium text-slate-700">Value</label>
                                  <textarea
                                    value={item.sValue}
                                    onChange={(e) => updateItem(index, "sValue", e.target.value)}
                                    rows={3}
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                                  <input
                                    value={item.sDesc || ""}
                                    onChange={(e) => updateItem(index, "sDesc", e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, wide = false }) {
  return (
    <div
      className={`rounded-3xl border border-slate-200 bg-white p-4 shadow-sm ${
        wide ? "col-span-2" : ""
      }`}
    >
      <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{label}</p>
      <p className="mt-2 truncate text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

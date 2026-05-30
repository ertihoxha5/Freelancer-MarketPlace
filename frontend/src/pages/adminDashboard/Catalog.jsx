import { useEffect, useMemo, useState } from "react";
import Header from "../../components/Header.jsx";
import Sidebar from "../../components/Sidebar.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  createAdminCategory,
  createAdminSkill,
  deleteAdminCategory,
  deleteAdminSkill,
  fetchAdminCategories,
  fetchAdminSkills,
  updateAdminCategory,
  updateAdminSkill,
} from "../../apiServices.js";
import { exportCSV, exportJSON } from "../../utils/export.js";
import { exportPdf } from "../../utils/pdf.js";

const emptyCategory = { cName: "", slug: "", cDesc: "", isActive: true };
const emptySkill = { skillName: "", slug: "", categoryID: "", isActive: true };

function StatusBadge({ active }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 text-xl leading-none text-slate-500 hover:text-slate-900"
            aria-label="Close modal"
          >
            x
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const CATEGORY_COLORS = [
  "bg-sky-50 text-sky-700 border-sky-200",
  "bg-emerald-50 text-emerald-700 border-emerald-200",
  "bg-amber-50 text-amber-700 border-amber-200",
  "bg-rose-50 text-rose-700 border-rose-200",
  "bg-violet-50 text-violet-700 border-violet-200",
  "bg-cyan-50 text-cyan-700 border-cyan-200",
];

function getCategoryColor(index) {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

export default function Catalog() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [skills, setSkills] = useState([]);
  const [activeTab, setActiveTab] = useState("categories");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categoryModal, setCategoryModal] = useState(null);
  const [skillModal, setSkillModal] = useState(null);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [skillForm, setSkillForm] = useState(emptySkill);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  async function loadCatalog() {
    setLoading(true);
    setError("");
    try {
      const [categoryData, skillData] = await Promise.all([
        fetchAdminCategories(true),
        fetchAdminSkills(true),
      ]);
      setCategories(Array.isArray(categoryData.categories) ? categoryData.categories : []);
      setSkills(Array.isArray(skillData.skills) ? skillData.skills : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load catalog.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCatalog();
  }, []);

  const activeCategories = useMemo(
    () => categories.filter((category) => category.isActive),
    [categories],
  );

  const categoryLookup = useMemo(
    () => new Map(categories.map((category) => [String(category.id), category])),
    [categories],
  );

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    return categories.filter((category) => {
      if (statusFilter !== "all" && String(category.isActive) !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return [category.cName, category.slug, category.cDesc]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [categories, search, statusFilter]);

  const filteredSkills = useMemo(() => {
    const q = search.trim().toLowerCase();
    return skills.filter((skill) => {
      if (statusFilter !== "all" && String(skill.isActive) !== statusFilter) {
        return false;
      }
      if (categoryFilter !== "all" && String(skill.categoryID) !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return [skill.skillName, skill.slug, skill.categoryName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [skills, search, statusFilter, categoryFilter]);

  function exportCurrent(format) {
    const rows =
      activeTab === "categories"
        ? filteredCategories.map((category) => ({
            id: category.id,
            name: category.cName,
            slug: category.slug,
            description: category.cDesc,
            status: category.isActive ? "active" : "inactive",
          }))
        : filteredSkills.map((skill) => ({
            id: skill.id,
            skill: skill.skillName,
            category: skill.categoryName,
            slug: skill.slug,
            status: skill.isActive ? "active" : "inactive",
          }));

    const filename =
      activeTab === "categories" ? "categories-export" : "skills-export";

    if (format === "csv") return exportCSV(rows, filename);
    if (format === "json") return exportJSON(rows, filename);
    if (format === "pdf") {
      const lines = rows.map((row) => Object.values(row).join(" | "));
      return exportPdf(lines, filename, activeTab === "categories" ? "Categories Export" : "Skills Export");
    }
    return undefined;
  }

  function openCreateCategory() {
    setCategoryForm(emptyCategory);
    setCategoryModal({ mode: "create" });
  }

  function openEditCategory(category) {
    setCategoryForm({
      cName: category.cName || "",
      slug: category.slug || "",
      cDesc: category.cDesc || "",
      isActive: Boolean(category.isActive),
    });
    setCategoryModal({ mode: "edit", category });
  }

  function openCreateSkill() {
    setSkillForm({
      ...emptySkill,
      categoryID: activeCategories[0]?.id ? String(activeCategories[0].id) : "",
    });
    setSkillModal({ mode: "create" });
  }

  function openEditSkill(skill) {
    setSkillForm({
      skillName: skill.skillName || "",
      slug: skill.slug || "",
      categoryID: String(skill.categoryID || ""),
      isActive: Boolean(skill.isActive),
    });
    setSkillModal({ mode: "edit", skill });
  }

  async function saveCategory(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (categoryModal?.mode === "edit") {
        await updateAdminCategory(categoryModal.category.id, categoryForm);
      } else {
        await createAdminCategory(categoryForm);
      }
      setCategoryModal(null);
      await loadCatalog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save category.");
    } finally {
      setSaving(false);
    }
  }

  async function saveSkill(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...skillForm,
        categoryID: Number(skillForm.categoryID),
      };
      if (skillModal?.mode === "edit") {
        await updateAdminSkill(skillModal.skill.id, payload);
      } else {
        await createAdminSkill(payload);
      }
      setSkillModal(null);
      await loadCatalog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save skill.");
    } finally {
      setSaving(false);
    }
  }

  async function deactivateCategory(category) {
    if (!window.confirm(`Deactivate category "${category.cName}"?`)) return;
    setError("");
    try {
      await deleteAdminCategory(category.id);
      await loadCatalog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate category.");
    }
  }

  async function deactivateSkill(skill) {
    if (!window.confirm(`Deactivate skill "${skill.skillName}"?`)) return;
    setError("");
    try {
      await deleteAdminSkill(skill.id);
      await loadCatalog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate skill.");
    }
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50">
      <Header />
      <main className="min-h-0 flex-1">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-3xl font-semibold text-slate-900">
                  Skills & Categories
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Manage the catalog used by freelancer profiles and project search.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openCreateCategory}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Add Category
                </button>
                <button
                  type="button"
                  onClick={openCreateSkill}
                  disabled={activeCategories.length === 0}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  Add Skill
                </button>
              </div>
            </div>

            <div className="mb-4 grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_auto]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search skills, categories, slugs..."
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="all">All statuses</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.cName}
                  </option>
                ))}
              </select>
              <select
                value={activeTab}
                onChange={(event) => setActiveTab(event.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="categories">Categories</option>
                <option value="skills">Skills</option>
              </select>
              <div className="flex gap-2">
                <button type="button" onClick={() => exportCurrent("pdf")} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold">
                  PDF
                </button>
                <button type="button" onClick={() => exportCurrent("csv")} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold">
                  CSV
                </button>
                <button type="button" onClick={() => exportCurrent("json")} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold">
                  JSON
                </button>
              </div>
            </div>

            {error ? (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="mb-5 flex gap-2">
              {[
                ["categories", "Categories"],
                ["skills", "Skills"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setActiveTab(value)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                    activeTab === value
                      ? "bg-slate-900 text-white"
                      : "border border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
            ) : activeTab === "categories" ? (
              <CatalogTable
                columns={["ID", "Name", "Slug", "Description", "Status", "Actions"]}
                empty={
                  <EmptyState
                    title="No categories yet"
                    description="Create categories before assigning skills."
                  />
                }
                rows={filteredCategories}
                renderRow={(category) => (
                  <tr key={category.id}>
                    <td className="px-4 py-3">{category.id}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{category.cName}</td>
                    <td className="px-4 py-3 text-slate-600">{category.slug || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{category.cDesc}</td>
                    <td className="px-4 py-3"><StatusBadge active={category.isActive} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => openEditCategory(category)} className="rounded-md border px-3 py-1.5 text-xs font-medium">Edit</button>
                        {category.isActive ? (
                          <button type="button" onClick={() => deactivateCategory(category)} className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700">Deactivate</button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )}
              />
            ) : (
              <CatalogTable
                columns={["ID", "Skill", "Category", "Slug", "Status", "Actions"]}
                empty={
                  <EmptyState
                    title="No skills yet"
                    description="Create skills and assign them to active categories."
                  />
                }
                rows={filteredSkills}
                renderRow={(skill) => (
                  <tr key={skill.id}>
                    <td className="px-4 py-3">{skill.id}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getCategoryColor(Number(skill.categoryID) || 0)}`}>
                        {skill.skillName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getCategoryColor(skill.categoryID ? Number(skill.categoryID) : 0)}`}>
                        {skill.categoryName || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{skill.slug || "-"}</td>
                    <td className="px-4 py-3"><StatusBadge active={skill.isActive} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => openEditSkill(skill)} className="rounded-md border px-3 py-1.5 text-xs font-medium">Edit</button>
                        {skill.isActive ? (
                          <button type="button" onClick={() => deactivateSkill(skill)} className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700">Deactivate</button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )}
              />
            )}
          </section>
        </div>
      </main>

      {categoryModal ? (
        <Modal
          title={categoryModal.mode === "edit" ? "Edit Category" : "Add Category"}
          onClose={() => setCategoryModal(null)}
        >
          <form onSubmit={saveCategory} className="space-y-4">
            <TextInput label="Name" value={categoryForm.cName} maxLength={20} onChange={(value) => setCategoryForm((current) => ({ ...current, cName: value }))} />
            <TextInput label="Slug" value={categoryForm.slug} maxLength={20} onChange={(value) => setCategoryForm((current) => ({ ...current, slug: value }))} placeholder="Generated from name if empty" />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
              <textarea
                value={categoryForm.cDesc}
                maxLength={100}
                onChange={(event) => setCategoryForm((current) => ({ ...current, cDesc: event.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <ActiveCheckbox checked={categoryForm.isActive} onChange={(checked) => setCategoryForm((current) => ({ ...current, isActive: checked }))} />
            <FormActions saving={saving} onCancel={() => setCategoryModal(null)} />
          </form>
        </Modal>
      ) : null}

      {skillModal ? (
        <Modal
          title={skillModal.mode === "edit" ? "Edit Skill" : "Add Skill"}
          onClose={() => setSkillModal(null)}
        >
          <form onSubmit={saveSkill} className="space-y-4">
            <TextInput label="Skill Name" value={skillForm.skillName} maxLength={30} onChange={(value) => setSkillForm((current) => ({ ...current, skillName: value }))} />
            <TextInput label="Slug" value={skillForm.slug} maxLength={20} onChange={(value) => setSkillForm((current) => ({ ...current, slug: value }))} placeholder="Generated from name if empty" />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
              <select
                value={skillForm.categoryID}
                onChange={(event) => setSkillForm((current) => ({ ...current, categoryID: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              >
                <option value="">Select category</option>
                {activeCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.cName}
                  </option>
                ))}
              </select>
            </div>
            <ActiveCheckbox checked={skillForm.isActive} onChange={(checked) => setSkillForm((current) => ({ ...current, isActive: checked }))} />
            <FormActions saving={saving} onCancel={() => setSkillModal(null)} />
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

function CatalogTable({ columns, rows, renderRow, empty }) {
  if (rows.length === 0) return empty;
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-100">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-4 py-3 text-left font-semibold text-slate-700">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">{rows.map(renderRow)}</tbody>
      </table>
    </div>
  );
}

function TextInput({ label, value, onChange, maxLength, placeholder = "" }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        required={label !== "Slug"}
      />
    </div>
  );
}

function ActiveCheckbox({ checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300"
      />
      Active
    </label>
  );
}

function FormActions({ saving, onCancel }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button type="button" onClick={onCancel} className="rounded-lg border px-4 py-2 text-sm">
        Cancel
      </button>
      <button disabled={saving} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}

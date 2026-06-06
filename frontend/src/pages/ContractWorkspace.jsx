import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "../components/Header.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  fetchContractWorkspace,
  addWorkspaceTodo,
  updateWorkspaceTodo,
  deleteWorkspaceTodo,
  addWorkspaceSection,
  updateWorkspaceSection,
  deleteWorkspaceSection,
} from "../apiServices.js";
import { FiEdit2, FiTrash2, FiEye, FiEyeOff, FiChevronUp, FiChevronDown, FiPlus } from "react-icons/fi";

export default function ContractWorkspace() {
  const { id: contractID } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Todo form (freelancer)
  const [newTodo, setNewTodo] = useState({ title: "", description: "", dueDate: "", status: "todo" });

  // Section CMS (freelancer)
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSection, setNewSection] = useState({ title: "", type: "note", content: "", items: [] });
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editSectionData, setEditSectionData] = useState(null);

  // Moodle-style editing mode for the CMS
  const [isEditingMode, setIsEditingMode] = useState(false);

  const isFreelancer = data?.isFreelancer;

  async function loadWorkspace() {
    setLoading(true);
    setError("");
    try {
      const res = await fetchContractWorkspace(contractID);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workspace.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (contractID) loadWorkspace();
  }, [contractID]);

  // ========== TODOS ==========
  async function handleAddTodo(e) {
    e.preventDefault();
    if (!newTodo.title.trim()) return;
    try {
      await addWorkspaceTodo(contractID, newTodo);
      setNewTodo({ title: "", description: "", dueDate: "", status: "todo" });
      await loadWorkspace();
    } catch (err) {
      setError(err.message || "Failed to add todo.");
    }
  }

  async function handleUpdateTodoStatus(todo, newStatus) {
    try {
      await updateWorkspaceTodo(contractID, todo.id, { status: newStatus });
      await loadWorkspace();
    } catch (err) {
      setError(err.message || "Failed to update todo.");
    }
  }

  async function handleDeleteTodo(todoId) {
    if (!confirm("Delete this todo?")) return;
    try {
      await deleteWorkspaceTodo(contractID, todoId);
      await loadWorkspace();
    } catch (err) {
      setError(err.message || "Failed to delete todo.");
    }
  }

  // ========== CMS SECTIONS ==========
  async function handleAddSection(e) {
    e.preventDefault();
    if (!newSection.title.trim()) return;

    const payload = {
      title: newSection.title.trim(),
      type: newSection.type,
      content: newSection.content || null,
      visible: true,
    };

    if (newSection.type === "checklist") {
      payload.items = Array.isArray(newSection.items) ? newSection.items : [];
    }

    try {
      await addWorkspaceSection(contractID, payload);
      setNewSection({ title: "", type: "note", content: "", items: [] });
      setShowAddSection(false);
      await loadWorkspace();
    } catch (err) {
      setError(err.message || "Failed to add section.");
    }
  }

  function startEditSection(section) {
    setEditingSectionId(section.id);
    setEditSectionData({
      title: section.title,
      content: section.content || "",
      items: section.items || [],
      visible: section.visible,
      type: section.type,
    });
  }

  async function saveEditSection(sectionId) {
    try {
      const updatePayload = {
        title: editSectionData.title,
        content: editSectionData.content,
        visible: editSectionData.visible,
      };

      // Only send items for checklist sections
      if (editSectionData.type === "checklist" && Array.isArray(editSectionData.items)) {
        updatePayload.items = editSectionData.items;
      }

      await updateWorkspaceSection(contractID, sectionId, updatePayload);
      setEditingSectionId(null);
      setEditSectionData(null);
      await loadWorkspace();
    } catch (err) {
      setError(err.message || "Failed to update section.");
    }
  }

  async function toggleSectionVisible(section) {
    try {
      await updateWorkspaceSection(contractID, section.id, { visible: !section.visible });
      await loadWorkspace();
    } catch (err) {
      setError(err.message || "Failed to toggle visibility.");
    }
  }

  async function handleDeleteSection(sectionId) {
    if (!confirm("Delete this section?")) return;
    try {
      await deleteWorkspaceSection(contractID, sectionId);
      await loadWorkspace();
    } catch (err) {
      setError(err.message || "Failed to delete section.");
    }
  }

  // Moodle-like: move section up/down (updates sortOrder)
  async function moveSection(section, direction) {
    const currentIndex = sections.findIndex((s) => s.id === section.id);
    if (currentIndex === -1) return;

    if (direction === "up" && currentIndex === 0) return;
    if (direction === "down" && currentIndex === sections.length - 1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const target = sections[targetIndex];

    try {
      // Swap sort orders
      await Promise.all([
        updateWorkspaceSection(contractID, section.id, { sortOrder: target.sortOrder ?? currentIndex }),
        updateWorkspaceSection(contractID, target.id, { sortOrder: section.sortOrder ?? targetIndex }),
      ]);
      await loadWorkspace();
    } catch (err) {
      setError(err.message || "Failed to reorder section.");
    }
  }

  // Quick add from Moodle-style chooser
  function addContentBlock(type) {
    const defaultTitles = {
      note: "New Note",
      checklist: "To-Do Checklist",
      progress: "Progress Update",
      links: "Useful Resources",
    };

    setNewSection({
      title: defaultTitles[type] || "New Block",
      type,
      content: "",
      items: type === "checklist" ? [{ text: "", done: false }] : [],
    });
    setShowAddSection(true); // show the form
    // Scroll to form if needed (simple)
    setTimeout(() => {
      const form = document.getElementById("cms-add-form");
      if (form) form.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  }

  // Live toggle checklist item (nice for CMS, not just CRUD)
  async function toggleChecklistItem(section, itemIndex) {
    if (!Array.isArray(section.items)) return;

    const updatedItems = section.items.map((it, idx) =>
      idx === itemIndex ? { ...it, done: !it.done } : it
    );

    try {
      await updateWorkspaceSection(contractID, section.id, { items: updatedItems });
      await loadWorkspace();
    } catch (err) {
      setError(err.message || "Failed to update checklist.");
    }
  }

  function addChecklistItem() {
    setNewSection((prev) => ({
      ...prev,
      items: [...(prev.items || []), { text: "", done: false }],
    }));
  }

  function updateChecklistItem(index, field, value) {
    setNewSection((prev) => {
      const items = [...(prev.items || [])];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  }

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar roleID={user?.roleID} />
        <div className="flex-1 p-8">Loading workspace...</div>
      </div>
    );
  }

  const contract = data?.contract;
  const todos = data?.todos || [];
  const sections = data?.sections || [];

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar roleID={user?.roleID} />

        <main className="flex-1 overflow-auto p-6 sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Contract Workspace</h1>
              <p className="mt-1 text-slate-600">
                Private collaboration space for{" "}
                <span className="font-medium">{isFreelancer ? "you and the client" : "you and the freelancer"}</span>
              </p>
            </div>
            <Link
              to={isFreelancer ? "/freelancer/contracts" : "/client/contracts"}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              ← Back to Contracts
            </Link>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          {contract && (
            <div className="mb-6 rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Project:</span>{" "}
                  <span className="font-semibold">{contract.projectTitle || contract.title}</span>
                </div>
                <div>
                  <span className="text-slate-500">Status:</span>{" "}
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {contract.cStatus}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Value:</span>{" "}
                  <span className="font-medium">${Number(contract.totalAmount || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* SHARED TO-DO LIST */}
          <section className="mb-8 rounded-2xl border bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">To-Do List</h2>
              <span className="text-xs text-slate-500">Freelancer manages • Client can view</span>
            </div>

            {isFreelancer && (
              <form onSubmit={handleAddTodo} className="mb-4 grid gap-3 md:grid-cols-5">
                <input
                  value={newTodo.title}
                  onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                  placeholder="Task title"
                  className="md:col-span-2 rounded border px-3 py-2 text-sm"
                  required
                />
                <input
                  value={newTodo.description}
                  onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
                  placeholder="Description (optional)"
                  className="md:col-span-2 rounded border px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={newTodo.dueDate}
                    onChange={(e) => setNewTodo({ ...newTodo, dueDate: e.target.value })}
                    className="flex-1 rounded border px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    className="rounded bg-[#1a3c2e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#214b38]"
                  >
                    Add
                  </button>
                </div>
              </form>
            )}

            {todos.length === 0 ? (
              <p className="text-sm text-slate-500">No todos yet. {isFreelancer ? "Add your first task above." : ""}</p>
            ) : (
              <div className="divide-y rounded border">
                {todos.map((todo) => (
                  <div key={todo.id} className="flex flex-col gap-1 p-3 text-sm md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{todo.title}</div>
                      {todo.description && <div className="text-slate-600">{todo.description}</div>}
                      {todo.dueDate && <div className="text-xs text-slate-400">Due: {todo.dueDate}</div>}
                    </div>

                    <div className="flex items-center gap-2">
                      {isFreelancer ? (
                        <>
                          <select
                            value={todo.status}
                            onChange={(e) => handleUpdateTodoStatus(todo, e.target.value)}
                            className="rounded border px-2 py-1 text-xs"
                          >
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="done">Done</option>
                          </select>
                          <button
                            onClick={() => handleDeleteTodo(todo.id)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          todo.status === "done" ? "bg-emerald-100 text-emerald-700" :
                          todo.status === "in_progress" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                        }`}>
                          {todo.status.replace("_", " ")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* FREELANCER CMS / CUSTOM SECTIONS - Moodle-style CMS */}
          {isFreelancer && (
            <section className="mb-8 rounded-2xl border bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between border-b pb-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Your Workspace (CMS)</h2>
                  <p className="text-xs text-slate-500">
                    Build content for the client. Looks like a course page — not a database form.
                  </p>
                </div>

                <button
                  onClick={() => setIsEditingMode(!isEditingMode)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    isEditingMode
                      ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                      : "bg-[#1a3c2e] text-white hover:bg-[#214b38]"
                  }`}
                >
                  {isEditingMode ? "Turn editing off" : "Turn editing on"}
                </button>
              </div>

              {/* Moodle-like Content Chooser (only when editing) */}
              {isEditingMode && (
                <div className="mb-6">
                  <div className="text-sm font-medium text-slate-700 mb-2">Add a content block</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { type: "note", label: "Note / Update", desc: "Status update or text", icon: "📝" },
                      { type: "checklist", label: "Checklist", desc: "Task list for visibility", icon: "✅" },
                      { type: "progress", label: "Progress Report", desc: "Share recent progress", icon: "📈" },
                      { type: "links", label: "Links & Resources", desc: "Useful files or URLs", icon: "🔗" },
                    ].map((t) => (
                      <button
                        key={t.type}
                        type="button"
                        onClick={() => addContentBlock(t.type)}
                        className="flex flex-col items-start gap-1 rounded-xl border p-3 text-left hover:border-[#1a3c2e] hover:bg-slate-50 transition active:scale-[0.985]"
                      >
                        <div className="text-2xl">{t.icon}</div>
                        <div className="font-semibold text-sm">{t.label}</div>
                        <div className="text-[11px] text-slate-500 leading-tight">{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Add / Edit Form (shown when adding or when we triggered from chooser) */}
              {showAddSection && (
                <form id="cms-add-form" onSubmit={handleAddSection} className="mb-6 rounded-xl border bg-slate-50 p-4">
                  <div className="flex items-center gap-2 mb-3 text-sm font-medium">
                    <FiPlus className="h-4 w-4" /> New content block
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      value={newSection.title}
                      onChange={(e) => setNewSection({ ...newSection, title: e.target.value })}
                      placeholder="Block title (e.g. Week 3 Progress)"
                      className="rounded border px-3 py-2 text-sm"
                      required
                    />
                    <select
                      value={newSection.type}
                      onChange={(e) => setNewSection({ ...newSection, type: e.target.value })}
                      className="rounded border px-3 py-2 text-sm"
                    >
                      <option value="note">Note / Update</option>
                      <option value="checklist">Checklist</option>
                      <option value="progress">Progress Report</option>
                      <option value="links">Links &amp; Resources</option>
                    </select>
                  </div>

                  <textarea
                    value={newSection.content}
                    onChange={(e) => setNewSection({ ...newSection, content: e.target.value })}
                    placeholder="Write your content here..."
                    className="mt-3 w-full rounded border px-3 py-2 text-sm"
                    rows={3}
                  />

                  {newSection.type === "checklist" && (
                    <div className="mt-3">
                      <div className="text-xs font-medium mb-1 text-slate-600">Checklist items</div>
                      {(newSection.items || []).map((item, idx) => (
                        <div key={idx} className="mt-1 flex gap-2">
                          <input
                            value={item.text}
                            onChange={(e) => updateChecklistItem(idx, "text", e.target.value)}
                            className="flex-1 rounded border px-2 py-1 text-sm"
                            placeholder="Task description"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setNewSection((prev) => ({
                                ...prev,
                                items: prev.items.filter((_, i) => i !== idx),
                              }))
                            }
                            className="text-red-500 px-1"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addChecklistItem}
                        className="mt-1 text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        + Add item
                      </button>
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <button
                      type="submit"
                      className="rounded bg-emerald-700 px-5 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800"
                    >
                      Add to workspace
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddSection(false)}
                      className="rounded border px-4 py-1.5 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Sections list - different look in editing mode */}
              {sections.length === 0 ? (
                <p className="text-sm text-slate-500">No content yet. Turn editing on and add your first block.</p>
              ) : (
                <div className="space-y-4">
                  {sections.map((section) => {
                    const isEditing = editingSectionId === section.id;

                    return (
                      <div
                        key={section.id}
                        className={`rounded-2xl border bg-white transition ${!section.visible ? "opacity-70" : ""}`}
                      >
                        {/* Section header with type icon + actions */}
                        <div className="flex items-center justify-between border-b px-4 py-2.5 bg-slate-50 rounded-t-2xl">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {section.type === "note" && "📝"}
                              {section.type === "checklist" && "✅"}
                              {section.type === "progress" && "📈"}
                              {section.type === "links" && "🔗"}
                            </span>
                            <div className="font-semibold text-slate-800">{section.title}</div>
                            {!section.visible && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Hidden</span>}
                          </div>

                          {/* Moodle-style action icons (only when editing mode) */}
                          {isEditingMode && (
                            <div className="flex items-center gap-1 text-slate-500">
                              <button
                                onClick={() => moveSection(section, "up")}
                                className="p-1 hover:text-slate-900 rounded hover:bg-white"
                                title="Move up"
                              >
                                <FiChevronUp className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => moveSection(section, "down")}
                                className="p-1 hover:text-slate-900 rounded hover:bg-white"
                                title="Move down"
                              >
                                <FiChevronDown className="h-4 w-4" />
                              </button>

                              <button
                                onClick={() => startEditSection(section)}
                                className="p-1 hover:text-slate-900 rounded hover:bg-white"
                                title="Edit"
                              >
                                <FiEdit2 className="h-4 w-4" />
                              </button>

                              <button
                                onClick={() => toggleSectionVisible(section)}
                                className="p-1 hover:text-slate-900 rounded hover:bg-white"
                                title={section.visible ? "Hide from client" : "Show to client"}
                              >
                                {section.visible ? <FiEye className="h-4 w-4" /> : <FiEyeOff className="h-4 w-4" />}
                              </button>

                              <button
                                onClick={() => handleDeleteSection(section.id)}
                                className="p-1 hover:text-red-600 rounded hover:bg-red-50"
                                title="Delete"
                              >
                                <FiTrash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Content area */}
                        <div className="p-4">
                          {!isEditing ? (
                            <div className="text-sm text-slate-700">
                              {section.type === "checklist" && section.items?.length > 0 ? (
                                <ul className="space-y-1.5">
                                  {section.items.map((it, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                      <input
                                        type="checkbox"
                                        checked={!!it.done}
                                        onChange={() => isEditingMode && toggleChecklistItem(section, i)}
                                        disabled={!isEditingMode}
                                        className="mt-0.5 accent-[#1a3c2e]"
                                      />
                                      <span className={it.done ? "line-through text-slate-400" : ""}>
                                        {it.text || "(empty item)"}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="whitespace-pre-wrap leading-relaxed">
                                  {section.content || <span className="italic text-slate-400">No content added yet.</span>}
                                </div>
                              )}
                            </div>
                          ) : (
                            // Inline edit (still a bit form-like but cleaner)
                            <div className="space-y-3">
                              <input
                                value={editSectionData.title}
                                onChange={(e) => setEditSectionData({ ...editSectionData, title: e.target.value })}
                                className="w-full rounded border px-3 py-2 text-sm font-medium"
                              />
                              <textarea
                                value={editSectionData.content}
                                onChange={(e) => setEditSectionData({ ...editSectionData, content: e.target.value })}
                                className="w-full rounded border px-3 py-2 text-sm"
                                rows={4}
                                placeholder="Content..."
                              />

                              {editSectionData.type === "checklist" && (
                                <div>
                                  <div className="text-xs mb-1 text-slate-500">Checklist items (editable)</div>
                                  {(editSectionData.items || []).map((item, idx) => (
                                    <div key={idx} className="flex gap-2 mb-1">
                                      <input
                                        value={item.text}
                                        onChange={(e) => {
                                          const newItems = [...(editSectionData.items || [])];
                                          newItems[idx] = { ...newItems[idx], text: e.target.value };
                                          setEditSectionData({ ...editSectionData, items: newItems });
                                        }}
                                        className="flex-1 text-sm border rounded px-2 py-1"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newItems = (editSectionData.items || []).filter((_, i) => i !== idx);
                                          setEditSectionData({ ...editSectionData, items: newItems });
                                        }}
                                        className="text-red-500 text-sm px-1"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newItems = [...(editSectionData.items || []), { text: "", done: false }];
                                      setEditSectionData({ ...editSectionData, items: newItems });
                                    }}
                                    className="text-xs text-blue-600 mt-1"
                                  >
                                    + Add item
                                  </button>
                                </div>
                              )}

                              <div className="flex items-center gap-3 pt-1">
                                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={editSectionData.visible}
                                    onChange={(e) => setEditSectionData({ ...editSectionData, visible: e.target.checked })}
                                  />
                                  Visible to client
                                </label>

                                <div className="flex-1" />

                                <button
                                  onClick={() => saveEditSection(section.id)}
                                  className="text-xs bg-[#1a3c2e] text-white px-4 py-1 rounded hover:bg-[#214b38]"
                                >
                                  Save changes
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingSectionId(null);
                                    setEditSectionData(null);
                                  }}
                                  className="text-xs border px-3 py-1 rounded"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!isEditingMode && sections.length > 0 && (
                <p className="text-[11px] text-slate-400 mt-3">Turn editing on to rearrange, edit or add new blocks.</p>
              )}
            </section>
          )}

          {/* Client view of freelancer sections */}
          {!isFreelancer && sections.length > 0 && (
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold text-slate-900">Freelancer Updates &amp; Notes</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {sections.map((section) => (
                  <div key={section.id} className="rounded-xl border p-4">
                    <div className="mb-2 font-semibold text-slate-800">{section.title}</div>
                    <div className="text-sm text-slate-600 whitespace-pre-wrap">
                      {section.type === "checklist" && section.items?.length ? (
                        <ul>
                          {section.items.map((it, i) => (
                            <li key={i} className={it.done ? "line-through" : ""}>• {it.text}</li>
                          ))}
                        </ul>
                      ) : (
                        section.content || <span className="italic text-slate-400">No details provided.</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {isFreelancer && sections.length === 0 && !showAddSection && (
            <div className="text-center text-sm text-slate-500 mt-4">
              Use the "Add Section" button to create a dynamic workspace the client can see.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

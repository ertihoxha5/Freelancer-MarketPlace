import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";

import {
  fetchMyTestimonials,
  createClientTestimonial,
  updateClientTestimonial,
  deleteClientTestimonial,
} from "../apiServices.js";
import { exportCSV, exportJSON } from "../utils/export.js";

function StarRating({ value, onChange, editable = false }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="flex gap-1 text-2xl">
      {stars.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => editable && onChange?.(s)}
          className={`transition ${editable ? "cursor-pointer hover:scale-110" : ""}`}
          disabled={!editable}
        >
          {s <= value ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
}

function TestimonialCard({ t, onEdit, onDelete }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">{t.fullName}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{t.roleTitle}</span>
          </div>
          <div className="mt-1"><StarRating value={t.rating} /></div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onEdit(t)} className="text-xs rounded-xl border px-3 py-1 hover:bg-slate-50">Edit</button>
          <button onClick={() => onDelete(t)} className="text-xs rounded-xl border border-red-200 text-red-600 px-3 py-1 hover:bg-red-50">Delete</button>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-700 whitespace-pre-wrap">"{t.comment}"</p>
      <p className="mt-3 text-[11px] text-slate-400">Submitted {new Date(t.createdAt).toLocaleDateString()}</p>
      {t.isPublished ? (
        <span className="mt-2 inline-block text-[10px] uppercase tracking-widest bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">Published on homepage</span>
      ) : (
        <span className="mt-2 inline-block text-[10px] uppercase tracking-widest bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Pending review</span>
      )}
    </div>
  );
}

export default function ClientTestimonials() {
  const { user } = useAuth();
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [minRating, setMinRating] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ fullName: "", roleTitle: "", rating: 5, comment: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await fetchMyTestimonials();
      setTestimonials(Array.isArray(data.testimonials) ? data.testimonials : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load your testimonials.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return testimonials
      .filter((t) => t.rating >= minRating)
      .filter((t) =>
        !q ||
        (t.comment || "").toLowerCase().includes(q) ||
        (t.fullName || "").toLowerCase().includes(q) ||
        (t.roleTitle || "").toLowerCase().includes(q)
      );
  }, [testimonials, query, minRating]);

  function openCreate() {
    setEditing(null);
    setForm({
      fullName: user?.fullName || "",
      roleTitle: "Satisfied Client",
      rating: 5,
      comment: "",
    });
    setFormError("");
    setShowForm(true);
  }

  function openEdit(t) {
    setEditing(t);
    setForm({
      fullName: t.fullName || "",
      roleTitle: t.roleTitle || "",
      rating: t.rating || 5,
      comment: t.comment || "",
    });
    setFormError("");
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (!form.comment.trim()) {
      setFormError("Please write a short comment.");
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        await updateClientTestimonial(editing.id, form);
      } else {
        await createClientTestimonial(form);
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save testimonial.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(t) {
    if (!window.confirm("Delete this testimonial?")) return;
    try {
      await deleteClientTestimonial(t.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setFormError("");
  }

  const exportData = filtered.map((t) => ({
    id: t.id,
    name: t.fullName,
    role: t.roleTitle,
    rating: t.rating,
    comment: t.comment,
    published: t.isPublished ? "Yes" : "No",
    created: t.createdAt,
  }));

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 min-h-0 w-full p-0">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Client</p>
                <h1 className="mt-2 text-3xl font-semibold text-slate-900">My Testimonials</h1>
                <p className="mt-2 max-w-2xl text-slate-600">
                  Share your experience working with freelancers. Your testimonials may appear on the public homepage when approved.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={openCreate} className="rounded-2xl bg-[#1a3c2e] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2a5c46]">
                  + Write New Testimonial
                </button>
                <button onClick={() => exportCSV(exportData, "my-testimonials")} className="rounded-2xl border px-4 py-2 text-sm">Export CSV</button>
                <button onClick={() => exportJSON(exportData, "my-testimonials")} className="rounded-2xl border px-4 py-2 text-sm">Export JSON</button>
              </div>
            </div>

            {error && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

            {}
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search comments or name..."
                className="flex-1 min-w-[220px] rounded-2xl border border-slate-300 px-4 py-2 text-sm"
              />
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">Min rating:</span>
                {[0, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    onClick={() => setMinRating(r)}
                    className={`px-3 py-1 rounded-full border text-xs ${minRating === r ? "bg-[#1a3c2e] text-white border-[#1a3c2e]" : "hover:bg-slate-100"}`}
                  >
                    {r === 0 ? "Any" : `${r}+ ★`}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="p-10 text-center text-slate-500 rounded-3xl border">Loading your testimonials...</div>
            ) : filtered.length === 0 ? (
              <div className="rounded-3xl border border-dashed p-10 text-center">
                <p className="font-medium">No testimonials yet.</p>
                <button onClick={openCreate} className="mt-4 text-sm underline text-[#1a3c2e]">Write your first one</button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((t) => (
                  <TestimonialCard key={t.id} t={t} onEdit={openEdit} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {}
      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-3xl border bg-white shadow-2xl">
            <div className="px-6 pt-6">
              <h2 className="text-2xl font-semibold">{editing ? "Edit Testimonial" : "Write a Testimonial"}</h2>
              <p className="text-sm text-slate-500 mt-1">Help other clients by sharing your honest experience.</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Your Name</label>
                  <input
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className="w-full rounded-2xl border px-4 py-2.5 text-sm"
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Your Role / Title</label>
                  <input
                    value={form.roleTitle}
                    onChange={(e) => setForm({ ...form, roleTitle: e.target.value })}
                    className="w-full rounded-2xl border px-4 py-2.5 text-sm"
                    placeholder="Founder at Acme Inc"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Your Rating</label>
                <StarRating value={form.rating} onChange={(r) => setForm({ ...form, rating: r })} editable />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Comment</label>
                <textarea
                  value={form.comment}
                  onChange={(e) => setForm({ ...form, comment: e.target.value })}
                  rows={5}
                  className="w-full rounded-2xl border px-4 py-3 text-sm"
                  placeholder="Describe your experience working with the freelancer..."
                  required
                />
              </div>

              {}
              <div className="rounded-2xl border bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">Live Preview (how it may appear)</div>
                <div className="bg-white rounded-2xl p-4 border">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{form.fullName || "Your Name"}</span>
                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">{form.roleTitle || "Role"}</span>
                  </div>
                  <div className="mt-1"><StarRating value={form.rating} /></div>
                  <p className="mt-2 text-sm text-slate-700 italic">"{form.comment || "Your comment will appear here..."}"</p>
                </div>
              </div>

              {formError && <div className="text-sm text-red-600">{formError}</div>}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeForm} className="rounded-2xl border px-5 py-2 text-sm">Cancel</button>
                <button
                  type="submit"
                  disabled={submitting || !form.comment.trim()}
                  className="rounded-2xl bg-[#1a3c2e] px-6 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {submitting ? "Saving..." : editing ? "Save Changes" : "Submit Testimonial"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

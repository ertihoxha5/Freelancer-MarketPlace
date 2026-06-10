import { useEffect, useState } from "react";
import Header from "../../components/Header.jsx";
import Sidebar from "../../components/Sidebar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

import {
  fetchAdminReviews,
  updateAdminReview,
  deleteAdminReview,
} from "../../apiServices.js";


export default function AdminReviews() {
  const { user } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ stars: "", isVerified: "" });
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", comment: "", stars: 5, isVerified: false });

  async function load() {
    setLoading(true);
    try {
      const data = await fetchAdminReviews(filters);
      setReviews(data.reviews || []);
    } catch (e) {
      setError("Failed to load reviews.");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [filters]);

  function startEdit(r) {
    setEditing(r);
    setForm({ title: r.title || "", comment: r.comment, stars: r.stars, isVerified: !!r.isVerified });
  }

  async function handleSave() {
    await updateAdminReview(editing.id, form);
    setEditing(null);
    await load();
  }

  async function handleDelete(id) {
    if (!confirm("Delete review?")) return;
    await deleteAdminReview(id);
    await load();
  }

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 min-h-0 w-full p-0">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            <h1 className="text-3xl font-semibold mb-6">Reviews (Admin CRUD)</h1>

            <div className="mb-4 flex gap-3">
              <input placeholder="Stars" value={filters.stars} onChange={e => setFilters({...filters, stars: e.target.value})} className="border p-2 rounded" />
              <select value={filters.isVerified} onChange={e => setFilters({...filters, isVerified: e.target.value})} className="border p-2 rounded">
                <option value="">All verified</option>
                <option value="true">Verified</option>
                <option value="false">Not verified</option>
              </select>
              <button onClick={load} className="border px-3 rounded">Filter</button>
            </div>

            {loading ? <div>Loading...</div> : (
              <div className="space-y-3">
                {reviews.map(r => (
                  <div key={r.id} className="border p-4 rounded flex justify-between">
                    <div>
                      <div>★{r.stars} — {r.title || "(no title)"} {r.isVerified ? "✓" : ""}</div>
                      <div className="text-sm text-slate-600">{r.comment}</div>
                      <div className="text-xs">Helpful: {r.helpfulCount || 0}</div>
                    </div>
                    <div className="space-x-2 text-sm">
                      <button onClick={() => startEdit(r)} className="border px-2 py-1 rounded">Edit</button>
                      <button onClick={() => handleDelete(r.id)} className="border px-2 py-1 rounded text-red-600">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {editing && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
                <div className="bg-white p-6 rounded w-full max-w-md">
                  <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Title" className="w-full border p-2 mb-2" />
                  <textarea value={form.comment} onChange={e=>setForm({...form,comment:e.target.value})} className="w-full border p-2 mb-2" />
                  <input type="number" value={form.stars} onChange={e=>setForm({...form,stars:Number(e.target.value)})} className="w-full border p-2 mb-2" />
                  <label className="block mb-4"><input type="checkbox" checked={form.isVerified} onChange={e=>setForm({...form,isVerified:e.target.checked})} /> Verified</label>
                  <div className="flex gap-2">
                    <button onClick={handleSave} className="flex-1 bg-slate-900 text-white py-2 rounded">Save</button>
                    <button onClick={()=>setEditing(null)} className="flex-1 border py-2 rounded">Cancel</button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

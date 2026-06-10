import { useEffect, useState } from "react";
import Header from "../../components/Header.jsx";
import Sidebar from "../../components/Sidebar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

import {
  fetchAdminTestimonials,
  updateAdminTestimonial,
  deleteAdminTestimonial,
} from "../../apiServices.js";

export default function AdminTestimonials() {
  const { user } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ fullName: "", roleTitle: "", rating: 5, comment: "", isPublished: true });

  async function load() {
    setLoading(true);
    try {
      const data = await fetchAdminTestimonials();
      setItems(data.testimonials || data || []);
    } catch (e) {
      setError("Failed to load testimonials.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSave() {
    try {
      await updateAdminTestimonial(editing.id, form);
      setEditing(null);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete?")) return;
    await deleteAdminTestimonial(id);
    await load();
  }

  function startEdit(t) {
    setEditing(t);
    setForm({ fullName: t.fullName, roleTitle: t.roleTitle, rating: t.rating, comment: t.comment, isPublished: t.isPublished });
  }

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 min-h-0 w-full p-0">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            <h1 className="text-3xl font-semibold mb-6">Testimonials (Admin CRUD)</h1>

            {error && <div className="text-red-600 mb-4">{error}</div>}

            {loading ? <div>Loading...</div> : (
              <div className="space-y-3">
                {items.map(t => (
                  <div key={t.id} className="border rounded p-4 flex justify-between items-start">
                    <div>
                      <div className="font-medium">{t.fullName} — {t.roleTitle} (★{t.rating})</div>
                      <div className="text-sm text-slate-600">"{t.comment}"</div>
                      <div className="text-xs mt-1">Published: {t.isPublished ? 'Yes' : 'No'}</div>
                    </div>
                    <div className="space-x-2">
                      <button onClick={() => startEdit(t)} className="px-3 py-1 border rounded text-sm">Edit</button>
                      <button onClick={() => handleDelete(t.id)} className="px-3 py-1 border rounded text-sm text-red-600">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {editing && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
                <div className="bg-white rounded p-6 w-full max-w-md">
                  <h3 className="font-semibold mb-4">Edit Testimonials</h3>
                  <input className="w-full border p-2 mb-2" value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})} />
                  <input className="w-full border p-2 mb-2" value={form.roleTitle} onChange={e=>setForm({...form,roleTitle:e.target.value})} />
                  <input type="number" className="w-full border p-2 mb-2" value={form.rating} onChange={e=>setForm({...form,rating:Number(e.target.value)})} />
                  <textarea className="w-full border p-2 mb-2" value={form.comment} onChange={e=>setForm({...form,comment:e.target.value})} />
                  <label className="flex items-center gap-2 mb-4"><input type="checkbox" checked={form.isPublished} onChange={e=>setForm({...form,isPublished:e.target.checked})} /> Published</label>
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

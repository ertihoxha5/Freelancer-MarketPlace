import { useEffect, useState } from "react";
import Header from "../../components/Header.jsx";
import Sidebar from "../../components/Sidebar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

import {
  fetchAdminMilestones,
  updateAdminMilestoneStatus,
} from "../../apiServices.js";


export default function AdminMilestones() {
  const { user } = useAuth();

  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await fetchAdminMilestones(statusFilter ? { status: statusFilter } : {});
      setMilestones(data.milestones || []);
    } catch (e) {
      setError("Failed to load milestones.");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [statusFilter]);

  async function handleStatusChange(id, newStatus) {
    await updateAdminMilestoneStatus(id, newStatus);
    await load();
  }

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 min-h-0 w-full p-0">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            <h1 className="text-3xl font-semibold mb-6">Milestones (Admin CRUD)</h1>

            <div className="mb-4">
              <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="border p-2 rounded">
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            {loading ? <div>Loading...</div> : (
              <div className="space-y-2">
                {milestones.map(m => (
                  <div key={m.id} className="border p-3 rounded flex justify-between items-center text-sm">
                    <div>
                      <div className="font-medium">{m.title} — {m.projectTitle || "Project"} (Contract {m.contractId || m.contractID})</div>
                      <div className="text-xs text-slate-500">{m.mDesc}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-slate-100 rounded">{m.status}</span>
                      <select value={m.status} onChange={e => handleStatusChange(m.id, e.target.value)} className="border text-xs p-1 rounded">
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="overdue">Overdue</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

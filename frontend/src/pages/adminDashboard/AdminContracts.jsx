import { useEffect, useState } from "react";
import Header from "../../components/Header.jsx";
import Sidebar from "../../components/Sidebar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { fetchAdminContracts } from "../../apiServices.js";

export default function AdminContracts() {
  const { user } = useAuth();
  const [contractsData, setContractsData] = useState({ contracts: [], total: 0, page: 1, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "", search: "", page: 1 });

  const loadContracts = async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      if (!params.status) delete params.status;
      if (!params.search) delete params.search;
      const data = await fetchAdminContracts(params);
      setContractsData(data);
    } catch (err) {
      console.error(err);
      setContractsData({ contracts: [], total: 0, page: 1, limit: 20 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();

  }, [filters.status, filters.search, filters.page]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const { contracts, total, page, limit } = contractsData;

  const stats = {
    total: total || contracts.length,
    active: contracts.filter(c => c.cStatus === "active").length,
    completed: contracts.filter(c => c.cStatus === "completed").length,
    revenue: contracts.reduce((s, c) => s + (Number(c.totalAmount) || 0), 0),
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50">
      <Header />
      <main className="min-h-0 flex-1">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            <div className="mb-6">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Contract Management</p>
              <h1 className="text-4xl font-semibold text-slate-900 mt-1">All Contracts</h1>
            </div>

            {}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="rounded-2xl border p-4 bg-white">
                <div className="text-xs text-slate-500">Total Contracts</div>
                <div className="text-3xl font-semibold mt-1">{stats.total}</div>
              </div>
              <div className="rounded-2xl border p-4 bg-white">
                <div className="text-xs text-slate-500">Active</div>
                <div className="text-3xl font-semibold mt-1 text-blue-600">{stats.active}</div>
              </div>
              <div className="rounded-2xl border p-4 bg-white">
                <div className="text-xs text-slate-500">Completed</div>
                <div className="text-3xl font-semibold mt-1 text-emerald-600">{stats.completed}</div>
              </div>
              <div className="rounded-2xl border p-4 bg-white">
                <div className="text-xs text-slate-500">Total Value</div>
                <div className="text-3xl font-semibold mt-1">${stats.revenue.toLocaleString()}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mb-4">
              <input
                placeholder="Search project, client or freelancer..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="border rounded-2xl px-4 py-2 text-sm w-80"
              />
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="border rounded-2xl px-4 py-2 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <button className="ml-auto px-4 py-2 border rounded-2xl text-sm" onClick={() => {}}>Export CSV</button>
            </div>

            <div className="rounded-3xl border bg-white shadow-sm overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-left">Contract</th>
                    <th className="px-6 py-4 text-left">Client</th>
                    <th className="px-6 py-4 text-left">Freelancer</th>
                    <th className="px-6 py-4">Value</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Started</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {contracts.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium">{c.projectTitle || c.title}</td>
                      <td className="px-6 py-4 text-slate-600">{c.clientName || c.clientFullName}</td>
                      <td className="px-6 py-4 text-slate-600">{c.freelancerName || c.freelancerFullName}</td>
                      <td className="px-6 py-4 font-semibold">${Number(c.totalAmount || 0).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          c.cStatus === "active" ? "bg-blue-100 text-blue-700" :
                          c.cStatus === "completed" ? "bg-emerald-100 text-emerald-700" :
                          c.cStatus === "pending" ? "bg-yellow-100 text-yellow-700" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {c.cStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">{c.startDate ? new Date(c.startDate).toLocaleDateString() : '-'}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-sm text-[#1a3c2e] font-medium hover:underline">View Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center mt-4 text-sm">
              <p className="text-slate-500">Showing {contracts.length} of {total} contracts</p>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => handleFilterChange('page', page - 1)}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Prev
                </button>
                <span>Page {page}</span>
                <button
                  onClick={() => handleFilterChange('page', page + 1)}
                  className="px-3 py-1 border rounded"
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
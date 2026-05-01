import { useState, useEffect } from "react";

export default function ProjectFilters({ currentFilters, onFilterChange }) {
  const [local, setLocal] = useState(currentFilters);

  useEffect(() => {
    setLocal(currentFilters);
  }, [currentFilters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange({
        sort: local.sort,
        categoryID: local.categoryID,
        skillIds: local.skillIds,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [local.sort, local.categoryID, local.skillIds, onFilterChange]);
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 mb-8 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Sort By</label>
          <select value={local.sort}
            onChange={(e) =>
              setLocal((prev) => ({ ...prev, sort: e.target.value }))
            }className="w-full border border-slate-300 rounded-2xl px-4 py-3 text-sm">
            <option value="newest">Newest First</option>
            <option value="budget_desc">Budget High - Low</option>
            <option value="budget_asc">Budget Low - High</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
          <select value={local.categoryID} onChange={(e) =>
              setLocal((prev) => ({ ...prev, categoryID: e.target.value }))
            } className="w-full border border-slate-300 rounded-2xl px-4 py-3 text-sm">
            <option value="">All Categories</option>
            <option value="1">Web Development</option>
            <option value="2">Mobile App</option>
            <option value="3">Design</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Skills (IDs)</label>
          <input type="text" placeholder="1,3,5" value={local.skillIds} onChange={(e) => 
              setLocal((prev) => ({ ...prev, skillIds: e.target.value }))}
            className="w-full border border-slate-300 rounded-2xl px-4 py-3 text-sm"/>
        </div>
        <div className="flex items-end">
          <button onClick={() => setLocal({ sort: "newest", categoryID: "", skillIds: "" })}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-2xl text-sm">Clear Filters</button>
        </div>
      </div>
    </div>
  );
}
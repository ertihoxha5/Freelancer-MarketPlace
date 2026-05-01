import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchBrowseProjects } from '../apiServices.js';
import Header from '../components/Header.jsx';
import Sidebar from '../components/Sidebar.jsx';
import ProjectCard from '../components/project/ProjectCard.jsx';
import ProjectFilters from '../components/project/ProjectFilters.jsx';
import Loading from '../components/Loading.jsx';

export default function FreelancerBrowseProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    sort: 'newest',
    categoryID: '',
    skillIds: '',
  });
  const loadProjects = useCallback(async (currentFilters) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchBrowseProjects(currentFilters);
      setProjects(data.projects || []);
    } catch (err) {
      setError(err.message || 'Failed to load projects');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadProjects(filters);
  }, [filters, loadProjects]);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);
  const memoizedProjects = useMemo(() => projects, [projects]);
  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col overflow-hidden">
      <Header/>
      <main className="flex-1 min-h-0 w-full p-0">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-semibold text-slate-900">Browse Projects</h1>
              <p className="mt-2 text-slate-600">Discover open projects that match your skills and experience.</p>
            </div>
            <ProjectFilters currentFilters={filters}  onFilterChange={handleFilterChange} />
            {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl">{error}</div>}
            {loading ? (
              <Loading/>
            ) : memoizedProjects.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500">No projects match your current filters.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {memoizedProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
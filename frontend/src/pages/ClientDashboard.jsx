import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Sidebar from '../components/Sidebar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchClientProjects } from '../apiServices.js';

export default function ClientDashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    async function loadProjects() {
      setLoading(true);
      setError('');
      try {
        const data = await fetchClientProjects();
        if (alive) {
          setProjects(Array.isArray(data.projects) ? data.projects : []);
        }
      } catch (err) {
        if (alive) {
          setError(err instanceof Error ? err.message : 'Failed to load projects.');
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    loadProjects();
    return () => {
      alive = false;
    };
  }, []);

  const stats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter(p => p.pStatus === 'active').length;
    const pending = projects.filter(p => p.pStatus === 'pending').length;
    const completed = projects.filter(p => p.pStatus === 'completed').length;
    const totalBudget = projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
    const recentProjects = projects.slice(0, 3); // Last 3 projects
    return { total, active, pending, completed, totalBudget, recentProjects };
  }, [projects]);

  const quickActions = [
    {
      title: 'Post a New Project',
      description: 'Create a project brief and attract freelancers.',
      href: '/client/post-project',
      icon: '📝',
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    },
    {
      title: 'View All Projects',
      description: 'Manage your existing projects and proposals.',
      href: '/client/projects',
      icon: '📋',
      color: 'bg-green-50 hover:bg-green-100 border-green-200',
    },
    {
      title: 'Browse Freelancers',
      description: 'Find and connect with skilled professionals.',
      href: '/freelancers', // Assuming a route exists
      icon: '👥',
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    },
    {
      title: 'Account Settings',
      description: 'Update your profile and preferences.',
      href: '/settings', // Assuming a route exists
      icon: '⚙️',
      color: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
    },
  ];

  const tips = [
    'Write clear project descriptions to attract better proposals.',
    'Set realistic budgets and deadlines for quality work.',
    'Review freelancer profiles and portfolios before hiring.',
    'Communicate regularly with your chosen freelancer.',
  ];

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 min-h-0 w-full p-0">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            <div className="mb-8">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Client dashboard</p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900">
                Welcome back, {user?.fullName?.split(' ')[0] || 'Client'}!
              </h1>
              <p className="mt-2 text-slate-600 max-w-2xl">
                Here's an overview of your projects and quick actions to get started.
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {error}
              </div>
            )}

            {/* Stats Cards */}
            {loading ? (
              <div className="grid gap-4 xl:grid-cols-4 mb-8">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-32 bg-slate-200 rounded-3xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-4 mb-8">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Total Projects</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{stats.total}</p>
                  <p className="mt-1 text-sm text-slate-500">Projects posted</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Active Projects</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{stats.active}</p>
                  <p className="mt-1 text-sm text-slate-500">Currently in progress</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Pending Projects</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{stats.pending}</p>
                  <p className="mt-1 text-sm text-slate-500">Awaiting freelancers</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Total Budget</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">${stats.totalBudget.toLocaleString()}</p>
                  <p className="mt-1 text-sm text-slate-500">Across all projects</p>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Quick Actions</h2>
              <div className="grid gap-4 xl:grid-cols-2">
                {quickActions.map((action, index) => (
                  <Link
                    key={index}
                    to={action.href}
                    className={`rounded-3xl border p-6 transition hover:-translate-y-0.5 ${action.color}`}
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-2xl">{action.icon}</span>
                      <div>
                        <p className="font-semibold text-slate-900">{action.title}</p>
                        <p className="mt-1 text-sm text-slate-600">{action.description}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent Projects */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900">Recent Projects</h2>
                <Link to="/client/projects" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
                  View all →
                </Link>
              </div>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 bg-slate-200 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : stats.recentProjects.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
                  <p className="text-slate-500">No projects yet. Start by posting your first project!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.recentProjects.map((project) => (
                    <div key={project.id} className="rounded-3xl border border-slate-200 bg-white p-6 hover:shadow-sm transition">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900">{project.title}</h3>
                          <p className="mt-1 text-sm text-slate-600 line-clamp-2">{project.pDesc}</p>
                          <div className="mt-3 flex items-center gap-4 text-sm text-slate-500">
                            <span>Budget: {project.budget ? `$${project.budget}` : 'Not set'}</span>
                            <span>Status: <span className={`font-semibold ${
                              project.pStatus === 'active' ? 'text-green-600' :
                              project.pStatus === 'pending' ? 'text-yellow-600' :
                              project.pStatus === 'completed' ? 'text-blue-600' : 'text-red-600'
                            }`}>{project.pStatus}</span></span>
                          </div>
                        </div>
                        <Link to={`/client/projects/${project.id}`} className="text-sm font-semibold text-slate-600 hover:text-slate-900">
                          View →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">💡 Tips for Success</h2>
              <ul className="space-y-2">
                {tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-slate-400 mt-0.5">•</span>
                    <p className="text-sm text-slate-700">{tip}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

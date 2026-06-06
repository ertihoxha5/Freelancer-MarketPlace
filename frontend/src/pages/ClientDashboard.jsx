import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Sidebar from '../components/Sidebar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { createClientTestimonial, fetchClientProjects } from '../apiServices.js';
import {
  FiPlusCircle,
  FiFolder,
  FiUsers,
  FiUserCheck,
  FiSettings,
  FiArrowRight,
  FiCheckCircle,
  FiTrendingUp,
  FiDollarSign,
  FiFileText,
} from 'react-icons/fi';

export default function ClientDashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [testimonial, setTestimonial] = useState({
    fullName: '',
    roleTitle: '',
    rating: 5,
    comment: '',
  });
  const [testimonialMessage, setTestimonialMessage] = useState('');
  const [testimonialError, setTestimonialError] = useState('');

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

  // (quickActions and tips arrays removed – replaced with icon-based QuickAction components and recommended steps)

  async function submitTestimonial(event) {
    event.preventDefault();
    setTestimonialMessage('');
    setTestimonialError('');
    try {
      await createClientTestimonial({
        fullName: testimonial.fullName.trim() || user?.fullName || 'Client',
        roleTitle: testimonial.roleTitle.trim() || 'Client',
        rating: Number(testimonial.rating) || 5,
        comment: testimonial.comment.trim(),
      });
      setTestimonialMessage('Thanks! Your testimonial was posted to the homepage.');
      setTestimonial({ fullName: '', roleTitle: '', rating: 5, comment: '' });
    } catch (err) {
      setTestimonialError(err instanceof Error ? err.message : 'Unable to submit testimonial.');
    }
  }

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 min-h-0 w-full p-0">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Welcome back</p>
                <h1 className="mt-1 text-3xl font-semibold text-slate-900">
                  {user?.fullName?.split(' ')[0] || 'Client'}!
                </h1>
                <p className="mt-1 text-slate-600">
                  Manage your projects, hire talent, and grow your business.
                </p>
              </div>
              <div className="flex gap-3">
                <Link
                  to="/client/post-project"
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#1a3c2e] px-5 py-3 text-sm font-semibold text-white hover:bg-[#214b38]"
                >
                  Post New Project <FiArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/client/contracts"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-white"
                >
                  My Contracts &amp; Workspaces
                </Link>
              </div>
            </div>

            {error && (
              <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {error}
              </div>
            )}

            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-28 bg-slate-200 rounded-3xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
                  <div className="flex items-center gap-2 text-slate-500">
                    <FiFolder className="h-4 w-4" />
                    <p className="text-sm font-medium">Total Projects</p>
                  </div>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{stats.total}</p>
                  <p className="mt-1 text-sm text-slate-500">Projects posted</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
                  <div className="flex items-center gap-2 text-slate-500">
                    <FiTrendingUp className="h-4 w-4" />
                    <p className="text-sm font-medium">Active Projects</p>
                  </div>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{stats.active}</p>
                  <p className="mt-1 text-sm text-slate-500">Currently in progress</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
                  <div className="flex items-center gap-2 text-slate-500">
                    <FiUsers className="h-4 w-4" />
                    <p className="text-sm font-medium">Pending Projects</p>
                  </div>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{stats.pending}</p>
                  <p className="mt-1 text-sm text-slate-500">Awaiting freelancers</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
                  <div className="flex items-center gap-2 text-slate-500">
                    <FiDollarSign className="h-4 w-4" />
                    <p className="text-sm font-medium">Total Budget</p>
                  </div>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">${stats.totalBudget.toLocaleString()}</p>
                  <p className="mt-1 text-sm text-slate-500">Across all projects</p>
                </div>
              </div>
            )}

            <div className="mb-8">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500 mb-3">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <QuickAction to="/client/post-project" icon={FiPlusCircle} label="Post New Project" description="Create a brief and attract talent" />
                <QuickAction to="/client/projects" icon={FiFolder} label="My Projects" description={`${stats.total} total • ${stats.active} active`} />
                <QuickAction to="/search?tab=freelancers" icon={FiUsers} label="Browse Freelancers" description="Find skilled professionals" />
                <QuickAction to="/client/hired-freelancers" icon={FiUserCheck} label="Hired Freelancers" description="Review and manage your team" />
                <QuickAction to="/client/contracts" icon={FiFileText} label="Contracts &amp; Workspaces" description="Open active work" />
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900">Recent Projects</h2>
                <Link to="/client/projects" className="inline-flex items-center gap-1 text-sm font-semibold text-[#1a3c2e] hover:underline">
                  View all <FiArrowRight className="h-4 w-4" />
                </Link>
              </div>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 bg-slate-200 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : stats.recentProjects.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center">
                  <p className="text-slate-500">No projects yet. Start by posting your first project!</p>
                  <Link to="/client/post-project" className="mt-3 inline-block text-sm font-semibold text-[#1a3c2e]">
                    Post your first project →
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {stats.recentProjects.map((project) => (
                    <Link
                      key={project.id}
                      to={`/client/projects/${project.id}`}
                      className="group block rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-[#1a3c2e] hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-slate-900 group-hover:text-[#1a3c2e] line-clamp-2">{project.title}</h3>
                        <span className={`ml-2 shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium capitalize border ${
                          project.pStatus === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                          project.pStatus === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          project.pStatus === 'completed' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {project.pStatus}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600 line-clamp-2">{project.pDesc}</p>
                      <div className="mt-3 text-sm font-semibold text-emerald-700">
                        {project.budget ? `$${Number(project.budget).toLocaleString()}` : 'Budget not set'}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <FiCheckCircle className="text-emerald-600" /> Recommended next steps
              </h3>
              <ul className="space-y-2 text-sm">
                {stats.pending > 0 && (
                  <li className="flex gap-2">• Review <Link to="/client/projects" className="font-medium text-[#1a3c2e] underline">pending projects</Link> and proposals</li>
                )}
                <li className="flex gap-2">• <Link to="/search?tab=freelancers" className="font-medium text-[#1a3c2e] underline">Browse freelancers</Link> for your next project</li>
                <li className="flex gap-2">• Visit <Link to="/client/hired-freelancers" className="font-medium text-[#1a3c2e] underline">Hired Freelancers</Link> to leave reviews</li>
                <li className="flex gap-2">• <Link to="/client/contracts" className="font-medium text-[#1a3c2e] underline">Open workspaces</Link> for active contracts</li>
              </ul>
            </div>

            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Share a Testimonial</h2>
              <p className="mt-2 text-sm text-slate-600">Post a public review about your experience using the platform.</p>
              {testimonialMessage ? <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{testimonialMessage}</div> : null}
              {testimonialError ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{testimonialError}</div> : null}
              <form onSubmit={submitTestimonial} className="mt-4 grid gap-4 md:grid-cols-2">
                <input value={testimonial.fullName} onChange={(e) => setTestimonial((curr) => ({ ...curr, fullName: e.target.value }))} placeholder="Full name" className="rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
                <input value={testimonial.roleTitle} onChange={(e) => setTestimonial((curr) => ({ ...curr, roleTitle: e.target.value }))} placeholder="Role / Company" className="rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
                <select value={testimonial.rating} onChange={(e) => setTestimonial((curr) => ({ ...curr, rating: e.target.value }))} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm">
                  {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} Stars</option>)}
                </select>
                <div />
                <textarea value={testimonial.comment} onChange={(e) => setTestimonial((curr) => ({ ...curr, comment: e.target.value }))} placeholder="What do you like most about the platform?" rows={4} className="md:col-span-2 rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
                <div className="md:col-span-2 flex justify-end">
                  <button className="rounded-2xl bg-[#1a3c2e] px-5 py-3 text-sm font-semibold text-white">Publish Testimonial</button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label, description }) {
  return (
    <Link
      to={to}
      className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-[#1a3c2e] hover:shadow-sm"
    >
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-[#1a3c2e] group-hover:text-white transition">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div>
        <div className="font-semibold text-slate-900">{label}</div>
        <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{description}</div>
      </div>
    </Link>
  );
}

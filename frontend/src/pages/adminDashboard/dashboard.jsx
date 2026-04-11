import { useEffect, useState } from 'react';
import Header from '../../components/Header.jsx';
import Sidebar from '../../components/Sidebar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  fetchProjectsWithFreelancer,
  fetchProjectsWithoutFreelancer,
  fetchAdminUsers,
} from '../../apiServices.js';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalProjects: 0,
    projectsWithFreelancer: 0,
    projectsWithoutFreelancer: 0,
    activeProjects: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    async function loadStats() {
      setLoading(true);
      setError('');
      try {
        const [withFL, withoutFL, users] = await Promise.all([
          fetchProjectsWithFreelancer(),
          fetchProjectsWithoutFreelancer(),
          fetchAdminUsers(),
        ]);

        if (alive) {
          const projectsWithFL = Array.isArray(withFL.projects) ? withFL.projects : [];
          const projectsWithoutFL = Array.isArray(withoutFL.projects) ? withoutFL.projects : [];
          const allUsers = Array.isArray(users.users) ? users.users : [];

          const activeCount = projectsWithFL.filter(
            (p) => p.pStatus === 'active'
          ).length;

          setStats({
            totalProjects: projectsWithFL.length + projectsWithoutFL.length,
            projectsWithFreelancer: projectsWithFL.length,
            projectsWithoutFreelancer: projectsWithoutFL.length,
            activeProjects: activeCount,
            totalUsers: allUsers.length,
          });
        }
      } catch (err) {
        if (alive) {
          setError(err instanceof Error ? err.message : 'Failed to load stats.');
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    loadStats();
    return () => {
      alive = false;
    };
  }, []);

  const StatCard = ({ title, value, subtitle, accent }) => (
    <div className={`rounded-3xl border p-6 shadow-sm ${accent}`}>
      <p className="text-sm font-medium text-slate-500 mb-3">{title}</p>
      <p className="text-4xl font-bold text-slate-900">{value}</p>
      {subtitle && <p className="mt-3 text-sm text-slate-500">{subtitle}</p>}
    </div>
  );

  const ActionCard = ({ title, description, href, accent }) => (
    <a
      href={href}
      className={`rounded-3xl border border-slate-200 p-5 text-left transition ${accent} hover:-translate-y-0.5`}
    >
      <p className="text-sm font-semibold text-slate-900 mb-2">{title}</p>
      <p className="text-sm text-slate-600">{description}</p>
    </a>
  );

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 min-h-0 w-full p-0">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />

          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
              <p className="mt-2 text-slate-600">
                Welcome back{user?.fullName ? `, ${user.fullName}` : ''}. Here's what's happening on your platform.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 rounded-lg bg-red-50 p-4 border border-red-200">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Stats Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-32 bg-slate-200 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <StatCard
                  title="Total Projects"
                  value={stats.totalProjects}
                  bgColor="bg-blue-50 hover:bg-blue-100"
                  icon="📊"
                />
                <StatCard
                  title="Active Projects"
                  value={stats.activeProjects}
                  bgColor="bg-green-50 hover:bg-green-100"
                  icon="✅"
                />
                <StatCard
                  title="With Freelancer"
                  value={stats.projectsWithFreelancer}
                  bgColor="bg-purple-50 hover:bg-purple-100"
                  icon="👥"
                />
                <StatCard
                  title="Pending Freelancer"
                  value={stats.projectsWithoutFreelancer}
                  bgColor="bg-yellow-50 hover:bg-yellow-100"
                  icon="⏳"
                />
                <StatCard
                  title="Total Users"
                  value={stats.totalUsers}
                  bgColor="bg-indigo-50 hover:bg-indigo-100"
                  icon="👤"
                />
              </div>
            )}

            {/* Quick Access Section */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Quick Access
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <a
                  href="/adminDashboard/jobs-with-freelancer"
                  className="p-4 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 transition text-center font-medium"
                >
                  Projects with Freelancer
                </a>
                <a
                  href="/adminDashboard/jobs-without-freelancer"
                  className="p-4 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-600 text-white hover:from-yellow-600 hover:to-yellow-700 transition text-center font-medium"
                >
                  Projects Awaiting Freelancer
                </a>
                <a
                  href="/adminDashboard/users"
                  className="p-4 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition text-center font-medium"
                >
                  Manage Users
                </a>
                <a
                  href="/adminDashboard/jobs-with-freelancer"
                  className="p-4 rounded-lg bg-gradient-to-br from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transition text-center font-medium"
                >
                  Create New Project
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
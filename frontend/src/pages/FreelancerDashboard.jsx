import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Header from "../components/Header.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchFreelancerDashboard } from "../apiServices.js";
import {
  FiBriefcase,
  FiFileText,
  FiStar,
  FiDollarSign,
  FiSearch,
  FiUser,
  FiClipboard,
  FiArrowRight,
  FiCheckCircle,
  FiTrendingUp,
} from "react-icons/fi";

export default function FreelancerDashboard() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await fetchFreelancerDashboard();
        if (active) setDashboard(data);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const stats = dashboard?.stats ?? {};
  const profile = dashboard?.profile ?? {};
  const previousProjects = dashboard?.previousProjects ?? [];
  const profileCompletionItems = [
    Boolean(profile.bio),
    Boolean(profile.hourlyRate),
    Boolean(profile.portofoliUrl),
    (profile.skills?.length ?? 0) > 0,
  ];
  const profileCompletion = Math.round(
    (profileCompletionItems.filter(Boolean).length / profileCompletionItems.length) *
      100,
  );

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 min-h-0 w-full p-0">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-t border-slate-200 bg-white lg:flex-row">
          <Sidebar roleID={user?.roleID} />
          <section className="min-h-full min-w-0 flex-1 overflow-auto p-6 sm:p-8">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">
                  Welcome back
                </p>
                <h1 className="mt-1 text-3xl font-semibold text-slate-900">
                  {profile.fullName || user?.fullName || "Freelancer"}
                </h1>
                <p className="mt-1 text-slate-600">
                  Here's what's happening with your freelance work.
                </p>
              </div>
              <div className="flex gap-3">
                {user?.id && (
                  <Link
                    to={`/freelancers/${user.id}`}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-white"
                  >
                    View Public Page
                  </Link>
                )}
                <Link
                  to="/freelancer/contracts"
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#1a3c2e] px-5 py-3 text-sm font-semibold text-white hover:bg-[#214b38]"
                >
                  My Contracts &amp; Workspaces <FiArrowRight className="h-4 w-4" />
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
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="h-28 rounded-3xl bg-slate-200 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
                <StatCard
                  title="Projects"
                  value={stats.totalProjects ?? 0}
                  subtitle={`${stats.completedProjects ?? 0} completed`}
                  icon={FiBriefcase}
                />
                <StatCard
                  title="Applications"
                  value={stats.totalApplications ?? 0}
                  subtitle={`${stats.pendingApplications ?? 0} pending`}
                  icon={FiClipboard}
                />
                <StatCard
                  title="Rating"
                  value={stats.averageRating ?? "-"}
                  subtitle={`${stats.reviewCount ?? 0} reviews`}
                  icon={FiStar}
                />
                <StatCard
                  title="Total Earnings"
                  value={`$${Number(stats.totalEarnings ?? 0).toLocaleString()}`}
                  subtitle={`${stats.completedProjects ?? 0} completed projects`}
                  icon={FiDollarSign}
                />
              </div>
            )}

            {}
            <div className="mb-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-500">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <QuickAction
                  to="/search"
                  icon={FiSearch}
                  label="Browse Projects"
                  description="Find new opportunities"
                />
                <QuickAction
                  to="/freelancer/applications"
                  icon={FiClipboard}
                  label="My Applications"
                  description={`${stats.pendingApplications ?? 0} pending`}
                />
                <QuickAction
                  to="/freelancer/contracts"
                  icon={FiFileText}
                  label="Contracts &amp; Workspaces"
                  description="Open active work"
                />
                <QuickAction
                  to="/freelancer/my-projects"
                  icon={FiBriefcase}
                  label="My Projects"
                  description={`${stats.activeProjects ?? 0} active`}
                />
                <QuickAction
                  to="/freelancer/profile"
                  icon={FiUser}
                  label="Update Profile"
                  description={`${profileCompletion}% complete`}
                />
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-12">
              {}
              <div className="xl:col-span-7 space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-900">Recent Work</h2>
                    <Link
                      to="/freelancer/contracts"
                      className="inline-flex items-center gap-1 text-sm font-semibold text-[#1a3c2e] hover:underline"
                    >
                      View all contracts <FiArrowRight className="h-4 w-4" />
                    </Link>
                  </div>

                  {previousProjects.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                      <p className="text-slate-500">No completed projects yet.</p>
                      <Link to="/search" className="mt-3 inline-block text-sm font-semibold text-[#1a3c2e]">
                        Start browsing projects →
                      </Link>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {previousProjects.slice(0, 3).map((project) => (
                        <Link
                          key={project.id}
                          to="/freelancer/contracts"
                          className="group block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-[#1a3c2e] hover:bg-white"
                        >
                          <div className="flex items-start justify-between">
                            <h3 className="font-semibold text-slate-900 group-hover:text-[#1a3c2e] line-clamp-2">
                              {project.title}
                            </h3>
                            <span className="ml-2 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-medium capitalize text-slate-600 border border-slate-200 shrink-0">
                              {project.contractStatus || project.pStatus}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">Client: {project.clientName}</p>
                          <p className="mt-3 text-sm text-slate-600 line-clamp-2">{project.pDesc || "No description."}</p>
                          {project.totalAmount && (
                            <div className="mt-3 text-sm font-semibold text-emerald-700">
                              ${Number(project.totalAmount).toLocaleString()}
                            </div>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-slate-900">Work at a Glance</h2>
                    <FiTrendingUp className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-sm text-slate-500">Active Projects</div>
                      <div className="mt-1 text-3xl font-semibold text-slate-900">{stats.activeProjects ?? 0}</div>
                      <div className="text-xs text-emerald-600 mt-1">In progress right now</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-sm text-slate-500">Completed</div>
                      <div className="mt-1 text-3xl font-semibold text-slate-900">{stats.completedProjects ?? 0}</div>
                      <div className="text-xs text-slate-500 mt-1">Successfully delivered</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-sm text-slate-500">Pending Applications</div>
                      <div className="mt-1 text-3xl font-semibold text-slate-900">{stats.pendingApplications ?? 0}</div>
                      <div className="text-xs text-amber-600 mt-1">Awaiting client response</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-sm text-slate-500">Reviews Received</div>
                      <div className="mt-1 text-3xl font-semibold text-slate-900">{stats.reviewCount ?? 0}</div>
                      <div className="text-xs text-slate-500 mt-1">From satisfied clients</div>
                    </div>
                  </div>
                </div>
              </div>

              {}
              <div className="xl:col-span-5 space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-slate-900">Your Profile</h2>
                    <Link to="/freelancer/profile" className="text-sm font-semibold text-[#1a3c2e] hover:underline flex items-center gap-1">
                      Edit <FiArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <p className="text-sm text-slate-600 line-clamp-3 min-h-[60px]">
                    {profile.bio || "Write a compelling bio to attract better clients and stand out."}
                  </p>

                  <div className="my-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border bg-white p-3">
                      <div className="text-xs text-slate-500">Hourly Rate</div>
                      <div className="font-semibold mt-0.5 text-slate-900">
                        {profile.hourlyRate ? `$${profile.hourlyRate}/hr` : "Not set"}
                      </div>
                    </div>
                    <div className="rounded-2xl border bg-white p-3">
                      <div className="text-xs text-slate-500">Skills</div>
                      <div className="font-semibold mt-0.5 text-slate-900">
                        {profile.skills?.length ?? 0} listed
                      </div>
                    </div>
                  </div>

                  {}
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-slate-700">Profile strength</span>
                      <span className="font-semibold text-[#1a3c2e]">{profileCompletion}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#1a3c2e] to-emerald-700 transition-all"
                        style={{ width: `${profileCompletion}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      A complete profile gets more views and higher acceptance rates.
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {(profile.skills ?? []).slice(0, 5).map((skill, i) => (
                      <span key={i} className="rounded-full bg-slate-100 px-3 py-0.5 text-xs text-slate-600">
                        {skill.skillName}
                      </span>
                    ))}
                  </div>
                </div>

                {}
                <div className="rounded-3xl bg-gradient-to-br from-[#1a3c2e] to-[#0f2a21] p-6 text-white shadow-sm">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <FiDollarSign className="h-5 w-5" />
                    <span className="uppercase text-xs tracking-[1.5px] font-semibold">Lifetime Earnings</span>
                  </div>
                  <div className="mt-2 text-4xl font-semibold tabular-nums">
                    ${Number(stats.totalEarnings ?? 0).toLocaleString()}
                  </div>
                  <p className="mt-1 text-sm text-emerald-200/90">
                    From {stats.completedProjects ?? 0} completed projects
                  </p>
                  <Link
                    to="/freelancer/payments"
                    className="mt-4 inline-flex items-center text-sm font-semibold text-white/90 hover:text-white"
                  >
                    View payment history <FiArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </div>

                {}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <FiCheckCircle className="text-emerald-600" /> Recommended next steps
                  </h3>
                  <ul className="space-y-2 text-sm">
                    {stats.pendingApplications > 0 && (
                      <li className="flex gap-2">• Check your <Link to="/freelancer/applications" className="font-medium text-[#1a3c2e] underline">pending applications</Link></li>
                    )}
                    {profileCompletion < 80 && (
                      <li className="flex gap-2">• <Link to="/freelancer/profile" className="font-medium text-[#1a3c2e] underline">Complete your profile</Link> to get more opportunities</li>
                    )}
                    <li className="flex gap-2">• <Link to="/search" className="font-medium text-[#1a3c2e] underline">Browse new projects</Link> and submit proposals</li>
                    <li className="flex gap-2">• Visit <Link to="/freelancer/contracts" className="font-medium text-[#1a3c2e] underline">Contracts</Link> to open your workspaces</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon: Icon }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
      <div className="flex items-center gap-2 text-slate-500">
        {Icon && <Icon className="h-4 w-4" />}
        <p className="text-sm font-medium">{title}</p>
      </div>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
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

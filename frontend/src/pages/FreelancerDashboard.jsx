import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Header from "../components/Header.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchFreelancerDashboard } from "../apiServices.js";

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
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">
                  Freelancer dashboard
                </p>
                <h1 className="mt-3 text-3xl font-semibold text-slate-900">
                  {profile.fullName || user?.fullName || "Freelancer"}
                </h1>
                <p className="mt-2 max-w-2xl text-slate-600">
                  Overview of your work, applications, and public profile.
                </p>
              </div>
              {user?.id && (
                <Link
                  to={`/freelancers/${user.id}`}
                  className="rounded-2xl bg-[#1a3c2e] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2a5c46]"
                >
                  View Public Page
                </Link>
              )}
            </div>

            {error && (
              <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {error}
              </div>
            )}

            {loading ? (
              <div className="grid gap-4 xl:grid-cols-4 mb-8">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="h-32 rounded-3xl bg-slate-200 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-4 mb-8">
                <StatCard
                  title="Projects"
                  value={stats.totalProjects ?? 0}
                  subtitle={`${stats.completedProjects ?? 0} completed`}
                />
                <StatCard
                  title="Applications"
                  value={stats.totalApplications ?? 0}
                  subtitle={`${stats.pendingApplications ?? 0} pending`}
                />
                <StatCard
                  title="Rating"
                  value={stats.averageRating ?? "-"}
                  subtitle={`${stats.reviewCount ?? 0} reviews`}
                />
                <StatCard
                  title="Earnings"
                  value={`$${Number(stats.totalEarnings ?? 0).toLocaleString()}`}
                  subtitle={`${stats.completedProjects ?? 0} completed`}
                />
              </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div className="space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-900">Previous Projects</h2>
                    {user?.id && (
                      <Link to={`/freelancers/${user.id}`} className="text-sm font-semibold text-slate-600 hover:text-slate-900">
                        Open public page
                      </Link>
                    )}
                  </div>
                  {previousProjects.length === 0 ? (
                    <p className="text-sm text-slate-500">No previous projects yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {previousProjects.slice(0, 3).map((project) => (
                        <div key={project.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="font-semibold text-slate-900">{project.title}</h3>
                              <p className="mt-1 text-sm text-slate-500">Client: {project.clientName}</p>
                            </div>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold capitalize text-slate-600 border border-slate-200">
                              {project.contractStatus || project.pStatus}
                            </span>
                          </div>
                          <p className="mt-3 text-sm text-slate-600 line-clamp-2">{project.pDesc || "No description."}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-slate-900">Work Summary</h2>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <SummaryCard
                      label="Active projects"
                      value={stats.activeProjects ?? 0}
                      helper="Work currently in progress."
                    />
                    <SummaryCard
                      label="Pending applications"
                      value={stats.pendingApplications ?? 0}
                      helper="Applications awaiting a response."
                    />
                    <SummaryCard
                      label="Completed projects"
                      value={stats.completedProjects ?? 0}
                      helper="Finished work visible in your profile."
                    />
                    <SummaryCard
                      label="Reviews"
                      value={stats.reviewCount ?? 0}
                      helper="Client reviews received so far."
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-slate-900">Profile Snapshot</h2>
                  <p className="mt-3 text-sm text-slate-600">{profile.bio || "Add a short bio to make your public page stronger."}</p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <Snapshot label="Hourly rate" value={profile.hourlyRate ? `$${profile.hourlyRate}/hr` : "Not set"} />
                    <Snapshot label="Skills" value={String(profile.skills?.length ?? 0)} />
                  </div>
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-medium text-slate-700">Profile completion</p>
                      <span className="text-sm font-semibold text-slate-900">{profileCompletion}%</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-[#1a3c2e]"
                        style={{ width: `${profileCompletion}%` }}
                      />
                    </div>
                    <p className="mt-3 text-sm text-slate-500">
                      Complete your profile so clients can understand your skills and past work faster.
                    </p>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {(profile.skills ?? []).slice(0, 6).map((skill) => (
                      <span key={skill.skillID} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {skill.skillName}
                      </span>
                    ))}
                  </div>
                  <Link
                    to="/freelancer/profile"
                    className="mt-5 inline-flex rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Edit Profile
                  </Link>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                  <h2 className="text-xl font-semibold text-slate-900">Assigned Scope</h2>
                  <div className="mt-4 grid gap-3">
                    <InfoCard title="Dashboard" description="Overview of freelancer work statistics and profile summary." />
                    <InfoCard title="Public Profile" description="Personal freelancer page with information, skills, previous projects, and work statistics." />
                    <InfoCard title="Notifications" description="Existing teammate feature kept in navigation but not changed here." />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, subtitle }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function Snapshot({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SummaryCard({ label, value, helper }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{helper}</p>
    </div>
  );
}

function InfoCard({ title, description }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

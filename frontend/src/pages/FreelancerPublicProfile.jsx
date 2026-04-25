import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "../components/Header.jsx";
import { API_BASE, fetchPublicFreelancerProfile } from "../apiServices.js";

export default function FreelancerPublicProfile() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetchPublicFreelancerProfile(id);
        if (active) setData(response);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load freelancer.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [id]);

  const profile = data?.profile ?? {};
  const stats = data?.stats ?? {};
  const previousProjects = data?.previousProjects ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-10">
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid gap-6">
            <div className="h-56 rounded-3xl bg-slate-200 animate-pulse" />
            <div className="h-40 rounded-3xl bg-slate-200 animate-pulse" />
          </div>
        ) : (
          <>
            <section className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-5">
                  <div className="h-24 w-24 overflow-hidden rounded-full bg-slate-200">
                    {profile.picturePath ? (
                      <img
                        src={`${API_BASE}${profile.picturePath}`}
                        alt={profile.fullName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl text-slate-500">
                        ?
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Freelancer</p>
                    <h1 className="mt-2 text-4xl font-semibold text-slate-900">{profile.fullName}</h1>
                    <p className="mt-2 text-slate-600">{profile.bio || "No bio added yet."}</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Chip>{profile.hourlyRate ? `$${profile.hourlyRate}/hr` : "Rate not set"}</Chip>
                      <Chip>{stats.averageRating ?? "-"} rating</Chip>
                      <Chip>{stats.completedProjects ?? 0} completed projects</Chip>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <StatBox label="Applications" value={stats.totalApplications ?? 0} />
                  <StatBox label="Active projects" value={stats.activeProjects ?? 0} />
                  <StatBox label="Reviews" value={stats.reviewCount ?? 0} />
                  <StatBox label="Earnings" value={`$${Number(stats.totalEarnings ?? 0).toLocaleString()}`} />
                </div>
              </div>
            </section>

            <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">Skills / Services</h2>
                {profile.skills?.length ? (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {profile.skills.map((skill) => (
                      <div key={skill.skillID} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="font-semibold text-slate-900">{skill.skillName}</p>
                        <p className="mt-1 text-xs capitalize text-slate-500">
                          {skill.sLevel} · {skill.yearsOfExp} years
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">No skills added yet.</p>
                )}

                {profile.portofoliUrl && (
                  <a
                    href={profile.portofoliUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex rounded-2xl bg-[#1a3c2e] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2a5c46]"
                  >
                    Open Portfolio
                  </a>
                )}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-slate-900">Previous Projects</h2>
                  <Link to="/" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
                    Back to home
                  </Link>
                </div>
                {previousProjects.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">No previous projects available yet.</p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {previousProjects.map((project) => (
                      <article key={project.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">{project.title}</h3>
                            <p className="mt-1 text-sm text-slate-500">Client: {project.clientName}</p>
                          </div>
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold capitalize text-slate-700">
                            {project.contractStatus || project.pStatus}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-600">{project.pDesc || "No description."}</p>
                        <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
                          <span>Budget: {project.budget ? `$${project.budget}` : "-"}</span>
                          <span>Value: {project.totalAmount ? `$${project.totalAmount}` : "-"}</span>
                          <span>Deadline: {formatDate(project.deadline)}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

function Chip({ children }) {
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700">
      {children}
    </span>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

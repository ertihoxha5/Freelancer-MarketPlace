import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  API_BASE,
  fetchFreelancerProfile,
  fetchFreelancerSkills,
  updateFreelancerProfile,
} from "../apiServices.js";

const LEVELS = ["beginner", "intermediate", "advanced", "expert"];

export default function FreelancerProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    picturePath: null,
    hourlyRate: "",
    portofoliUrl: "",
    bio: "",
    skills: [],
  });
  const [availableSkills, setAvailableSkills] = useState([]);
  const [selectedSkillID, setSelectedSkillID] = useState("");
  const [skillLevel, setSkillLevel] = useState("intermediate");
  const [yearsOfExp, setYearsOfExp] = useState("1");
  const [pictureBase64, setPictureBase64] = useState(null);
  const [picturePreview, setPicturePreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [profileData, skillsData] = await Promise.all([
          fetchFreelancerProfile(),
          fetchFreelancerSkills(),
        ]);
        if (!active) return;

        const nextProfile = profileData.profile ?? {};
        setProfile({
          picturePath: nextProfile.picturePath ?? null,
          hourlyRate: nextProfile.hourlyRate ?? "",
          portofoliUrl: nextProfile.portofoliUrl ?? "",
          bio: nextProfile.bio ?? "",
          skills: Array.isArray(nextProfile.skills) ? nextProfile.skills : [],
        });
        setAvailableSkills(Array.isArray(skillsData.skills) ? skillsData.skills : []);
        setPicturePreview(
          nextProfile.picturePath ? `${API_BASE}${nextProfile.picturePath}` : "",
        );
        setPictureBase64(null);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load profile.");
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

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPicturePreview(String(reader.result));
      setPictureBase64(String(reader.result));
    };
    reader.readAsDataURL(file);
  }

  function addSkill() {
    if (!selectedSkillID) return;
    const option = availableSkills.find(
      (entry) => Number(entry.skillID) === Number(selectedSkillID),
    );
    if (!option) return;
    if (profile.skills.some((entry) => Number(entry.skillID) === Number(selectedSkillID))) {
      return;
    }

    setProfile((current) => ({
      ...current,
      skills: [
        ...current.skills,
        {
          skillID: Number(option.skillID),
          skillName: option.skillName,
          categoryName: option.categoryName,
          sLevel: skillLevel,
          yearsOfExp: Number(yearsOfExp) || 0,
        },
      ],
    }));
    setSelectedSkillID("");
    setSkillLevel("intermediate");
    setYearsOfExp("1");
  }

  function removeSkill(skillID) {
    setProfile((current) => ({
      ...current,
      skills: current.skills.filter(
        (entry) => Number(entry.skillID) !== Number(skillID),
      ),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const result = await updateFreelancerProfile({
        hourlyRate: profile.hourlyRate === "" ? null : Number(profile.hourlyRate),
        portofoliUrl: profile.portofoliUrl,
        bio: profile.bio,
        pictureBase64,
        skills: profile.skills.map((skill) => ({
          skillID: skill.skillID,
          sLevel: skill.sLevel,
          yearsOfExp: Number(skill.yearsOfExp) || 0,
        })),
      });

      const nextProfile = result.profile ?? {};
      setProfile({
        picturePath: nextProfile.picturePath ?? profile.picturePath,
        hourlyRate: nextProfile.hourlyRate ?? "",
        portofoliUrl: nextProfile.portofoliUrl ?? "",
        bio: nextProfile.bio ?? "",
        skills: Array.isArray(nextProfile.skills) ? nextProfile.skills : profile.skills,
      });

      if (nextProfile.picturePath) {
        setPicturePreview(`${API_BASE}${nextProfile.picturePath}`);
      }
      setPictureBase64(null);
      setSuccess("Profile saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

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
                  Freelancer profile
                </p>
                <h1 className="mt-3 text-3xl font-semibold text-slate-900">
                  Manage your profile
                </h1>
                <p className="mt-2 max-w-2xl text-slate-600">
                  Update the information, skills, and work details that clients see on your public profile.
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

            <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
              <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 overflow-hidden rounded-full bg-slate-200">
                    {picturePreview ? (
                      <img
                        src={picturePreview}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl text-slate-500">
                        ?
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Freelancer</p>
                    <h2 className="text-xl font-semibold text-slate-900">{user?.fullName}</h2>
                    <p className="text-sm text-slate-500">{user?.email}</p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <SideInfo label="Hourly rate" value={profile.hourlyRate ? `$${profile.hourlyRate}/hr` : "Not set"} />
                  <SideInfo label="Skills" value={String(profile.skills.length)} />
                  <SideInfo label="Portfolio" value={profile.portofoliUrl ? "Added" : "Not set"} />
                </div>
              </aside>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                {error && (
                  <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                    {success}
                  </div>
                )}

                {loading ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                    Loading profile...
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Profile Photo</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600"
                      />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Hourly Rate</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={profile.hourlyRate ?? ""}
                          onChange={(e) =>
                            setProfile((current) => ({
                              ...current,
                              hourlyRate: e.target.value,
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3c2e]"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Portfolio URL</label>
                        <input
                          value={profile.portofoliUrl ?? ""}
                          onChange={(e) =>
                            setProfile((current) => ({
                              ...current,
                              portofoliUrl: e.target.value,
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3c2e]"
                          placeholder="https://"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Bio</label>
                      <textarea
                        value={profile.bio ?? ""}
                        onChange={(e) =>
                          setProfile((current) => ({
                            ...current,
                            bio: e.target.value,
                          }))
                        }
                        rows={5}
                        className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3c2e]"
                      />
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <div className="mb-4">
                        <h2 className="text-lg font-semibold text-slate-900">Skills</h2>
                        <p className="mt-1 text-sm text-slate-500">
                          Add the skills and services clients should see on your freelancer page.
                        </p>
                      </div>

                      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_140px_120px]">
                        <select
                          value={selectedSkillID}
                          onChange={(e) => setSelectedSkillID(e.target.value)}
                          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                        >
                          <option value="">Select a skill</option>
                          {availableSkills
                            .filter(
                              (option) =>
                                !profile.skills.some(
                                  (skill) =>
                                    Number(skill.skillID) === Number(option.skillID),
                                ),
                            )
                            .map((option) => (
                              <option key={option.skillID} value={option.skillID}>
                                {option.skillName}
                              </option>
                            ))}
                        </select>
                        <select
                          value={skillLevel}
                          onChange={(e) => setSkillLevel(e.target.value)}
                          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                        >
                          {LEVELS.map((level) => (
                            <option key={level} value={level}>
                              {level}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="0"
                          value={yearsOfExp}
                          onChange={(e) => setYearsOfExp(e.target.value)}
                          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                          placeholder="Years"
                        />
                        <button
                          type="button"
                          onClick={addSkill}
                          disabled={!selectedSkillID}
                          className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                        >
                          Add Skill
                        </button>
                      </div>

                      {availableSkills.length === 0 && (
                        <p className="mt-3 text-sm text-slate-500">
                          No platform skills are available yet. Add some records to the `Skills` table to populate this list.
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-3">
                        {profile.skills.length === 0 ? (
                          <p className="text-sm text-slate-500">No skills added yet.</p>
                        ) : (
                          profile.skills.map((skill) => (
                            <div
                              key={skill.skillID}
                              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                            >
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{skill.skillName}</p>
                                <p className="text-xs text-slate-500 capitalize">
                                  {skill.sLevel} · {skill.yearsOfExp} years
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeSkill(skill.skillID)}
                                className="text-sm font-semibold text-rose-600 hover:text-rose-700"
                              >
                                Remove
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setPicturePreview(
                            profile.picturePath ? `${API_BASE}${profile.picturePath}` : "",
                          );
                          setPictureBase64(null);
                          setSuccess("");
                          setError("");
                        }}
                        className="mr-3 rounded-2xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Reset Photo
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="rounded-2xl bg-[#1a3c2e] px-6 py-3 text-sm font-semibold text-white hover:bg-[#2a5c46] disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "Save Profile"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function SideInfo({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Sidebar from '../components/Sidebar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { API_BASE, fetchClientProfile, updateClientProfile } from '../apiServices.js';

export default function ClientProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ pictureID: null, picturePath: null, hourlyRate: '', portofoliUrl: '', bio: '' });
  const [picturePreview, setPicturePreview] = useState('');
  const [pictureBase64, setPictureBase64] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const completion = useMemo(() => {
    const fields = [
      user?.fullName ? 1 : 0,
      user?.email ? 1 : 0,
      profile.picturePath ? 1 : 0,
      profile.hourlyRate ? 1 : 0,
      profile.portofoliUrl ? 1 : 0,
      profile.bio ? 1 : 0,
    ];
    const filled = fields.reduce((sum, item) => sum + item, 0);
    return Math.round((filled / fields.length) * 100);
  }, [profile, user]);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      setLoading(true);
      setError('');
      try {
        const data = await fetchClientProfile();
        if (!active) return;
        setProfile({
          pictureID: data.profile?.pictureID ?? null,
          picturePath: data.profile?.picturePath ?? null,
          hourlyRate: data.profile?.hourlyRate ?? '',
          portofoliUrl: data.profile?.portofoliUrl ?? '',
          bio: data.profile?.bio ?? '',
        });
        setPicturePreview(data.profile?.picturePath ? `${API_BASE}${data.profile.picturePath}` : '');
        setPictureBase64(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load profile.');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  function formatCompletionText() {
    if (completion >= 100) return 'Your profile is fully complete.';
    if (completion >= 75) return 'Great job! Just a little more to finish your profile.';
    if (completion >= 50) return 'More than halfway there — keep going!';
    return 'Complete your profile to get better results.';
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPicturePreview(reader.result);
      setPictureBase64(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const payload = {
        hourlyRate: profile.hourlyRate === '' ? null : Number(profile.hourlyRate),
        portofoliUrl: profile.portofoliUrl,
        bio: profile.bio,
      };
      if (pictureBase64) {
        payload.pictureBase64 = pictureBase64;
      }

      const result = await updateClientProfile(payload);
      setProfile((current) => ({
        ...current,
        pictureID: result.profile.pictureID ?? current.pictureID,
        picturePath: result.profile.picturePath ?? current.picturePath,
        hourlyRate: result.profile.hourlyRate ?? current.hourlyRate,
        portofoliUrl: result.profile.portofoliUrl ?? current.portofoliUrl,
        bio: result.profile.bio ?? current.bio,
      }));
      if (result.profile.picturePath) {
        setPicturePreview(`${API_BASE}${result.profile.picturePath}`);
      }
      setSuccess('Profile saved successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save profile.');
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
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">My Profile</p>
                <h1 className="mt-2 text-3xl font-semibold text-slate-900">Manage your profile</h1>
                <p className="mt-2 max-w-2xl text-slate-600">
                  Keep your information up to date so freelancers can understand your needs.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm">
                  <span className="font-semibold text-slate-900">{completion}%</span> complete
                </div>
                <Link
                  to="/client/dashboard"
                  className="rounded-2xl bg-[#1a3c2e] px-5 py-3 text-sm font-semibold text-white hover:bg-[#214b38]"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
              {}
              <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 overflow-hidden rounded-full bg-slate-200 border border-slate-100">
                    {picturePreview ? (
                      <img src={picturePreview} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl text-slate-400">👤</div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Client</p>
                    <h2 className="text-xl font-semibold text-slate-900">{user?.fullName ?? 'Client'}</h2>
                    <p className="text-sm text-slate-500">{user?.email}</p>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-slate-500">Profile completion</span>
                    <span className="font-semibold text-slate-900">{completion}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#1a3c2e] transition-all" style={{ width: `${completion}%` }} />
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{formatCompletionText()}</p>
                </div>

                <div className="mt-6 space-y-3">
                  <SideInfo label="Hourly rate" value={profile.hourlyRate ? `$${profile.hourlyRate}/hr` : "Not set"} />
                  <SideInfo label="Portfolio" value={profile.portofoliUrl ? "Added" : "Not set"} />
                </div>
              </aside>

              {}
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
                      <div className="flex items-center gap-4">
                        <div className="h-20 w-20 overflow-hidden rounded-full bg-slate-200 border">
                          {picturePreview ? (
                            <img src={picturePreview} alt="Preview" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xl text-slate-400">👤</div>
                          )}
                        </div>
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            id="client-photo"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          <label
                            htmlFor="client-photo"
                            className="cursor-pointer inline-flex items-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Change photo
                          </label>
                          {pictureBase64 && (
                            <button
                              type="button"
                              onClick={() => {
                                setPicturePreview(profile.picturePath ? `${API_BASE}${profile.picturePath}` : '');
                                setPictureBase64(null);
                              }}
                              className="ml-2 text-sm text-slate-500 hover:text-rose-600"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Hourly Rate (optional)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={profile.hourlyRate ?? ''}
                          onChange={(e) => setProfile((current) => ({ ...current, hourlyRate: e.target.value }))}
                          className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3c2e]"
                          placeholder="e.g. 45.00"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Portfolio / Company URL</label>
                        <input
                          value={profile.portofoliUrl ?? ''}
                          onChange={(e) => setProfile((current) => ({ ...current, portofoliUrl: e.target.value }))}
                          className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3c2e]"
                          placeholder="https://yourcompany.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Bio / About your company</label>
                      <textarea
                        value={profile.bio ?? ''}
                        onChange={(e) => setProfile((current) => ({ ...current, bio: e.target.value }))}
                        rows={6}
                        className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3c2e]"
                        placeholder="Describe what you're looking for in freelancers and your company..."
                      />
                    </div>

                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setPicturePreview(profile.picturePath ? `${API_BASE}${profile.picturePath}` : '');
                          setPictureBase64(null);
                        }}
                        className="rounded-2xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Reset Photo
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="rounded-2xl bg-[#1a3c2e] px-6 py-3 text-sm font-semibold text-white hover:bg-[#214b38] disabled:opacity-50"
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

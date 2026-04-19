import { useEffect, useMemo, useState } from 'react';
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
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-slate-900">My Profile</h1>
                <p className="mt-2 text-slate-600 max-w-2xl">Complete your profile and upload a photo to personalize your client dashboard.</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{completion}%</span> profile completed
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-4">
                  <div className="h-20 w-20 overflow-hidden rounded-full bg-slate-200">
                    {picturePreview ? (
                      <img src={picturePreview} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl text-slate-500">?</div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Client</p>
                    <h2 className="text-xl font-semibold text-slate-900">{user?.fullName ?? 'Client'}</h2>
                    <p className="text-sm text-slate-500">{user?.email}</p>
                  </div>
                </div>
                <div className="mb-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Profile progress</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${completion}%` }} />
                  </div>
                </div>
                <p className="text-sm text-slate-600">{formatCompletionText()}</p>
                <div className="mt-8 space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">Profile photo</p>
                    <p className="mt-1 text-sm text-slate-600">Upload a photo so freelancers can recognize your brand.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">Portfolio link</p>
                    <p className="mt-1 text-sm text-slate-600">Share a portfolio or company site for stronger proposals.</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                {error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
                {success && <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{success}</div>}
                {loading ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">Loading profile...</div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Profile Photo</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600"
                      />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Hourly Rate</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={profile.hourlyRate ?? ''}
                          onChange={(e) => setProfile((current) => ({ ...current, hourlyRate: e.target.value }))}
                          className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g. 45.00"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Portfolio URL</label>
                        <input
                          value={profile.portofoliUrl ?? ''}
                          onChange={(e) => setProfile((current) => ({ ...current, portofoliUrl: e.target.value }))}
                          className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="https://"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Bio</label>
                      <textarea
                        value={profile.bio ?? ''}
                        onChange={(e) => setProfile((current) => ({ ...current, bio: e.target.value }))}
                        rows={6}
                        className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Tell freelancers about your requirements and company vision."
                      />
                    </div>

                    <div className="flex justify-end gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setPicturePreview(profile.picturePath ? `${API_BASE}${profile.picturePath}` : '');
                          setPictureBase64(null);
                        }}
                        className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Reset Photo
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Profile'}
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

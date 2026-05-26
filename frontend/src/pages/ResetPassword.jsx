import { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import { resetPassword } from '../apiServices';

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const updateField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid or missing reset link. Request a new password reset email.');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword({ token, newPassword: formData.newPassword });
      navigate('/login', {
        replace: true,
        state: { message: 'Password reset successfully. You can now sign in.' },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <Header />
        <div className="flex min-h-[calc(100vh-76px)] items-center justify-center px-6">
          <div className="max-w-md rounded-3xl border border-slate-100 bg-white p-10 text-center shadow-xl">
            <h1 className="text-2xl font-semibold text-slate-900">Invalid reset link</h1>
            <p className="mt-4 text-slate-600">
              This link is missing or invalid. Request a new password reset email.
            </p>
            <Link
              to="/forgot-password"
              className="mt-6 inline-block font-medium text-olive-700 hover:underline"
            >
              Request reset link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />

      <div className="flex min-h-[calc(100vh-76px)] items-center justify-center px-6 py-12">
        <div className="grid w-full max-w-5xl gap-16 md:grid-cols-2">
          <div className="flex flex-col justify-center">
            <h1 className="text-5xl font-semibold text-slate-900 leading-tight">
              Choose a new password
            </h1>
            <p className="mt-4 text-xl text-slate-600">
              Your reset link works once and expires in 24 hours.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-10 shadow-xl">
            <h2 className="mb-8 text-3xl font-semibold text-slate-900">New password</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">
                  New password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={formData.newPassword}
                    onChange={(e) => updateField('newPassword', e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-5 py-4 pr-12 outline-none transition focus:border-olive-600 focus:ring-olive-600"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <FiEyeOff size={22} /> : <FiEye size={22} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-600">
                  Confirm new password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={formData.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-5 py-4 outline-none transition focus:border-olive-600 focus:ring-olive-600"
                  placeholder="Confirm new password"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-[#2f4f2f] py-4 text-lg font-semibold text-white transition hover:bg-[#3a5f3a] disabled:bg-gray-400"
              >
                {submitting ? 'Updating password…' : 'Update password'}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-500">
              <Link to="/login" className="font-medium text-olive-700 hover:underline">
                Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;

import { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { changeUserPassword } from '../apiServices';
import Header from '../components/Header';

function ForgotPassword() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const updateField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const payload = {
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
    };

    setSubmitting(true);
    try {
      await changeUserPassword(payload);
      navigate('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password change failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />

      <div className="flex min-h-[calc(100vh-76px)] items-center justify-center px-6 py-12">
        <div className="grid w-full max-w-5xl gap-16 md:grid-cols-2">
          
          <div className="flex flex-col justify-center">
            <h1 className="text-5xl font-semibold text-slate-900 leading-tight">
              Reset your password
            </h1>
            <p className="mt-4 text-xl text-slate-600">
              Enter your email and choose a new strong password.
            </p>

            <div className="mt-12 space-y-6 text-slate-700">
              <div className="flex gap-4">
                <div className="mt-1 h-6 w-6 rounded-xl bg-olive-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-olive-700 text-xl">✓</span>
                </div>
                <p>Password must be at least 8 characters long</p>
              </div>
              <div className="flex gap-4">
                <div className="mt-1 h-6 w-6 rounded-xl bg-olive-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-olive-700 text-xl">✓</span>
                </div>
                <p>Use a combination of letters, numbers, and special characters</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-10">
            <h2 className="text-3xl font-semibold text-slate-900 mb-8">Change Password</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Email address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-5 py-4 focus:border-olive-600 focus:ring-olive-600 outline-none transition"
                  placeholder="you@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">New password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-5 py-4 pr-12 focus:border-olive-600 focus:ring-olive-600 outline-none transition"
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
                <label className="block text-sm font-medium text-slate-600 mb-2">Confirm new password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => updateField('confirmPassword', e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-5 py-4 pr-12 focus:border-olive-600 focus:ring-olive-600 outline-none transition"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#2f4f2f] hover:bg-[#3a5f3a] disabled:bg-gray-400 transition-all text-white font-semibold py-4 rounded-2xl text-lg"
              >
                {submitting ? 'Updating password...' : 'Update Password'}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-8">
              Remember your password?{' '}
              <span 
                onClick={() => navigate('/login')}
                className="text-olive-700 font-medium hover:underline cursor-pointer"
              >
                Back to Login
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
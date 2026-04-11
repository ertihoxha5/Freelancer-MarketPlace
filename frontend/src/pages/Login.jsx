import { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Header from '../components/Header';

const highlights = [
  'Access to verified and skilled freelancers',
  'Secure milestone payments with full protection',
  'All your projects and communication in one place',
];

function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '' });

  const updateField = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    setSubmitting(true);
    try {
      await signIn({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });
      navigate('/adminDashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />

      <div className="flex min-h-[calc(100vh-76px)] items-center justify-center px-6 py-12">
        <div className="grid w-full max-w-5xl gap-16 md:grid-cols-2">
          {/* Left Side */}
          <div className="flex flex-col justify-center">
            <h1 className="text-5xl font-semibold text-slate-900 leading-tight">
              Welcome back
            </h1>
            <p className="mt-4 text-xl text-slate-600">
              Sign in to continue managing your projects and talent.
            </p>

            <div className="mt-12 space-y-6">
              {highlights.map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="mt-1 h-6 w-6 rounded-xl bg-olive-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-olive-700 text-xl">✓</span>
                  </div>
                  <p className="text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Login Form */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-10">
            <h2 className="text-3xl font-semibold text-slate-900 mb-8">Sign in</h2>

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
                <label className="block text-sm font-medium text-slate-600 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-5 py-4 pr-12 focus:border-olive-600 focus:ring-olive-600 outline-none transition"
                    placeholder="••••••••"
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

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="accent-olive-600"
                  />
                  Remember me
                </label>
                <Link to="/forgotpassword" className="text-olive-700 hover:underline">
                  Forgot password?
                </Link>
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#2f4f2f] hover:bg-[#3a5f3a] disabled:bg-gray-400 text-white font-semibold py-4 rounded-2xl transition text-lg"
              >
                {submitting ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-8">
              New to Freelancer Marketplace?{' '}
              <Link to="/register" className="text-olive-700 font-medium hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
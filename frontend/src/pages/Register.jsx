import { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../apiServices';
import Header from '../components/Header';

const benefits = [
  'Post projects with clear milestones and budgets',
  'Choose your role and start collaborating immediately',
  'Secure payments and full transparency on every step',
];

function Register() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    roleID: '',
  });

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.roleID) {
      setError('Please select your role (Client or Freelancer)');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      roleID: Number(form.roleID),
    };

    setSubmitting(true);
    try {
      await registerUser(payload);
      navigate('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />

      <div className="flex min-h-[calc(100vh-76px)] items-center justify-center px-6 py-12">
        <div className="grid w-full max-w-5xl gap-16 md:grid-cols-2">
          {/* Left Side - Information */}
          <div className="flex flex-col justify-center">
            <h1 className="text-5xl font-semibold text-slate-900 leading-tight">
              Join Freelancer Marketplace
            </h1>
            <p className="mt-4 text-xl text-slate-600">
              Create your account and start connecting with top talent or finding great opportunities.
            </p>

            <div className="mt-12 space-y-6">
              {benefits.map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="mt-1 h-6 w-6 rounded-xl bg-olive-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-olive-700 text-xl">✓</span>
                  </div>
                  <p className="text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-10">
            <h2 className="text-3xl font-semibold text-slate-900 mb-8">Create your account</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Full name</label>
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => updateField('fullName', e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-5 py-4 focus:border-olive-600 focus:ring-olive-600 outline-none transition"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Email address</label>
                <input
                  type="email"
                  required
                  value={form.email}
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
                    value={form.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-5 py-4 pr-12 focus:border-olive-600 focus:ring-olive-600 outline-none transition"
                    placeholder="Create a strong password"
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
                <label className="block text-sm font-medium text-slate-600 mb-2">Confirm password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={form.confirmPassword}
                    onChange={(e) => updateField('confirmPassword', e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-5 py-4 pr-12 focus:border-olive-600 focus:ring-olive-600 outline-none transition"
                    placeholder="Confirm your password"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-3">I want to join as</label>
                <div className="grid grid-cols-2 gap-4">
                  <label 
                    className={`rounded-2xl border p-5 cursor-pointer transition-all text-center ${
                      form.roleID === '2' 
                        ? 'border-olive-600 bg-olive-50' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="roleID"
                      value="2"
                      checked={form.roleID === '2'}
                      onChange={(e) => updateField('roleID', e.target.value)}
                      className="hidden"
                    />
                    <p className="font-semibold text-slate-900">Client</p>
                    <p className="text-sm text-slate-500 mt-1">I want to hire talent</p>
                  </label>

                  <label 
                    className={`rounded-2xl border p-5 cursor-pointer transition-all text-center ${
                      form.roleID === '3' 
                        ? 'border-olive-600 bg-olive-50' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="roleID"
                      value="3"
                      checked={form.roleID === '3'}
                      onChange={(e) => updateField('roleID', e.target.value)}
                      className="hidden"
                    />
                    <p className="font-semibold text-slate-900">Freelancer</p>
                    <p className="text-sm text-slate-500 mt-1">I want to offer services</p>
                  </label>
                </div>
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#2f4f2f] hover:bg-[#3a5f3a] disabled:bg-gray-400 transition-all text-white font-semibold py-4 rounded-2xl text-lg"
              >
                {submitting ? 'Creating account...' : 'Create account'}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-8">
              Already have an account?{' '}
              <Link to="/login" className="text-olive-700 font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
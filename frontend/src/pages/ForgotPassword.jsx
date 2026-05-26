import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { requestPasswordReset } from '../apiServices';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const data = await requestPasswordReset(email.trim().toLowerCase());
      setSuccess(
        data.message ||
          'If an account exists for that email, a password reset link has been sent.',
      );
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed. Please try again.');
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
              Forgot your password?
            </h1>
            <p className="mt-4 text-xl text-slate-600">
              Enter the email for your account and we will send you a one-time link to reset your password.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-10 shadow-xl">
            <h2 className="mb-8 text-3xl font-semibold text-slate-900">Reset password</h2>

            {success ? (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-green-800">
                <p>{success}</p>
                <Link
                  to="/login"
                  className="mt-4 inline-block font-medium text-olive-700 hover:underline"
                >
                  Back to sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    className="w-full rounded-2xl border border-slate-200 px-5 py-4 outline-none transition focus:border-olive-600 focus:ring-olive-600"
                    placeholder="you@company.com"
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-2xl bg-[#2f4f2f] py-4 text-lg font-semibold text-white transition hover:bg-[#3a5f3a] disabled:bg-gray-400"
                >
                  {submitting ? 'Sending link…' : 'Send reset link'}
                </button>
              </form>
            )}

            <p className="mt-8 text-center text-sm text-slate-500">
              Remember your password?{' '}
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

export default ForgotPassword;

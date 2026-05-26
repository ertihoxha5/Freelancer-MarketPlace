import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import { verifyEmail } from '../apiServices';

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const emailHint = searchParams.get('email') || '';
  const tokenFromUrl = searchParams.get('token') || '';

  const [status, setStatus] = useState(tokenFromUrl ? 'verifying' : 'pending');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!tokenFromUrl) return;

    let cancelled = false;

    (async () => {
      try {
        const data = await verifyEmail(tokenFromUrl);
        if (!cancelled) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully.');
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setMessage(err instanceof Error ? err.message : 'Verification failed.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tokenFromUrl]);

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />

      <div className="flex min-h-[calc(100vh-76px)] items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-10 shadow-xl text-center">
          {status === 'pending' && (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-olive-100 text-3xl text-olive-700">
                ✉
              </div>
              <h1 className="text-3xl font-semibold text-slate-900">Check your email</h1>
              <p className="mt-4 text-slate-600 leading-relaxed">
                We sent a verification link
                {emailHint ? (
                  <>
                    {' '}
                    to <span className="font-medium text-slate-900">{emailHint}</span>
                  </>
                ) : (
                  ' to your inbox'
                )}
                . Open the link to activate your account, then sign in.
              </p>
            </>
          )}

          {status === 'verifying' && (
            <>
              <h1 className="text-3xl font-semibold text-slate-900">Verifying email…</h1>
              <p className="mt-4 text-slate-600">Please wait while we confirm your address.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-700">
                ✓
              </div>
              <h1 className="text-3xl font-semibold text-slate-900">Email verified</h1>
              <p className="mt-4 text-slate-600">{message}</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl text-red-600">
                !
              </div>
              <h1 className="text-3xl font-semibold text-slate-900">Verification failed</h1>
              <p className="mt-4 text-red-600">{message}</p>
              <p className="mt-4 text-sm text-slate-500">
                The link may have expired. Register again or contact support if the problem continues.
              </p>
            </>
          )}

          <Link
            to="/login"
            className="mt-8 inline-block rounded-2xl bg-[#2f4f2f] px-8 py-3 font-semibold text-white transition hover:bg-[#3a5f3a]"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;

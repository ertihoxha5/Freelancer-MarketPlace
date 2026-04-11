import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const roleLabel = (roleID) => {
  if (Number(roleID) === 1) return 'Admin';
  if (Number(roleID) === 2) return 'Client';
  if (Number(roleID) === 3) return 'Freelancer';
  return 'Member';
};

const Header = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      navigate('/login');
    }
  };

  return (
    <nav className="bg-white border-b sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="text-3xl font-bold tracking-tighter bg-gradient-to-r from-blue-600 via-purple-600 to-teal-500 bg-clip-text text-transparent">
              Freelancer
            </span>
            <span className="text-xl font-semibold text-slate-900 hidden sm:inline">MARKETPLACE</span>
          </Link>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-600">
            Build great teams
          </span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link to="/" className="hover:text-slate-900 transition">Home</Link>
            <Link to="/features" className="hover:text-slate-900 transition">Features</Link>
            <Link to="/about" className="hover:text-slate-900 transition">About</Link>
            <Link to="/contact" className="hover:text-slate-900 transition">Contact</Link>
          </div>

          {loading ? (
            <span className="text-sm text-slate-500">Checking session...</span>
          ) : user ? (
            <div className="flex flex-wrap items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">
                <span className="font-semibold">Hi, {user.fullName?.split(' ')[0] ?? 'there'}</span>
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-emerald-700">
                  {roleLabel(user.roleID)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/login"
                className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-full bg-gradient-to-r from-blue-600 to-teal-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-blue-700 hover:to-teal-600"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Header;

import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

const roleLabel = (roleID) => {
  if (Number(roleID) === 1) return 'Admin';
  if (Number(roleID) === 2) return 'Client';
  if (Number(roleID) === 3) return 'Freelancer';
  return 'Member';
};

const Header = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      navigate('/login');
    }
  };

  return (
    <nav className="bg-[#1a3c2e] border-b border-[#2a5c46] sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        
        {/* Logo */}
        <Link to="/" className="inline-flex items-center gap-2">
          <span className="text-3xl font-bold tracking-tighter text-[#a3c9a3]">
            Freelancer
          </span>
          <span className="text-2xl font-semibold text-white tracking-tight">MARKETPLACE</span>
        </Link>

        {/* Navigation + Controls */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
          
          {/* Main Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/90">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <Link to="/features" className="hover:text-white transition-colors">Features</Link>
            <Link to="/about" className="hover:text-white transition-colors">About</Link>
            <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>

          {/* Language Selector - Fixed */}
          <div className="relative">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-[#2a5c46] border border-white/30 text-white text-sm rounded-full px-4 py-2.5 focus:outline-none focus:border-white/50 transition-colors appearance-none pr-8 cursor-pointer"
            >
              <option value="en">English</option>
              <option value="al">Shqip</option>
              <option value="de">Deutsch</option>
              <option value="it">Italiano</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
            </select>
            
            {/* Custom dropdown arrow */}
            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/70">
              ▼
            </div>
          </div>

          {/* Auth Buttons / User Info */}
          {loading ? (
            <span className="text-sm text-white/70">Loading...</span>
          ) : user ? (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3 rounded-full bg-white/10 px-5 py-2 text-sm text-white">
                Hi, {user.fullName?.split(' ')[0]}
                <span className="bg-white/20 px-3 py-1 rounded-full text-xs uppercase tracking-widest">
                  {roleLabel(user.roleID)}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-full bg-white/10 hover:bg-white/20 px-6 py-2 text-sm font-medium text-white transition"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="rounded-full border border-white/30 hover:border-white/60 px-6 py-2 text-sm font-medium text-white transition"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-full bg-[#4a7043] hover:bg-[#5a8a52] px-6 py-2 text-sm font-semibold text-white transition shadow-sm"
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
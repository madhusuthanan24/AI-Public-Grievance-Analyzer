import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, LogOut, User as UserIcon, Menu } from 'lucide-react';

export default function Navbar({ onMenuToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabel =
    user?.role === 'admin'
      ? 'Administrator'
      : user?.role === 'officer'
      ? 'Department Officer'
      : 'Citizen';

  const roleBadgeColor =
    user?.role === 'admin'
      ? 'bg-violet-100 text-violet-800'
      : user?.role === 'officer'
      ? 'bg-sky-100 text-sky-800'
      : 'bg-emerald-100 text-emerald-800';

  const homeLink =
    user?.role === 'admin'
      ? '/admin/dashboard'
      : user?.role === 'officer'
      ? '/officer/dashboard'
      : '/citizen/dashboard';

  return (
    <nav className="bg-white border-b border-slate-200/80 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            {user && (
              <button
                type="button"
                onClick={onMenuToggle}
                className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 focus:outline-none"
                aria-label="Toggle menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}

            <Link to={user ? homeLink : '/'} className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600 text-white shadow-xs">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900 tracking-tight text-base leading-tight">
                  Public Grievance <span className="text-violet-600">Analyzer</span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium">AI-Powered Citizen Services</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {!user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/landing"
                  className="hidden sm:inline-block px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Features
                </Link>
                <Link
                  to="/about"
                  className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  About
                </Link>
                <Link
                  to="/login"
                  className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-violet-600 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg shadow-xs transition-colors"
                >
                  Register
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-semibold text-slate-800 leading-none">{user.name}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 ${roleBadgeColor}`}>
                    {roleLabel}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg transition-all font-medium"
                  title="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

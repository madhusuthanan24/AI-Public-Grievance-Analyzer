import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FilePlus,
  Files,
  Search,
  User,
  LogOut,
  BarChart2,
  Users,
  Building2,
  Settings,
  ClipboardList,
  CheckCircle,
  X
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Citizen Navigation
  const citizenItems = [
    { to: '/citizen/dashboard', icon: LayoutDashboard, label: 'Citizen Dashboard' },
    { to: '/citizen/submit', icon: FilePlus, label: 'Submit Grievance' },
    { to: '/citizen/grievances', icon: Files, label: 'My Grievances' },
    { to: '/citizen/track', icon: Search, label: 'Track Grievance' },
    { to: '/citizen/profile', icon: User, label: 'Profile' }
  ];

  // Admin Navigation
  const adminItems = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Admin Dashboard' },
    { to: '/admin/grievances', icon: Files, label: 'All Grievances' },
    { to: '/admin/analytics', icon: BarChart2, label: 'Analytics' },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/departments', icon: Building2, label: 'Departments' },
    { to: '/admin/settings', icon: Settings, label: 'Settings' }
  ];

  // Officer Navigation
  const officerItems = [
    { to: '/officer/dashboard', icon: LayoutDashboard, label: 'Officer Dashboard' },
    { to: '/officer/assigned', icon: ClipboardList, label: 'Assigned Grievances' },
    { to: '/officer/history', icon: CheckCircle, label: 'History' },
    { to: '/officer/profile', icon: User, label: 'Profile' }
  ];

  let items = citizenItems;
  if (user?.role === 'admin') items = adminItems;
  if (user?.role === 'officer') items = officerItems;

  const content = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300 w-64 border-r border-slate-800">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-violet-400 block mb-0.5">
            {user?.role === 'admin' ? 'Administration' : user?.role === 'officer' ? 'Department Desk' : 'Citizen Portal'}
          </span>
          <p className="text-sm font-semibold text-white truncate max-w-[180px]">{user?.name || 'User'}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-violet-600 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 rounded-lg transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block shrink-0">{content}</aside>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={onClose} />
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  );
}

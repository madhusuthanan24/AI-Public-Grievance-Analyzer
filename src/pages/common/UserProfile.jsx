import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { User, Mail, Shield, Building2, Calendar } from 'lucide-react';

export default function UserProfile() {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <span className="text-xs font-bold text-violet-600 uppercase tracking-widest">Account</span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-0.5">User Profile</h1>
          <p className="text-xs text-slate-500 font-light mt-1">
            Registered account information and assigned authorization role.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
            <div className="h-16 w-16 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xl">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-100 uppercase">
                {user?.role}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block mb-1">Email Address</span>
              <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-slate-400" />
                {user?.email}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block mb-1">Platform Role</span>
              <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-slate-400" />
                {user?.role?.toUpperCase()}
              </span>
            </div>

            {user?.department && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 col-span-full">
                <span className="text-slate-400 block mb-1">Assigned Department</span>
                <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  {user.department.name || user.department}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

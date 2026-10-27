import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import {
  ShieldCheck,
  ArrowRight,
  LogIn,
  Info,
  Sparkles,
  User,
  UserCheck,
  Building2,
  FileText,
  Clock,
  Compass,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function IndexPage() {
  const { user } = useAuth();

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin/dashboard';
    if (user.role === 'officer') return '/officer/dashboard';
    return '/citizen/dashboard';
  };

  const roleLabel =
    user?.role === 'admin'
      ? 'Administrator'
      : user?.role === 'officer'
      ? 'Department Officer'
      : 'Citizen';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1">
        {/* Logged-in Quick Return Banner */}
        {user && (
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 px-4 shadow-xs">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-violet-200 shrink-0" />
                <span>
                  Welcome back, <strong>{user.name}</strong>! You are logged in as a{' '}
                  <span className="underline font-semibold">{roleLabel}</span>.
                </span>
              </div>
              <Link
                to={getDashboardPath()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-violet-700 font-bold text-xs hover:bg-violet-50 transition-colors shadow-xs shrink-0"
              >
                <span>Go to Your Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24 bg-white border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-xs font-semibold mb-6 shadow-2xs">
                <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                <span>Public Grievance Portal & AI Resolution System</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
                AI-Powered <span className="text-violet-600">Public Grievance</span> Portal
              </h1>

              <p className="mt-5 text-base sm:text-lg text-slate-600 font-light leading-relaxed max-w-2xl mx-auto">
                A centralized municipal gateway connecting citizens with public departments and administrators.
                Submit complaints with photographic evidence, leverage multimodal AI for automated triage and solution recommendations, and monitor real-time resolution progress.
              </p>

              {/* Core Index Navigation Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
                <Link
                  to="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm shadow-md shadow-violet-200 transition-all cursor-pointer"
                >
                  <span>Get Started / Register</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-sm transition-all cursor-pointer bg-white shadow-2xs"
                >
                  <LogIn className="h-4 w-4 text-violet-600" />
                  <span>Login</span>
                </Link>

                <Link
                  to="/about"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold text-sm transition-all cursor-pointer border border-transparent"
                >
                  <Info className="h-4 w-4 text-slate-400" />
                  <span>Learn More</span>
                </Link>
              </div>

              {/* Secondary link to comprehensive landing page showcase */}
              <div className="mt-6 pt-6 border-t border-slate-100 text-xs text-slate-500">
                <span>Looking for the full feature tour? </span>
                <Link
                  to="/landing"
                  className="font-semibold text-violet-600 hover:text-violet-800 inline-flex items-center gap-1 ml-1"
                >
                  <span>View Landing Page & System Features</span>
                  <Compass className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Dedicated Role Portals Section */}
        <section className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-violet-600 uppercase tracking-widest">
              Access By Role
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Select Your Portal Gateway
            </h2>
            <p className="text-sm text-slate-500 font-light mt-2">
              The platform provides dedicated, role-separated workspaces tailored for citizens, field officers, and central administrators.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Citizen Portal Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 mb-4">
                  <User className="h-6 w-6" />
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider mb-2">
                  Public Citizen
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Citizen Reporting Portal</h3>
                <p className="text-xs text-slate-500 font-light leading-relaxed mb-4">
                  Report infrastructure defects, road hazards, sanitation failures, or water leaks with location details and image attachments. Track status updates and review resolution outcomes.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-2">
                <Link
                  to="/citizen/submit"
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 text-xs font-semibold text-slate-700 hover:text-emerald-800 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-emerald-600" />
                    <span>Submit New Grievance</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>

                <Link
                  to="/citizen/grievances"
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span>Track Your Grievances</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Officer Desk Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="h-12 w-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100 mb-4">
                  <UserCheck className="h-6 w-6" />
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 uppercase tracking-wider mb-2">
                  Municipal Officers
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Officer Investigation Desk</h3>
                <p className="text-xs text-slate-500 font-light leading-relaxed mb-4">
                  Authorized department staff review assigned civic complaints, inspect evidence attachments, generate AI-powered engineering solutions, and log official field action taken.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <Link
                  to="/officer/dashboard"
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-sky-50 text-xs font-semibold text-slate-700 hover:text-sky-800 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-sky-600" />
                    <span>Open Officer Dashboard</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Central Admin Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="h-12 w-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100 mb-4">
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-800 uppercase tracking-wider mb-2">
                  Administration
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Central Admin Oversight</h3>
                <p className="text-xs text-slate-500 font-light leading-relaxed mb-4">
                  Supervise civic triage across all municipal sectors, oversee duplicate detections, reassign departments, audit AI solutions, and monitor service level agreements (SLAs).
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <Link
                  to="/admin/dashboard"
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-violet-50 text-xs font-semibold text-slate-700 hover:text-violet-800 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-violet-600" />
                    <span>Open Admin Dashboard</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section className="bg-white border-y border-slate-200/80 py-14 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Core Architectural Capabilities
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-light mt-1">
                Built with modern full-stack web technologies and cloud AI infrastructure.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Sparkles className="h-4 w-4 text-violet-600" />
                  <span>Gemini Multimodal AI</span>
                </div>
                <p className="text-slate-500 font-light leading-relaxed">
                  Automatic analysis of photographic evidence and grievance text for priority estimation and classification.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Role-Based Access Control</span>
                </div>
                <p className="text-slate-500 font-light leading-relaxed">
                  Strict cryptographic JWT authorization separating citizens, municipal officers, and central administrators.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Building2 className="h-4 w-4 text-sky-600" />
                  <span>Automated Routing</span>
                </div>
                <p className="text-slate-500 font-light leading-relaxed">
                  Instant routing to Road, Water, Electricity, Sanitation, Healthcare, and Public Safety municipal desks.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span>SLA & Resolution Monitoring</span>
                </div>
                <p className="text-slate-500 font-light leading-relaxed">
                  Live monitoring of turnaround times, overdue tickets (&gt;48h), and official resolution remarks.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200/80 py-8 px-4 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-violet-600" />
          <span className="font-semibold text-slate-700">AI-Powered Public Grievance Analyzer</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500 font-light">Academic Project Prototype</span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-slate-600">
          <Link to="/about" className="hover:text-violet-600 transition-colors">
            About Project
          </Link>
          <span className="text-slate-300">•</span>
          <span className="text-slate-400">Not an official government site</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-400">Demo Simulation</span>
        </div>
      </div>
    </footer>
  );
}

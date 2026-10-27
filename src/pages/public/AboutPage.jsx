import { Link } from 'react-router-dom';
import { ShieldCheck, Cpu, Database, Users, CheckCircle, ArrowLeft } from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';

export default function AboutPage() {
  const stack = [
    { title: 'Frontend Framework', desc: 'React 19 with Vite, React Router 7, and Tailwind CSS v4' },
    { title: 'Backend & Routing', desc: 'Express.js RESTful API Gateway with secure JWT middleware' },
    { title: 'Database & Fallback', desc: 'Mongoose / MongoDB with resilient in-memory offline fallback' },
    { title: 'AI Integration', desc: 'Google Gemini 2.5 Flash via official @google/genai TypeScript SDK' },
    { title: 'Authentication', desc: 'Bcrypt password hashing & role-based access control (RBAC)' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8 w-full">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Home
        </Link>

        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-xs mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-xs font-semibold mb-4 border border-violet-100">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Academic Demonstration System</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            About the AI Public Grievance Analyzer
          </h1>

          <p className="text-sm sm:text-base text-slate-600 font-light leading-relaxed mb-6">
            The <strong>AI-Powered Public Grievance Analyzer</strong> is designed as a college capstone project to explore
            how artificial intelligence can modernize civic complaint redressal systems. In traditional governance setups,
            millions of grievances arrive in unstructured text formats, resulting in classification delays, wrong department
            assignments, and neglected life-threatening emergencies.
          </p>

          <p className="text-sm text-slate-600 font-light leading-relaxed mb-6">
            This application demonstrates an end-to-end operational flow: citizens register issues through an accessible
            portal; Gemini AI automatically structures, classifies, and evaluates risk; and government administrators and
            officers manage tickets with an audit log of remarks and status transitions.
          </p>

          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium mb-8">
            <strong>Important Notice:</strong> This project is an independent educational prototype developed for college
            demonstrations and viva evaluation. It is not affiliated with or directly integrated into any municipal, state,
            or federal government agency.
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-4">Technology Architecture</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stack.map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <h3 className="text-xs font-bold text-violet-700 uppercase tracking-wider mb-1">{item.title}</h3>
                <p className="text-xs text-slate-600 font-light">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

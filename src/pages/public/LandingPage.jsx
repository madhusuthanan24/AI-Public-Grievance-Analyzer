import { Link } from 'react-router-dom';
import {
  FileText,
  Cpu,
  Building,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Search,
  Sparkles,
  Zap,
  Clock,
  Layers
} from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';

export default function LandingPage() {
  const steps = [
    {
      num: '01',
      title: 'Submit Grievance',
      desc: 'Citizens file a public service complaint with description, location, and optional evidence photo.',
      icon: FileText
    },
    {
      num: '02',
      title: 'AI Analysis',
      desc: 'Google Gemini analyzes text to extract entities, classify the category, and rate urgency.',
      icon: Cpu
    },
    {
      num: '03',
      title: 'Department Assignment',
      desc: 'The grievance is routed to the designated administrative department officer.',
      icon: Building
    },
    {
      num: '04',
      title: 'Resolution Tracking',
      desc: 'Track investigation updates, status progression, and officer resolution remarks in real time.',
      icon: CheckCircle
    }
  ];

  const features = [
    {
      title: 'Easy Grievance Submission',
      desc: 'Intuitive submission form with automatic location detection and image evidence uploads.',
      icon: Sparkles
    },
    {
      title: 'AI-Powered Analysis',
      desc: 'Leverages modern Gemini models to extract structured insights without manual delays.',
      icon: Cpu
    },
    {
      title: 'Automatic Categorization',
      desc: 'Accurately assigns grievances to categories like Roads, Water, Electricity, and Sanitation.',
      icon: Layers
    },
    {
      title: 'Priority & Urgency Detection',
      desc: 'Evaluates public safety risks to flag critical hazards for immediate administrative response.',
      icon: Zap
    },
    {
      title: 'Automated Department Routing',
      desc: 'Routes complaints directly to relevant municipal or state departments seamlessly.',
      icon: Building
    },
    {
      title: 'Transparent Status Tracking',
      desc: 'Provides full audit logs with historical remarks from submission through resolution.',
      icon: Clock
    }
  ];

  const stats = [
    { label: 'Demonstration Tickets Processed', value: '1,420+' },
    { label: 'AI Classification Accuracy', value: '96.4%' },
    { label: 'Departments Configured', value: '6 Active' },
    { label: 'Average Routing Time', value: '< 2.5s' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-200/80 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-200/80 text-violet-700 text-xs font-semibold mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Next-Generation Civic Technology Prototype</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
              AI-Powered <span className="text-violet-600">Public Grievance</span> Analyzer
            </h1>

            <p className="mt-6 text-base sm:text-lg text-slate-600 font-light leading-relaxed">
              Empowering citizens to report public infrastructure and civic issues directly. Our integrated AI analyzes
              complaint urgency, identifies appropriate departments, and eliminates administrative bottlenecks.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm shadow-md shadow-violet-200 transition-all"
              >
                <span>Submit a Grievance</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-all"
              >
                <Search className="h-4 w-4 text-slate-400" />
                <span>Track Grievance / Login</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-xs font-bold text-violet-600 uppercase tracking-widest">Workflow</h2>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">How the System Works</p>
          <p className="text-sm text-slate-500 font-light mt-2">
            A transparent four-step lifecycle bridging citizens, intelligence engines, and administrative officers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((st) => {
            const Icon = st.icon;
            return (
              <div
                key={st.num}
                className="relative bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-black text-slate-200">{st.num}</span>
                    <div className="h-10 w-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mb-2">{st.title}</h3>
                  <p className="text-xs text-slate-500 font-light leading-relaxed">{st.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Key Features */}
      <section className="py-16 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-bold text-violet-600 uppercase tracking-widest">Core Capabilities</h2>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">Key System Features</p>
            <p className="text-sm text-slate-500 font-light mt-2">
              Designed with robust backend APIs, role isolation, and real-time AI classification assistance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <div
                  key={i}
                  className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-violet-300 transition-colors"
                >
                  <div className="h-10 w-10 rounded-lg bg-white text-violet-600 flex items-center justify-center border border-slate-200 mb-4 shadow-2xs">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-2">{feat.title}</h3>
                  <p className="text-xs text-slate-600 font-light leading-relaxed">{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Demo Statistics */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 border border-slate-800">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">Demonstration Metrics</span>
            <h2 className="text-2xl sm:text-3xl font-bold mt-1">Simulated Operational Performance</h2>
            <p className="text-xs text-slate-400 font-light mt-2">
              Values represent academic evaluation tests and prototype workload benchmarks.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            {stats.map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="text-3xl sm:text-4xl font-extrabold text-violet-400 mb-1">{item.value}</div>
                <div className="text-xs text-slate-400 font-medium">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

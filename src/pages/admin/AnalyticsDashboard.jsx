import { useState, useEffect } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts';
import { TrendingUp, Clock, CheckCircle, AlertCircle, FileText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/analytics/summary');
        setData(res.data);
      } catch (err) {
        setError('Failed to load analytics data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-violet-600 uppercase tracking-widest">
              Executive Reporting
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">
              Analytics & Trends
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-light mt-1">
              Cross-departmental performance metrics, category distribution, and resolution velocity.
            </p>
          </div>

          <Link
            to="/admin/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Dashboard
          </Link>
        </div>

        {loading ? (
          <LoadingSpinner text="Aggregating performance indicators..." />
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center text-rose-700 text-xs">
            {error}
          </div>
        ) : !data ? null : (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-xs text-slate-500 font-medium">Total Volume</span>
                <span className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 block">
                  {data.summary?.totalCount || 0}
                </span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-xs text-slate-500 font-medium">Active / Pending</span>
                <span className="text-2xl sm:text-3xl font-bold text-sky-600 mt-1 block">
                  {data.summary?.pendingCount || 0}
                </span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-xs text-slate-500 font-medium">Resolved Cases</span>
                <span className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1 block">
                  {data.summary?.resolvedCount || 0}
                </span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-xs text-slate-500 font-medium">Avg Resolution (hrs)</span>
                <span className="text-2xl sm:text-3xl font-bold text-violet-600 mt-1 block">
                  {(data.summary?.avgResolutionTimeHours || 0).toFixed(1)}
                </span>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Breakdown */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
                <h3 className="text-base font-bold text-slate-900 mb-1">Grievances by Category</h3>
                <p className="text-xs text-slate-500 font-light mb-6">Distribution of citizen reports across sectors</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.categoryDistribution || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Monthly Trend */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
                <h3 className="text-base font-bold text-slate-900 mb-1">6-Month Intake Velocity</h3>
                <p className="text-xs text-slate-500 font-light mb-6">Monthly trends of logged grievances</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.monthlyTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

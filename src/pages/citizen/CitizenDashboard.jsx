import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import GrievanceTable from '../../components/grievance/GrievanceTable';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Button from '../../components/common/Button';
import {
  FilePlus,
  Files,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function CitizenDashboard() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/complaints/my');
      setComplaints(res.data);
    } catch (err) {
      console.error(err);
      setError('Unable to load your grievances. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const totalGrievances = complaints.length;
  const submittedCount = complaints.filter(
    (c) => c.status === 'Submitted' || c.status === 'Under Review' || c.status === 'SUBMITTED'
  ).length;
  const inProgressCount = complaints.filter(
    (c) => c.status === 'In Progress' || c.status === 'IN_PROGRESS' || c.status === 'Assigned'
  ).length;
  const resolvedCount = complaints.filter(
    (c) => c.status === 'Resolved' || c.status === 'RESOLVED'
  ).length;

  const cards = [
    { title: 'Total Grievances', count: totalGrievances, icon: Files, color: 'text-violet-600 bg-violet-50 border-violet-100' },
    { title: 'Submitted / Review', count: submittedCount, icon: Clock, color: 'text-sky-600 bg-sky-50 border-sky-100' },
    { title: 'In Progress', count: inProgressCount, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 border-amber-100' },
    { title: 'Resolved', count: resolvedCount, icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-violet-600 uppercase tracking-widest">Citizen Portal</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">
              Welcome back, {user?.name || 'Citizen'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-light mt-1">
              File municipal complaints, inspect AI categorization, and track official status in real time.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={fetchComplaints}
              loading={loading}
            >
              Refresh
            </Button>
            <Link to="/citizen/submit">
              <Button size="sm" icon={FilePlus}>
                Submit New Grievance
              </Button>
            </Link>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <div
                key={i}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between"
              >
                <div>
                  <p className="text-xs text-slate-500 font-medium">{card.title}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">{card.count}</p>
                </div>
                <div className={`p-3 rounded-xl border ${card.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Grievances Section */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Grievances</h2>
              <p className="text-xs text-slate-500 font-light">List of your recently lodged service requests</p>
            </div>
            {complaints.length > 0 && (
              <Link
                to="/citizen/grievances"
                className="text-xs font-semibold text-violet-600 hover:text-violet-700 flex items-center gap-1"
              >
                View all ({complaints.length})
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {loading ? (
            <LoadingSpinner text="Fetching your grievances..." />
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
              {error}
            </div>
          ) : complaints.length === 0 ? (
            <EmptyState
              title="No grievances lodged yet"
              description="You haven't reported any public issues yet. Click below to submit your first grievance."
              actionLabel="Submit Grievance"
              onAction={() => window.location.href = '/citizen/submit'}
            />
          ) : (
            <GrievanceTable
              grievances={complaints.slice(0, 5)}
              basePath="/citizen/grievances"
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

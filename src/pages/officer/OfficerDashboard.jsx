import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import GrievanceTable from '../../components/grievance/GrievanceTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import {
  Building2,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Award,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function OfficerDashboard() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      setError('');
      // Module 7.14: Data isolation - fetch grievances assigned specifically to this officer
      const res = await api.get('/complaints/officer');
      setComplaints(res.data || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Unable to retrieve assigned grievances.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const total = complaints.length;
  const assignedNew = complaints.filter(
    (c) => (c.status || '').toUpperCase() === 'ASSIGNED'
  ).length;
  const inProgress = complaints.filter(
    (c) => (c.status || '').toUpperCase() === 'IN_PROGRESS' || (c.status || '').toUpperCase() === 'UNDER_REVIEW'
  ).length;
  const resolved = complaints.filter(
    (c) => (c.status || '').toUpperCase() === 'RESOLVED' || (c.status || '').toUpperCase() === 'CLOSED'
  ).length;

  const deptName = user?.department?.name || 'Assigned Department';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Officer Header Card */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 text-xs font-semibold mb-2 border border-sky-500/30">
              <Building2 className="h-3.5 w-3.5" />
              <span>{deptName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Officer Desk: {user?.name || 'Officer'}
            </h1>
            <p className="text-xs text-slate-400 font-light mt-1">
              Internal municipal prototype desk. Review grievances assigned to your jurisdiction by administration.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={fetchComplaints}
            loading={loading}
          >
            Refresh Queue
          </Button>
        </div>

        {/* Assigned Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-xs text-slate-500 font-medium block">Assigned To Me</span>
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 block">{total}</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-xs text-slate-500 font-medium block">Newly Assigned</span>
            <span className="text-2xl sm:text-3xl font-bold text-sky-600 mt-1 block">{assignedNew}</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-xs text-slate-500 font-medium block">In Progress</span>
            <span className="text-2xl sm:text-3xl font-bold text-amber-600 mt-1 block">{inProgress}</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-xs text-slate-500 font-medium block">Resolved By Desk</span>
            <span className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1 block">{resolved}</span>
          </div>
        </div>

        {/* Assigned Complaints Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">My Assigned Grievances</h2>
              <p className="text-xs text-slate-500 font-light">
                Grievances specifically assigned to you within {deptName}
              </p>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner text="Loading assigned complaints..." />
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">{error}</div>
          ) : complaints.length === 0 ? (
            <EmptyState
              title="No grievances currently assigned to your desk"
              description="When central administration assigns a grievance in your department to you, it will appear here."
            />
          ) : (
            <GrievanceTable
              grievances={complaints}
              basePath="/officer/grievances"
              showCitizen={true}
              showDepartment={true}
              showOfficer={false}
              showConfidence={true}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

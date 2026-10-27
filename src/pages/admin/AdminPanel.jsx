import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import GrievanceTable from '../../components/grievance/GrievanceTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import {
  Files,
  Clock,
  CheckCircle,
  AlertTriangle,
  Flame,
  Search,
  Filter,
  RefreshCw,
  Users,
  Building2,
  TrendingUp,
  ArrowRight,
  ArrowUpDown,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { GRIEVANCE_CATEGORIES, GRIEVANCE_PRIORITIES } from '../../utils/constants';

export default function AdminPanel() {
  const [complaints, setComplaints] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDepartment, setFilterDepartment] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      setError('');
      const [complaintsRes, deptsRes] = await Promise.all([
        api.get('/complaints/admin'),
        api.get('/departments').catch(() => ({ data: [] }))
      ]);
      setComplaints(complaintsRes.data || []);
      setDepartments(deptsRes.data || []);
    } catch (err) {
      console.error(err);
      setError('Unable to load grievances for administrator view.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  // Priority weight map for administrative sorting
  const PRIORITY_WEIGHTS = {
    'CRITICAL': 4,
    'HIGH': 3,
    'MEDIUM': 2,
    'LOW': 1
  };

  // Metrics directly computed from stored complaints data (Module 6.19)
  const total = complaints.length;
  const submitted = complaints.filter((c) => (c.status || '').toUpperCase() === 'SUBMITTED').length;
  const aiAnalyzed = complaints.filter((c) => (c.status || '').toUpperCase() === 'AI_ANALYZED').length;
  const highPriority = complaints.filter((c) => (c.priority || '').toUpperCase() === 'HIGH').length;
  const critical = complaints.filter((c) => (c.priority || '').toUpperCase() === 'CRITICAL').length;
  const reviewedCount = complaints.filter((c) => c.isReviewed).length;

  const filtered = complaints.filter((c) => {
    const sTerm = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !sTerm ||
      (c.grievanceId || '').toLowerCase().includes(sTerm) ||
      (c.title || '').toLowerCase().includes(sTerm) ||
      (c.description || '').toLowerCase().includes(sTerm) ||
      (c.location || '').toLowerCase().includes(sTerm) ||
      (c.userId?.name || '').toLowerCase().includes(sTerm) ||
      (c._id || '').toLowerCase().includes(sTerm);

    const matchesCategory = filterCategory === 'ALL' || c.category === filterCategory;
    const matchesPriority = filterPriority === 'ALL' || (c.priority || '').toUpperCase() === filterPriority;
    
    const normStatus = (c.status || '').toUpperCase().replace(/\s+/g, '_');
    const matchesStatus =
      filterStatus === 'ALL' || normStatus === filterStatus;

    const matchesDepartment =
      filterDepartment === 'ALL' ||
      (c.assignedDepartment?.name || '').toLowerCase().includes(filterDepartment.toLowerCase()) ||
      (c.assignedDepartment?._id || '') === filterDepartment;

    return matchesSearch && matchesCategory && matchesPriority && matchesStatus && matchesDepartment;
  });

  // Client-side administrative sort order (Module 6.6)
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'oldest') {
      return new Date(a.createdAt) - new Date(b.createdAt);
    }
    if (sortBy === 'priority_desc') {
      const pA = PRIORITY_WEIGHTS[(a.priority || '').toUpperCase()] || 0;
      const pB = PRIORITY_WEIGHTS[(b.priority || '').toUpperCase()] || 0;
      return pB - pA;
    }
    if (sortBy === 'priority_asc') {
      const pA = PRIORITY_WEIGHTS[(a.priority || '').toUpperCase()] || 0;
      const pB = PRIORITY_WEIGHTS[(b.priority || '').toUpperCase()] || 0;
      return pA - pB;
    }
    // Default: newest
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-violet-600 uppercase tracking-widest">
              Central Administration
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">Admin Grievance Review & Management</h1>
            <p className="text-xs sm:text-sm text-slate-500 font-light mt-1">
              Search, filter, inspect AI triage recommendations, and review civic tickets.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchComplaints} loading={loading}>
              Refresh
            </Button>
            <Link to="/admin/analytics">
              <Button size="sm" variant="secondary" icon={TrendingUp}>
                Analytics
              </Button>
            </Link>
          </div>
        </div>

        {/* Executive Metrics Grid (Module 6.19) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] text-slate-500 font-medium block">Total Grievances</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">{total}</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] text-slate-500 font-medium block">Submitted</span>
            <span className="text-2xl font-bold text-sky-600 mt-1 block">{submitted}</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] text-slate-500 font-medium block flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-violet-500" />
              <span>AI Analyzed</span>
            </span>
            <span className="text-2xl font-bold text-violet-600 mt-1 block">{aiAnalyzed}</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] text-slate-500 font-medium block">High Priority</span>
            <span className="text-2xl font-bold text-rose-600 mt-1 block">{highPriority}</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] text-slate-500 font-medium block">Critical Hazards</span>
            <span className="text-2xl font-bold text-red-700 mt-1 block">{critical}</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] text-slate-500 font-medium block flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span>Admin Reviewed</span>
            </span>
            <span className="text-2xl font-bold text-emerald-600 mt-1 block">{reviewedCount}</span>
          </div>
        </div>

        {/* Filter and Search Bar (Module 6.4 - 6.6) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="sm:col-span-2">
              <Input
                name="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Grievance ID, title, landmark, citizen..."
                icon={Search}
              />
            </div>

            <div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs px-3 focus:outline-none focus:ring-2 focus:ring-violet-200"
              >
                <option value="ALL">All Categories</option>
                {GRIEVANCE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs px-3 focus:outline-none focus:ring-2 focus:ring-violet-200"
              >
                <option value="ALL">All Priorities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs px-3 focus:outline-none focus:ring-2 focus:ring-violet-200"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="AI_ANALYZED">AI Analyzed</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>

            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs px-3 focus:outline-none focus:ring-2 focus:ring-violet-200"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
                <option value="priority_desc">Sort: Highest Priority</option>
                <option value="priority_asc">Sort: Lowest Priority</option>
              </select>
            </div>
          </div>

          {/* Department Filter Sub-row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-600">Recommended Department:</span>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="h-8 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs px-2.5 focus:outline-none focus:ring-2 focus:ring-violet-200"
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d._id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {(searchTerm || filterCategory !== 'ALL' || filterPriority !== 'ALL' || filterStatus !== 'ALL' || filterDepartment !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setFilterCategory('ALL');
                  setFilterPriority('ALL');
                  setFilterStatus('ALL');
                  setFilterDepartment('ALL');
                  setSortBy('newest');
                }}
              >
                Clear All Filters
              </Button>
            )}
          </div>
        </div>

        {/* Grievances Master Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">All Grievances Register</h2>
              <p className="text-xs text-slate-500 font-light">
                Showing {sorted.length} of {complaints.length} registered grievances
              </p>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner text="Retrieving administrative data..." />
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">{error}</div>
          ) : sorted.length === 0 ? (
            <EmptyState
              title="No grievances match criteria"
              description="Adjust the search term or clear the active category and department filters."
              actionLabel="Reset Filters"
              onAction={() => {
                setSearchTerm('');
                setFilterCategory('ALL');
                setFilterPriority('ALL');
                setFilterStatus('ALL');
                setFilterDepartment('ALL');
                setSortBy('newest');
              }}
            />
          ) : (
            <GrievanceTable
              grievances={sorted}
              basePath="/admin/grievances"
              showCitizen={true}
              showDepartment={true}
              showOfficer={true}
              showConfidence={true}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

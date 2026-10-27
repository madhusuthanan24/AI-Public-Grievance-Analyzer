import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { getResolutionMonitoring, submitAdminReview } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import GrievanceTable from '../../components/grievance/GrievanceTable';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/grievance/PriorityBadge';
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
  CheckCircle2,
  ShieldCheck,
  XCircle,
  RotateCcw,
  AlertOctagon,
  Eye,
  ExternalLink,
  Check,
  FileText
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

  // Tabs: 'register' | 'resolution-monitoring'
  const [activeTab, setActiveTab] = useState('register');

  // Resolution Monitoring State
  const [monitoringData, setMonitoringData] = useState({ metrics: {}, complaints: [] });
  const [monitoringLoading, setMonitoringLoading] = useState(false);
  const [monitoringError, setMonitoringError] = useState('');
  const [monitorDept, setMonitorDept] = useState('ALL');
  const [monitorPriority, setMonitorPriority] = useState('ALL');
  const [monitorStatus, setMonitorStatus] = useState('ALL');
  const [monitorOverdueOnly, setMonitorOverdueOnly] = useState(false);

  // Quick Action Modal state
  const [activeReviewItem, setActiveReviewItem] = useState(null);
  const [reviewAction, setReviewAction] = useState('APPROVED');
  const [adminNotesInput, setAdminNotesInput] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

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

  const fetchResolutionMonitoring = async () => {
    try {
      setMonitoringLoading(true);
      setMonitoringError('');
      const res = await getResolutionMonitoring({
        department: monitorDept,
        priority: monitorPriority,
        status: monitorStatus,
        overdueOnly: monitorOverdueOnly
      });
      setMonitoringData(res.data || { metrics: {}, complaints: [] });
    } catch (err) {
      console.error(err);
      setMonitoringError('Failed to load resolution monitoring data.');
    } finally {
      setMonitoringLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
    fetchResolutionMonitoring();
  }, []);

  useEffect(() => {
    if (activeTab === 'resolution-monitoring') {
      fetchResolutionMonitoring();
    }
  }, [activeTab, monitorDept, monitorPriority, monitorStatus, monitorOverdueOnly]);

  const handleOpenReviewModal = (complaint, action) => {
    setActiveReviewItem(complaint);
    setReviewAction(action);
    setAdminNotesInput('');
  };

  const handleSubmitAdminReview = async (e) => {
    if (e) e.preventDefault();
    if (!activeReviewItem) return;
    try {
      setReviewSubmitting(true);
      const targetId = activeReviewItem.grievanceId || activeReviewItem._id;
      await submitAdminReview(targetId, {
        decision: reviewAction,
        adminNotes: adminNotesInput
      });
      setActionSuccessMsg(`Successfully recorded admin determination: ${reviewAction}.`);
      setActiveReviewItem(null);
      setAdminNotesInput('');
      fetchResolutionMonitoring();
      fetchComplaints();
      setTimeout(() => setActionSuccessMsg(''), 5000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit review decision');
    } finally {
      setReviewSubmitting(false);
    }
  };

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
              Search, filter, inspect AI triage recommendations, and supervise AI-driven resolution workflows.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={() => {
                if (activeTab === 'register') fetchComplaints();
                else fetchResolutionMonitoring();
              }}
              loading={loading || monitoringLoading}
            >
              Refresh
            </Button>
            <Link to="/admin/analytics">
              <Button size="sm" variant="secondary" icon={TrendingUp}>
                Analytics
              </Button>
            </Link>
          </div>
        </div>

        {/* Action success alert */}
        {actionSuccessMsg && (
          <div className="p-3.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{actionSuccessMsg}</span>
            </div>
            <button
              onClick={() => setActionSuccessMsg('')}
              className="text-emerald-700 hover:text-emerald-900 font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Administrative Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-2 rounded-t-xl">
          <button
            onClick={() => setActiveTab('register')}
            className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'register'
                ? 'border-violet-600 text-violet-700 bg-violet-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Files className="h-4 w-4" />
            <span>Grievances Register</span>
            <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700 font-semibold">
              {total}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('resolution-monitoring');
              fetchResolutionMonitoring();
            }}
            className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'resolution-monitoring'
                ? 'border-violet-600 text-violet-700 bg-violet-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="h-4 w-4 text-violet-600" />
            <span>AI Resolution Oversight & Monitoring</span>
            {monitoringData?.metrics?.pendingAdminApproval > 0 && (
              <span className="ml-1.5 px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                {monitoringData.metrics.pendingAdminApproval} Pending Approval
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: GRIEVANCES REGISTER & TRIAGE */}
        {activeTab === 'register' && (
          <div className="space-y-6">
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
        )}

        {/* TAB 2: AI RESOLUTION OVERSIGHT & MONITORING */}
        {activeTab === 'resolution-monitoring' && (
          <div className="space-y-6">
            {/* Resolution Monitoring KPI Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                <span className="text-[11px] text-slate-500 font-medium block">Total Monitored</span>
                <span className="text-2xl font-bold text-slate-900 mt-1 block">
                  {monitoringData.metrics?.totalComplaints || 0}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {monitoringData.metrics?.totalRecommendations || 0} AI plans generated
                </span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-amber-200/80 shadow-xs bg-amber-50/20">
                <span className="text-[11px] text-amber-700 font-medium block flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Pending Officer Review</span>
                </span>
                <span className="text-2xl font-bold text-amber-700 mt-1 block">
                  {monitoringData.metrics?.pendingOfficerReview || 0}
                </span>
                <span className="text-[10px] text-amber-600 mt-0.5 block">Awaiting field officer review</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-indigo-200/80 shadow-xs bg-indigo-50/20">
                <span className="text-[11px] text-indigo-700 font-medium block flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Pending Admin Oversight</span>
                </span>
                <span className="text-2xl font-bold text-indigo-700 mt-1 block">
                  {monitoringData.metrics?.pendingAdminApproval || 0}
                </span>
                <span className="text-[10px] text-indigo-600 mt-0.5 block">Ready for Central sign-off</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-emerald-200/80 shadow-xs bg-emerald-50/20">
                <span className="text-[11px] text-emerald-700 font-medium block flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Admin Approved</span>
                </span>
                <span className="text-2xl font-bold text-emerald-700 mt-1 block">
                  {monitoringData.metrics?.approvedCount || 0}
                </span>
                <span className="text-[10px] text-emerald-600 mt-0.5 block">Officially approved plans</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-rose-200/80 shadow-xs bg-rose-50/20">
                <span className="text-[11px] text-rose-700 font-medium block flex items-center gap-1">
                  <AlertOctagon className="h-3 w-3 text-rose-600" />
                  <span>Overdue Tickets (&gt;48h)</span>
                </span>
                <span className="text-2xl font-bold text-rose-700 mt-1 block">
                  {monitoringData.metrics?.overdueCount || 0}
                </span>
                <span className="text-[10px] text-rose-600 mt-0.5 block">Urgent priority</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-sky-200/80 shadow-xs bg-sky-50/20">
                <span className="text-[11px] text-sky-700 font-medium block flex items-center gap-1">
                  <Clock className="h-3 w-3 text-sky-600" />
                  <span>Avg Turnaround</span>
                </span>
                <span className="text-2xl font-bold text-sky-700 mt-1 block">
                  {monitoringData.metrics?.avgResolutionHours || 0}h
                </span>
                <span className="text-[10px] text-sky-600 mt-0.5 block">Historical resolution speed</span>
              </div>
            </div>

            {/* Resolution Monitoring Filters */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Department */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Department</label>
                    <select
                      value={monitorDept}
                      onChange={(e) => setMonitorDept(e.target.value)}
                      className="h-9 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs px-3 focus:outline-none focus:ring-2 focus:ring-violet-200"
                    >
                      <option value="ALL">All Departments</option>
                      {departments.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Priority</label>
                    <select
                      value={monitorPriority}
                      onChange={(e) => setMonitorPriority(e.target.value)}
                      className="h-9 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs px-3 focus:outline-none focus:ring-2 focus:ring-violet-200"
                    >
                      <option value="ALL">All Priorities</option>
                      <option value="CRITICAL">Critical</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Workflow Status</label>
                    <select
                      value={monitorStatus}
                      onChange={(e) => setMonitorStatus(e.target.value)}
                      className="h-9 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs px-3 focus:outline-none focus:ring-2 focus:ring-violet-200"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="SUBMITTED">Submitted</option>
                      <option value="AI_ANALYZED">AI Analyzed</option>
                      <option value="ASSIGNED">Assigned</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                    </select>
                  </div>

                  {/* Overdue Only Filter */}
                  <div className="pt-5">
                    <button
                      type="button"
                      onClick={() => setMonitorOverdueOnly(!monitorOverdueOnly)}
                      className={`h-9 px-3.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                        monitorOverdueOnly
                          ? 'bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-200'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <AlertOctagon className="h-3.5 w-3.5 text-rose-600" />
                      <span>Overdue Only (&gt;48h)</span>
                    </button>
                  </div>
                </div>

                {(monitorDept !== 'ALL' || monitorPriority !== 'ALL' || monitorStatus !== 'ALL' || monitorOverdueOnly) && (
                  <div className="pt-5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setMonitorDept('ALL');
                        setMonitorPriority('ALL');
                        setMonitorStatus('ALL');
                        setMonitorOverdueOnly(false);
                      }}
                    >
                      Reset Monitoring Filters
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Resolution Monitoring Complaints Register */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-600" />
                    <span>Resolution Oversight Roster</span>
                  </h2>
                  <p className="text-xs text-slate-500 font-light mt-0.5">
                    Real-time oversight of AI resolution plans, officer actions, and central administrative approvals.
                  </p>
                </div>
                <span className="text-xs text-slate-400">
                  Showing {monitoringData.complaints?.length || 0} monitored tickets
                </span>
              </div>

              {monitoringLoading ? (
                <div className="py-12">
                  <LoadingSpinner text="Retrieving resolution oversight data..." />
                </div>
              ) : monitoringError ? (
                <div className="m-6 p-4 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
                  {monitoringError}
                </div>
              ) : !monitoringData.complaints || monitoringData.complaints.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    title="No grievances match the resolution monitoring filters"
                    description="Adjust the filters or check back once officers process incoming complaints."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        <th className="py-3 px-4">Grievance & Citizen</th>
                        <th className="py-3 px-3">Dept & Priority</th>
                        <th className="py-3 px-3">AI Solution Plan</th>
                        <th className="py-3 px-3">Officer Review & Action</th>
                        <th className="py-3 px-3">Admin Decision</th>
                        <th className="py-3 px-3">Age / Urgency</th>
                        <th className="py-3 px-4 text-right">Oversight Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monitoringData.complaints.map((item) => {
                        const rec = item.latestRecommendation;
                        const hasAI = !!rec;
                        const officerDec = rec?.officerDecision || 'PENDING';
                        const adminDec = rec?.adminDecision || 'PENDING';
                        const isOverdue = item.isOverdue;

                        return (
                          <tr key={item._id} className="hover:bg-slate-50/60 transition-colors">
                            {/* Grievance & Citizen */}
                            <td className="py-3.5 px-4 max-w-xs">
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="font-mono text-xs font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-200">
                                  {item.grievanceId || `GRV-${String(item._id).slice(-6).toUpperCase()}`}
                                </span>
                                <StatusBadge status={item.status} />
                              </div>
                              <p className="font-semibold text-slate-900 truncate" title={item.title}>
                                {item.title}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                By {item.userId?.name || 'Citizen'} • {item.location}
                              </p>
                            </td>

                            {/* Dept & Priority */}
                            <td className="py-3.5 px-3 whitespace-nowrap">
                              <span className="font-medium text-slate-700 block mb-1">
                                {item.assignedDepartment?.name || 'Unassigned'}
                              </span>
                              <PriorityBadge priority={item.priority} />
                            </td>

                            {/* AI Solution Plan */}
                            <td className="py-3.5 px-3 max-w-xs">
                              {hasAI ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-800">
                                      v{rec.version} Plan
                                    </span>
                                    {rec.generatedResult?.confidence && (
                                      <span className="text-[10px] font-medium text-slate-500">
                                        {Math.round(rec.generatedResult.confidence * 100)}% conf
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-600 line-clamp-2" title={rec.generatedResult?.recommendedSolution}>
                                    {rec.generatedResult?.recommendedSolution || 'Automated engineering solution available.'}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">No AI plan generated</span>
                              )}
                            </td>

                            {/* Officer Review & Action */}
                            <td className="py-3.5 px-3 max-w-xs">
                              {hasAI ? (
                                <div className="space-y-1">
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                      officerDec === 'ACCEPTED'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : officerDec === 'MODIFIED'
                                        ? 'bg-sky-50 text-sky-700 border-sky-200'
                                        : officerDec === 'REJECTED'
                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                    }`}
                                  >
                                    Officer: {officerDec}
                                  </span>
                                  {rec.officerActionTaken && (
                                    <p className="text-[11px] text-slate-600 line-clamp-1 italic" title={rec.officerActionTaken}>
                                      Action: "{rec.officerActionTaken}"
                                    </p>
                                  )}
                                  {item.assignedOfficerId && (
                                    <p className="text-[10px] text-slate-400">
                                      {item.assignedOfficerId.name}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400">—</span>
                              )}
                            </td>

                            {/* Admin Decision */}
                            <td className="py-3.5 px-3 whitespace-nowrap">
                              {hasAI ? (
                                <div className="space-y-1">
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                      adminDec === 'APPROVED'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : adminDec === 'NEEDS_REVISION'
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : adminDec === 'REJECTED'
                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                        : 'bg-slate-100 text-slate-700 border-slate-200'
                                    }`}
                                  >
                                    Admin: {adminDec}
                                  </span>
                                  {rec.adminNotes && (
                                    <p className="text-[10px] text-slate-500 max-w-[140px] truncate" title={rec.adminNotes}>
                                      {rec.adminNotes}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400">—</span>
                              )}
                            </td>

                            {/* Age / Urgency */}
                            <td className="py-3.5 px-3 whitespace-nowrap">
                              <span className="text-slate-600 block">
                                {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                              {isOverdue && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 mt-1">
                                  <AlertOctagon className="h-3 w-3" />
                                  <span>&gt;48h Overdue</span>
                                </span>
                              )}
                            </td>

                            {/* Oversight Action */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {hasAI && adminDec !== 'APPROVED' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenReviewModal(item, 'APPROVED')}
                                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                                      title="Approve AI resolution plan"
                                    >
                                      <Check className="h-3 w-3" />
                                      <span>Approve</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleOpenReviewModal(item, 'NEEDS_REVISION')}
                                      className="px-2 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors cursor-pointer"
                                      title="Return to officer for revision"
                                    >
                                      Revise
                                    </button>
                                  </>
                                )}

                                <Link
                                  to={`/admin/grievances/${item._id}`}
                                  className="p-1.5 text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                                  title="Open full administrative inspection view"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Admin Quick Review Modal */}
            {activeReviewItem && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-violet-600" />
                        <span>Central Administrative Oversight Decision</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {activeReviewItem.grievanceId || `GRV-${String(activeReviewItem._id).slice(-6).toUpperCase()}`} • {activeReviewItem.title}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveReviewItem(null)}
                      className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  {activeReviewItem.latestRecommendation && (
                    <div className="p-3 bg-violet-50/60 rounded-xl border border-violet-100 text-xs space-y-1">
                      <span className="font-bold text-violet-900 block">AI Recommended Solution Excerpt:</span>
                      <p className="text-violet-800 line-clamp-3">
                        {activeReviewItem.latestRecommendation.generatedResult?.recommendedSolution}
                      </p>
                      {activeReviewItem.latestRecommendation.officerActionTaken && (
                        <p className="text-[11px] text-slate-600 pt-1 border-t border-violet-200/50">
                          <strong>Officer Field Action:</strong> {activeReviewItem.latestRecommendation.officerActionTaken}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Decision Options */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">Oversight Determination:</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setReviewAction('APPROVED')}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          reviewAction === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-400 ring-2 ring-emerald-200'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Approve</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setReviewAction('NEEDS_REVISION')}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          reviewAction === 'NEEDS_REVISION'
                            ? 'bg-amber-50 text-amber-800 border-amber-400 ring-2 ring-amber-200'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <RotateCcw className="h-4 w-4 text-amber-600" />
                        <span>Needs Revision</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setReviewAction('REJECTED')}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          reviewAction === 'REJECTED'
                            ? 'bg-rose-50 text-rose-800 border-rose-400 ring-2 ring-rose-200'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <XCircle className="h-4 w-4 text-rose-600" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>

                  {/* Admin Notes Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Administrative Notes & Audit Instructions (Optional):
                    </label>
                    <textarea
                      rows={3}
                      value={adminNotesInput}
                      onChange={(e) => setAdminNotesInput(e.target.value)}
                      placeholder="Add compliance notes, required changes for revision, or approval justification..."
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-200"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveReviewItem(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      loading={reviewSubmitting}
                      onClick={handleSubmitAdminReview}
                    >
                      Confirm Oversight Determination
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/grievance/PriorityBadge';
import StatusTimeline from '../../components/grievance/StatusTimeline';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import {
  ArrowLeft,
  MapPin,
  CheckCircle,
  AlertCircle,
  Send,
  Calendar,
  Building2,
  User,
  Sparkles,
  Info,
  ShieldCheck,
  Lightbulb,
  FileCheck,
  ExternalLink,
  FileText,
  History,
  UserCheck,
  Play,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

const STATUS_OPTIONS = [
  'SUBMITTED',
  'AI_ANALYZED',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'REJECTED',
  'CLOSED'
];

export default function ComplaintReview() {
  const { id } = useParams();
  const { user } = useAuth();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Processing state
  const [processingRemark, setProcessingRemark] = useState('');
  const [officerAction, setOfficerAction] = useState('');
  const [resolutionRemark, setResolutionRemark] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' });

  const fetchComplaint = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/complaints/${id}`);
      setComplaint(res.data);
      if (res.data.officerRemarks) setProcessingRemark(res.data.officerRemarks);
      if (res.data.officerAction) setOfficerAction(res.data.officerAction);
      if (res.data.resolutionRemark) setResolutionRemark(res.data.resolutionRemark);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load complaint');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaint();
  }, [id]);

  const isAssignedOfficer = complaint && (
    (complaint.assignedOfficerId?._id || complaint.assignedOfficerId) === user?._id ||
    user?.role === 'admin'
  );

  const currentStatus = (complaint?.status || '').toUpperCase().replace(/\s+/g, '_');

  // Action 1: Start Processing (ASSIGNED -> IN_PROGRESS)
  const handleStartProcessing = async () => {
    try {
      setActionLoading(true);
      setFeedbackMsg({ type: '', text: '' });
      const res = await api.put(`/complaints/${id}/status`, {
        status: 'IN_PROGRESS',
        remark: 'Officer started processing the grievance.'
      });
      setComplaint(res.data);
      setFeedbackMsg({ type: 'success', text: 'Status changed to IN_PROGRESS. Grievance is now actively under investigation.' });
      setTimeout(() => setFeedbackMsg({ type: '', text: '' }), 6000);
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Failed to start processing.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Action 2: Save Processing Remarks & Action Taken (While IN_PROGRESS)
  const handleSaveProcessingInfo = async (e) => {
    e?.preventDefault();
    if (!processingRemark.trim() && !officerAction.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Please enter a processing remark or action taken.' });
      return;
    }

    try {
      setActionLoading(true);
      setFeedbackMsg({ type: '', text: '' });
      const res = await api.put(`/complaints/${id}/status`, {
        status: 'IN_PROGRESS',
        remark: processingRemark.trim(),
        officerAction: officerAction.trim()
      });
      setComplaint(res.data);
      setFeedbackMsg({ type: 'success', text: 'Processing remarks and action taken saved to grievance log.' });
      setTimeout(() => setFeedbackMsg({ type: '', text: '' }), 6000);
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save processing information.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Action 3: Resolve Grievance (IN_PROGRESS -> RESOLVED)
  const handleResolveGrievance = async (e) => {
    e?.preventDefault();
    if (!resolutionRemark.trim()) {
      setFeedbackMsg({ type: 'error', text: 'A resolution remark is required before marking grievance as resolved.' });
      return;
    }

    try {
      setActionLoading(true);
      setFeedbackMsg({ type: '', text: '' });
      const res = await api.put(`/complaints/${id}/status`, {
        status: 'RESOLVED',
        resolutionRemark: resolutionRemark.trim(),
        officerAction: officerAction.trim() || undefined
      });
      setComplaint(res.data);
      setFeedbackMsg({ type: 'success', text: 'Grievance marked as resolved by the assigned officer within the system.' });
      setTimeout(() => setFeedbackMsg({ type: '', text: '' }), 8000);
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Failed to resolve grievance.' });
    } finally {
      setActionLoading(false);
    }
  };

  const backLink = user?.role === 'admin' ? '/admin/dashboard' : '/officer/dashboard';

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <Link
          to={backLink}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Dashboard</span>
        </Link>

        {loading ? (
          <LoadingSpinner text="Retrieving complaint review..." />
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-rose-800 text-sm">
            {error}
          </div>
        ) : !complaint ? null : (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                    {complaint.grievanceId || `GRV-2026-${String(complaint._id).slice(-6).toUpperCase()}`}
                  </span>
                  <PriorityBadge priority={complaint.priority} />
                  <StatusBadge status={complaint.status} />
                </div>
                <span className="text-xs text-slate-400">
                  Lodged on {new Date(complaint.createdAt).toLocaleDateString([], { dateStyle: 'medium' })}
                </span>
              </div>

              <h1 className="text-2xl font-extrabold text-slate-900">{complaint.title}</h1>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500 border-t border-slate-100 pt-4">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>{complaint.location}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  <span>
                    {complaint.status === 'ASSIGNED' || complaint.assignedOfficerId ? 'Assigned Dept:' : 'Recommended:'}{' '}
                    <strong className="text-slate-700">{complaint.assignedDepartment?.name || 'Awaiting Routing'}</strong>
                  </span>
                </span>
                {complaint.assignedOfficerId && (
                  <span className="flex items-center gap-1.5 text-violet-700">
                    <UserCheck className="h-3.5 w-3.5 text-violet-600" />
                    <span>
                      Assigned Officer: <strong className="text-violet-900">{complaint.assignedOfficerId.name}</strong>
                    </span>
                  </span>
                )}
                {complaint.userId && (
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span>Citizen: {complaint.userId.name} ({complaint.userId.email})</span>
                  </span>
                )}
              </div>
            </div>

            {/* AI Analysis Review Panel (Module 5.20) */}
            <div className="bg-gradient-to-br from-violet-50/70 via-white to-indigo-50/40 rounded-2xl border border-violet-200/80 p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-violet-100 pb-3">
                <div className="flex items-center gap-2 text-violet-700">
                  <Sparkles className="h-5 w-5" />
                  <h3 className="text-base font-bold text-slate-900">AI Triage & Classification Review</h3>
                </div>
                {complaint.aiConfidence !== null && complaint.aiConfidence !== undefined && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-100 text-violet-800">
                    {Math.round(complaint.aiConfidence * 100)}% AI confidence
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white rounded-xl border border-violet-100 shadow-2xs">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                    AI Category
                  </span>
                  <span className="text-sm font-bold text-slate-800 mt-1 block">
                    {complaint.category || 'General'}
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-violet-100 shadow-2xs">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                    Recommended Department
                  </span>
                  <span className="text-sm font-bold text-slate-800 mt-1 block">
                    {complaint.assignedDepartment?.name || 'General Municipal Desk'}
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-violet-100 shadow-2xs">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                    Assessed Priority
                  </span>
                  <div className="mt-1">
                    <PriorityBadge priority={complaint.priority} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="p-3.5 bg-white rounded-xl border border-violet-100 text-xs space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
                    <Info className="h-3.5 w-3.5 text-violet-600" />
                    <span>AI Factual Summary</span>
                  </div>
                  <p className="text-slate-600 font-light leading-relaxed">
                    {complaint.aiSummary || complaint.description}
                  </p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-violet-100 text-xs space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                    <span>Classification Rationale</span>
                  </div>
                  <p className="text-slate-600 font-light leading-relaxed">
                    {complaint.aiReason || `Assessed as ${complaint.priority} priority for municipal processing.`}
                  </p>
                </div>
              </div>

              {complaint.aiRecommendedAction && (
                <div className="p-3.5 bg-white rounded-xl border border-violet-100 text-xs space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Recommended Administrative Action</span>
                  </div>
                  <p className="text-slate-600 font-light leading-relaxed">
                    {complaint.aiRecommendedAction}
                  </p>
                </div>
              )}

              <div className="flex items-start gap-2 text-[11px] text-slate-500 font-light pt-2 border-t border-violet-100">
                <Info className="h-3.5 w-3.5 text-violet-500 shrink-0 mt-0.5" />
                <p>
                  AI-generated analysis is an administrative recommendation and may be reviewed or corrected by authorized staff.
                </p>
              </div>
            </div>

            {/* Module 8: Officer Processing & Resolution Panel */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-violet-600" />
                    <span>Officer Investigation & Status Processing</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-light mt-1">
                    Manage the field investigation, document official action taken, and provide resolution remarks.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Current Phase:</span>
                  <StatusBadge status={complaint.status} />
                </div>
              </div>

              {feedbackMsg.text && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-medium border flex items-center gap-2 ${
                    feedbackMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {feedbackMsg.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  )}
                  <span>{feedbackMsg.text}</span>
                </div>
              )}

              {/* State A: ASSIGNED -> Needs Officer to Start Processing */}
              {currentStatus === 'ASSIGNED' && (
                <div className="p-5 bg-gradient-to-r from-violet-50 via-slate-50 to-indigo-50/40 rounded-xl border border-violet-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Grievance Assigned To Your Desk</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-xl">
                      Click below to officially commence your field investigation or repair workflow. This transitions the status to <strong className="font-semibold text-violet-700">IN_PROGRESS</strong> and notifies the administrative audit log.
                    </p>
                  </div>

                  {isAssignedOfficer ? (
                    <Button
                      variant="primary"
                      icon={Play}
                      loading={actionLoading}
                      onClick={handleStartProcessing}
                      className="shrink-0"
                    >
                      Start Processing
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-400 italic">
                      Awaiting assigned officer to start processing.
                    </span>
                  )}
                </div>
              )}

              {/* State B: IN_PROGRESS -> Active Processing & Resolution */}
              {currentStatus === 'IN_PROGRESS' && (
                <div className="space-y-6">
                  {/* Processing Remarks & Action Taken Form */}
                  <form onSubmit={handleSaveProcessingInfo} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Processing Remarks (Inspection Notes, Findings):
                        </label>
                        <Input
                          name="processingRemark"
                          type="textarea"
                          rows={3}
                          value={processingRemark}
                          onChange={(e) => setProcessingRemark(e.target.value)}
                          placeholder="e.g. Inspected the reported street light and confirmed that the transformer fuse is blown."
                          disabled={!isAssignedOfficer}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Action Taken (Contractor dispatch, materials, actions):
                        </label>
                        <Input
                          name="officerAction"
                          type="textarea"
                          rows={3}
                          value={officerAction}
                          onChange={(e) => setOfficerAction(e.target.value)}
                          placeholder="e.g. Electrical maintenance team dispatched with replacement fuse."
                          disabled={!isAssignedOfficer}
                        />
                      </div>
                    </div>

                    {isAssignedOfficer && (
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          variant="secondary"
                          size="sm"
                          icon={Send}
                          loading={actionLoading}
                        >
                          Save Processing Updates
                        </Button>
                      </div>
                    )}
                  </form>

                  {/* Resolution Box */}
                  <div className="pt-6 border-t border-slate-100 space-y-4 bg-emerald-50/40 p-5 rounded-xl border border-emerald-100">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Resolve Grievance</span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        When all repair, cleanup, or public service remedies are completed, enter the official resolution summary to close this grievance.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Resolution Remark <span className="text-rose-500">*</span>:
                      </label>
                      <Input
                        name="resolutionRemark"
                        type="textarea"
                        rows={2}
                        value={resolutionRemark}
                        onChange={(e) => setResolutionRemark(e.target.value)}
                        placeholder="e.g. Street light issue was resolved after electrical maintenance repair and verified fully functional."
                        disabled={!isAssignedOfficer}
                      />
                    </div>

                    {isAssignedOfficer && (
                      <div className="flex justify-end">
                        <Button
                          variant="primary"
                          size="sm"
                          icon={CheckCircle}
                          loading={actionLoading}
                          onClick={handleResolveGrievance}
                          disabled={!resolutionRemark.trim()}
                        >
                          Resolve Grievance
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* State C: RESOLVED -> Read-Only Summary */}
              {currentStatus === 'RESOLVED' && (
                <div className="p-5 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 flex items-center gap-1.5 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Resolution Completed</span>
                    </span>
                    {complaint.resolvedAt && (
                      <span className="text-emerald-700 font-medium">
                        Resolved on: {new Date(complaint.resolvedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    )}
                  </div>

                  {complaint.officerAction && (
                    <div className="bg-white/80 p-3 rounded-lg border border-emerald-100">
                      <span className="font-semibold text-slate-700 block mb-0.5">Action Taken:</span>
                      <p className="text-slate-600 font-light">{complaint.officerAction}</p>
                    </div>
                  )}

                  {complaint.resolutionRemark && (
                    <div className="bg-white/80 p-3 rounded-lg border border-emerald-100">
                      <span className="font-semibold text-slate-700 block mb-0.5">Resolution Remark:</span>
                      <p className="text-slate-600 font-light">{complaint.resolutionRemark}</p>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 italic pt-1">
                    Grievance marked as resolved by the assigned officer within the system. Editing controls are locked for historical audit integrity.
                  </p>
                </div>
              )}

              {/* State D: SUBMITTED or AI_ANALYZED (Not yet assigned) */}
              {(currentStatus === 'SUBMITTED' || currentStatus === 'AI_ANALYZED') && (
                <div className="p-4 bg-slate-50 text-slate-600 rounded-xl text-xs border border-slate-200">
                  This grievance has not yet been assigned to a department officer by Central Administration. Awaiting administrative assignment.
                </div>
              )}
            </div>

            {/* Description & Evidence */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Citizen Description</h3>
              <p className="text-sm text-slate-700 font-light leading-relaxed whitespace-pre-wrap">
                {complaint.description}
              </p>

              {/* Supporting Evidence & Attachments */}
              {(complaint.imageUrl || (complaint.attachments && complaint.attachments.length > 0)) && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <h4 className="text-xs font-semibold text-slate-700">Citizen Uploaded Attachments:</h4>
                  
                  {complaint.attachments && complaint.attachments.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {complaint.attachments.map((att, idx) => {
                        const isPdf = (att.filename || att.url || '').toLowerCase().endsWith('.pdf');
                        return (
                          <div key={idx} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              {isPdf ? (
                                <FileText className="h-5 w-5 text-rose-600 shrink-0" />
                              ) : (
                                <FileCheck className="h-5 w-5 text-violet-600 shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-800 truncate">
                                  {att.filename || `Attachment-${idx + 1}`}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {isPdf ? 'PDF Document' : 'Image File'} • {att.uploadedAt ? new Date(att.uploadedAt).toLocaleDateString() : 'Uploaded'}
                                </p>
                              </div>
                            </div>
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shrink-0 inline-flex items-center gap-1"
                            >
                              <span>Open</span>
                              <ExternalLink className="h-3 w-3 text-slate-400" />
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  ) : complaint.imageUrl && complaint.imageUrl.endsWith('.pdf') ? (
                    <a
                      href={complaint.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <FileCheck className="h-5 w-5 text-rose-600" />
                      <span>View Uploaded PDF Document</span>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                    </a>
                  ) : complaint.imageUrl ? (
                    <img
                      src={complaint.imageUrl}
                      alt="Evidence"
                      className="rounded-xl max-h-72 object-cover border border-slate-200 shadow-2xs"
                    />
                  ) : null}
                </div>
              )}
            </div>

            {/* Status Timeline & Remarks Log */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 mb-4">Redressal Status Progression</h3>
              <StatusTimeline currentStatus={complaint.status} remarks={complaint.remarks} />
            </div>

            {/* Grievance Audit Trail & History (Module 7.15) */}
            {complaint.history && complaint.history.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-slate-900">
                  <History className="h-4 w-4 text-violet-600" />
                  <h3 className="text-base font-bold">Grievance Audit Trail & History</h3>
                </div>

                <div className="relative border-l-2 border-slate-200 ml-3 space-y-5 py-2">
                  {complaint.history.map((h, i) => (
                    <div key={i} className="relative pl-6">
                      <span className="absolute -left-2 top-1 w-3.5 h-3.5 rounded-full bg-violet-600 ring-4 ring-white" />
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 font-mono uppercase px-2 py-0.5 rounded bg-slate-100">
                            {h.status}
                          </span>
                          <span className="text-slate-500">
                            by {h.changedBy?.name || 'System'} ({h.changedByRole || 'system'})
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {new Date(h.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                      {h.remark && (
                        <p className="text-xs text-slate-600 font-light mt-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          {h.remark}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

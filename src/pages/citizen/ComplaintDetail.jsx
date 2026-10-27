import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api, { getAssetUrl, fetchEvidenceBlob, deleteGrievance } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/grievance/PriorityBadge';
import StatusTimeline from '../../components/grievance/StatusTimeline';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AIResolutionAssistant from '../../components/grievance/AIResolutionAssistant';
import Button from '../../components/common/Button';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Building2,
  User,
  Sparkles,
  Info,
  FileCheck,
  ExternalLink,
  Tag,
  Lightbulb,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Clock,
  Check,
  ClipboardCheck,
  History,
  UserCheck,
  AlertTriangle,
  AlertCircle,
  Copy,
  Layers,
  XCircle,
  GitMerge,
  Trash2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState('');

  // Delete Grievance Modal state (Admin only)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Evidence viewing & inline preview state
  const [openingFile, setOpeningFile] = useState('');
  const [evidenceError, setEvidenceError] = useState('');
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUnavailable, setPreviewUnavailable] = useState(false);

  // Module 7: Department & Officer Assignment State
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignMsg, setAssignMsg] = useState({ type: '', text: '' });

  // Module 9: Duplicate Detection & Review State (Admin Only)
  const [duplicateActionLoading, setDuplicateActionLoading] = useState(false);
  const [duplicateMsg, setDuplicateMsg] = useState({ type: '', text: '' });
  const [selectedDuplicateTarget, setSelectedDuplicateTarget] = useState('');
  const [duplicateNote, setDuplicateNote] = useState('');

  const fetchComplaint = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/complaints/${id}`);
      setComplaint(res.data);
      if (res.data.assignedDepartment?._id) {
        setSelectedDeptId(res.data.assignedDepartment._id);
      }
      if (res.data.assignedOfficerId?._id) {
        setSelectedOfficerId(res.data.assignedOfficerId._id);
      }
    } catch (err) {
      console.error(err);
      setError('Unable to load grievance details. It may not exist or access is restricted.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data || []);
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  useEffect(() => {
    fetchComplaint();
    if (user?.role === 'admin') {
      fetchDepartments();
    }
  }, [id, user?.role]);

  // Securely load inline evidence preview via authenticated blob retrieval
  useEffect(() => {
    let activeBlobUrl = null;
    setPreviewUnavailable(false);
    if (complaint && (complaint.imageUrl || (complaint.attachments && complaint.attachments.length > 0))) {
      const fileTarget = complaint.imageUrl || complaint.attachments[0]?.url || complaint.attachments[0]?.filename;
      const isPdf = (fileTarget || '').toLowerCase().endsWith('.pdf');

      if (fileTarget && !isPdf) {
        setPreviewLoading(true);
        fetchEvidenceBlob(complaint.grievanceId || complaint._id || id, fileTarget)
          .then(({ blobUrl }) => {
            activeBlobUrl = blobUrl;
            setPreviewBlobUrl(blobUrl);
          })
          .catch((err) => {
            console.warn('Could not load inline preview:', err.response?.status);
            if (err.response?.status === 404) {
              setPreviewUnavailable(true);
            }
          })
          .finally(() => {
            setPreviewLoading(false);
          });
      }
    }

    return () => {
      if (activeBlobUrl) {
        URL.revokeObjectURL(activeBlobUrl);
      }
    };
  }, [complaint?._id, complaint?.grievanceId, complaint?.imageUrl, id]);

  const handleOpenEvidence = async (fileIdOrUrl) => {
    try {
      setOpeningFile(fileIdOrUrl);
      setEvidenceError('');
      const targetId = complaint?.grievanceId || complaint?._id || id;
      const { blobUrl } = await fetchEvidenceBlob(targetId, fileIdOrUrl);

      const newWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');
      if (!newWindow) {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err) {
      console.error('Failed to open evidence file:', err);
      if (err.response?.status === 403) {
        setEvidenceError(err.response?.data?.message || 'Access denied: You do not have authorization to view this evidence attachment.');
      } else if (err.response?.status === 404) {
        setEvidenceError(err.response?.data?.message || 'Evidence file is unavailable; please upload it again');
      } else {
        setEvidenceError(err.response?.data?.message || 'Failed to retrieve attachment file.');
      }
    } finally {
      setOpeningFile('');
    }
  };

  // When selectedDeptId changes, if it is different from currently loaded, reset officer selection if not in that department
  const currentDept = departments.find(d => d._id === selectedDeptId);
  const eligibleOfficers = currentDept?.officerIds || [];

  const handleAssign = async (e) => {
    e?.preventDefault();
    if (!selectedDeptId) {
      setAssignMsg({ type: 'error', text: 'Please select an assigning department.' });
      return;
    }
    if (!selectedOfficerId) {
      setAssignMsg({ type: 'error', text: 'Please select an assigning officer from this department.' });
      return;
    }

    try {
      setAssigning(true);
      setAssignMsg({ type: '', text: '' });
      const res = await api.put(`/complaints/${id}/assign`, {
        departmentId: selectedDeptId,
        officerId: selectedOfficerId
      });
      setComplaint(res.data);
      const officerObj = eligibleOfficers.find(o => o._id === selectedOfficerId);
      const officerName = officerObj?.name || 'Officer';
      const deptName = currentDept?.name || 'Department';
      setAssignMsg({
        type: 'success',
        text: `Grievance assigned successfully. Assigned internally to ${officerName} in ${deptName} with status ASSIGNED.`
      });
      setTimeout(() => setAssignMsg({ type: '', text: '' }), 8000);
    } catch (err) {
      console.error('Assignment error:', err);
      setAssignMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to complete officer assignment.'
      });
    } finally {
      setAssigning(false);
    }
  };

  const handleMarkAsReviewed = async () => {
    if (user?.role !== 'admin') return;
    try {
      setReviewing(true);
      setReviewSuccess('');
      const res = await api.put(`/complaints/${id}/review`, {});
      setComplaint(res.data);
      setReviewSuccess('Grievance and AI recommendation marked as reviewed by administration.');
      setTimeout(() => setReviewSuccess(''), 5000);
    } catch (err) {
      console.error(err);
      alert('Failed to mark grievance as reviewed.');
    } finally {
      setReviewing(false);
    }
  };

  const handleDuplicateReview = async (decision, targetId = null) => {
    if (user?.role !== 'admin') return;
    const finalTarget = targetId || selectedDuplicateTarget;
    if (decision === 'CONFIRMED_DUPLICATE' && !finalTarget) {
      setDuplicateMsg({ type: 'error', text: 'Please select or provide a target grievance to confirm as duplicate.' });
      return;
    }

    try {
      setDuplicateActionLoading(true);
      setDuplicateMsg({ type: '', text: '' });
      const res = await api.put(`/complaints/${id}/duplicate-review`, {
        decision,
        duplicateOf: decision === 'CONFIRMED_DUPLICATE' ? finalTarget : undefined,
        reviewNote: duplicateNote.trim() || undefined
      });
      setComplaint(res.data);
      setDuplicateMsg({
        type: 'success',
        text: decision === 'CONFIRMED_DUPLICATE'
          ? `Grievance confirmed as duplicate of ${finalTarget}. Audit trail updated.`
          : decision === 'NOT_DUPLICATE'
          ? 'Grievance marked as Not a Duplicate. Audit trail updated.'
          : 'Duplicate review status reset to Pending.'
      });
      setTimeout(() => setDuplicateMsg({ type: '', text: '' }), 8000);
    } catch (err) {
      console.error('Duplicate review error:', err);
      setDuplicateMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update duplicate decision.'
      });
    } finally {
      setDuplicateActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!complaint) return;
    try {
      setDeleting(true);
      setDeleteError('');
      const targetId = complaint.grievanceId || complaint._id;
      await deleteGrievance(targetId);
      setShowDeleteModal(false);
      navigate(user?.role === 'admin' ? '/admin/grievances' : '/citizen/grievances', {
        replace: true,
        state: { message: `Grievance ${targetId} permanently deleted.` }
      });
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to delete grievance');
    } finally {
      setDeleting(false);
    }
  };

  const backLink =
    user?.role === 'admin'
      ? '/admin/grievances'
      : user?.role === 'officer'
      ? '/officer/dashboard'
      : '/citizen/grievances';

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation back */}
        <div className="flex items-center justify-between">
          <Link
            to={backLink}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to List</span>
          </Link>

          {/* Module 6.13 - 6.14 Admin Actions (Review & Delete) */}
          {user?.role === 'admin' && complaint && (
            <div className="flex items-center gap-2">
              {complaint.isReviewed ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>
                    Reviewed by {complaint.reviewedBy?.name || 'Administrator'}
                    {complaint.reviewedAt && ` on ${new Date(complaint.reviewedAt).toLocaleDateString()}`}
                  </span>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="primary"
                  icon={ClipboardCheck}
                  loading={reviewing}
                  onClick={handleMarkAsReviewed}
                >
                  Mark as Reviewed
                </Button>
              )}

              <Button
                size="sm"
                variant="danger"
                icon={Trash2}
                onClick={() => {
                  setShowDeleteModal(true);
                  setDeleteError('');
                }}
              >
                Delete Grievance
              </Button>
            </div>
          )}
        </div>

        {reviewSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{reviewSuccess}</span>
          </div>
        )}

        {loading ? (
          <LoadingSpinner text="Retrieving grievance records and AI insights..." />
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-rose-800 text-sm">
            {error}
          </div>
        ) : !complaint ? null : (
          <div className="space-y-6">
            {/* Main Header / Grievance Identification (Module 5.2, 5.19 & 6.7) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                    {complaint.grievanceId || `GRV-2026-${String(complaint._id).slice(-6).toUpperCase()}`}
                  </span>
                  <PriorityBadge priority={complaint.priority} />
                  <StatusBadge status={complaint.status} />
                  {complaint.isReviewed && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                      <Check className="h-3 w-3 stroke-[2.5]" />
                      Reviewed
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Submitted on {new Date(complaint.createdAt).toLocaleDateString([], { dateStyle: 'medium' })}</span>
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {complaint.title}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500 border-t border-slate-100 pt-4">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <strong className="font-medium text-slate-700">Location:</strong> {complaint.location}
                </span>

                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  <strong className="font-medium text-slate-700">
                    {complaint.status === 'ASSIGNED' || complaint.assignedOfficerId ? 'Assigned Department:' : 'Recommended Department:'}
                  </strong>{' '}
                  {complaint.assignedDepartment?.name || 'Awaiting Routing'}
                </span>

                {complaint.assignedOfficerId && (
                  <span className="flex items-center gap-1.5 text-violet-700">
                    <UserCheck className="h-3.5 w-3.5 text-violet-600" />
                    <strong className="font-medium text-violet-900">Assigned Officer:</strong>{' '}
                    <span>{complaint.assignedOfficerId.name}</span>
                    {complaint.assignedOfficerId.email && (
                      <span className="text-violet-500 font-normal">({complaint.assignedOfficerId.email})</span>
                    )}
                  </span>
                )}

                {complaint.userId && (
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <strong className="font-medium text-slate-700">Citizen:</strong>{' '}
                    {complaint.userId.name || 'Citizen'}
                    {user?.role === 'admin' && complaint.userId.email && (
                      <span className="text-slate-400 font-normal">({complaint.userId.email})</span>
                    )}
                  </span>
                )}
              </div>
            </div>

            {/* AI Analysis Card (Module 5.18 - 5.20 & Module 6.8 - 6.10) */}
            <div className="bg-gradient-to-br from-violet-50/60 via-white to-indigo-50/40 rounded-2xl border border-violet-200/80 p-6 sm:p-8 shadow-xs relative overflow-hidden space-y-5">
              <div className="flex items-center justify-between border-b border-violet-100 pb-3">
                <div className="flex items-center gap-2 text-violet-700">
                  <Sparkles className="h-5 w-5" />
                  <h2 className="text-base font-bold text-slate-900">AI Analysis & Recommendations</h2>
                </div>
                {complaint.aiConfidence !== null && complaint.aiConfidence !== undefined && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-100 text-violet-800">
                    AI Confidence: {Math.round(complaint.aiConfidence * 100)}%
                  </span>
                )}
              </div>

              {/* 3 Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-3.5 rounded-xl bg-white/90 border border-violet-100 shadow-2xs">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    AI Category
                  </span>
                  <span className="text-sm font-bold text-slate-800 mt-1 block">
                    {complaint.category || 'General'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-white/90 border border-violet-100 shadow-2xs">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Recommended Department
                  </span>
                  <span className="text-sm font-bold text-slate-800 mt-1 block">
                    {complaint.assignedDepartment?.name || 'General Municipal Desk'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-white/90 border border-violet-100 shadow-2xs">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    AI Priority
                  </span>
                  <div className="mt-1">
                    <PriorityBadge priority={complaint.priority} />
                  </div>
                </div>
              </div>

              {/* Summary & Rationale */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-xl bg-white/90 border border-violet-100 text-xs space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
                    <Info className="h-3.5 w-3.5 text-violet-600" />
                    <span>AI Summary</span>
                  </div>
                  <p className="text-slate-600 font-light leading-relaxed">
                    {complaint.aiSummary || complaint.description}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white/90 border border-violet-100 text-xs space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                    <span>AI Reason</span>
                  </div>
                  <p className="text-slate-600 font-light leading-relaxed">
                    {complaint.aiReason || `Assessed as ${complaint.priority} priority for municipal processing.`}
                  </p>
                </div>
              </div>

              {/* Recommended Action */}
              {complaint.aiRecommendedAction && (
                <div className="p-4 rounded-xl bg-white/90 border border-violet-100 text-xs space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Recommended Action</span>
                  </div>
                  <p className="text-slate-600 font-light leading-relaxed">
                    {complaint.aiRecommendedAction}
                  </p>
                </div>
              )}

              {/* Extracted Entities */}
              {complaint.aiExtractedEntities && Object.values(complaint.aiExtractedEntities).some(Boolean) && (
                <div className="p-3.5 rounded-xl bg-white/90 border border-violet-100 text-xs">
                  <span className="font-bold text-slate-700 block mb-2">Extracted Entities:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    {complaint.aiExtractedEntities.location && (
                      <div className="bg-slate-50 p-2 rounded-lg">
                        <span className="text-slate-400 block">Location:</span>
                        <span className="font-semibold text-slate-800">{complaint.aiExtractedEntities.location}</span>
                      </div>
                    )}
                    {complaint.aiExtractedEntities.issue && (
                      <div className="bg-slate-50 p-2 rounded-lg">
                        <span className="text-slate-400 block">Issue:</span>
                        <span className="font-semibold text-slate-800">{complaint.aiExtractedEntities.issue}</span>
                      </div>
                    )}
                    {complaint.aiExtractedEntities.service && (
                      <div className="bg-slate-50 p-2 rounded-lg">
                        <span className="text-slate-400 block">Service:</span>
                        <span className="font-semibold text-slate-800">{complaint.aiExtractedEntities.service}</span>
                      </div>
                    )}
                    {complaint.aiExtractedEntities.date && (
                      <div className="bg-slate-50 p-2 rounded-lg">
                        <span className="text-slate-400 block">Reported Date:</span>
                        <span className="font-semibold text-slate-800">{complaint.aiExtractedEntities.date}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Module 6.8 Visual Disclaimer */}
              <div className="flex items-start gap-2 text-[11px] text-slate-500 font-light pt-2 border-t border-violet-100">
                <Info className="h-3.5 w-3.5 text-violet-500 shrink-0 mt-0.5" />
                <p>
                  AI-generated analysis is an administrative recommendation and may be reviewed or corrected by authorized staff.
                </p>
              </div>
            </div>

            {/* Module 7: Admin Officer Assignment & Department Routing Card (Admin Only) */}
            {user?.role === 'admin' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-violet-600" />
                      <h2 className="text-base font-bold text-slate-900">
                        {complaint.assignedOfficerId ? 'Reassign Department & Officer' : 'Internal Department & Officer Assignment'}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 font-light mt-1">
                      Route this reviewed grievance to an active municipal officer. This assignment operates strictly within the prototype administrative workflow.
                    </p>
                  </div>

                  {complaint.assignedOfficerId && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200 text-xs font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Currently: {complaint.assignedOfficerId.name}</span>
                    </span>
                  )}
                </div>

                {assignMsg.text && (
                  <div
                    className={`p-3.5 rounded-xl text-xs font-medium border flex items-center gap-2 ${
                      assignMsg.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    {assignMsg.type === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                    )}
                    <span>{assignMsg.text}</span>
                  </div>
                )}

                <form onSubmit={handleAssign} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Department Select */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          <span>Assign Department:</span>
                        </span>
                        {complaint.assignedDepartment?.name && (
                          <span className="text-[11px] font-normal text-slate-400">
                            Recommended: {complaint.assignedDepartment.name}
                          </span>
                        )}
                      </label>
                      <select
                        value={selectedDeptId}
                        onChange={(e) => {
                          setSelectedDeptId(e.target.value);
                          setSelectedOfficerId('');
                        }}
                        className="w-full h-11 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs px-3 focus:outline-none focus:ring-2 focus:ring-violet-200"
                      >
                        <option value="">-- Choose Target Department --</option>
                        {departments.map((dept) => (
                          <option key={dept._id} value={dept._id}>
                            {dept.name} ({dept.code || 'DEPT'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Officer Select */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span>Assign Officer:</span>
                      </label>
                      <select
                        value={selectedOfficerId}
                        onChange={(e) => setSelectedOfficerId(e.target.value)}
                        disabled={!selectedDeptId || eligibleOfficers.length === 0}
                        className="w-full h-11 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs px-3 focus:outline-none focus:ring-2 focus:ring-violet-200 disabled:bg-slate-50 disabled:text-slate-400"
                      >
                        <option value="">
                          {!selectedDeptId
                            ? '-- Select a department first --'
                            : eligibleOfficers.length === 0
                            ? '-- No officers in this department --'
                            : '-- Choose an Officer --'}
                        </option>
                        {eligibleOfficers.map((officer) => (
                          <option key={officer._id} value={officer._id}>
                            {officer.name} ({officer.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {selectedDeptId && eligibleOfficers.length === 0 && (
                    <div className="p-3 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 text-xs flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>No officers are currently available in this department. Please add an officer to this department or select another department.</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-[11px] text-slate-400 italic">
                      Note: Officer assignment sets status to <strong className="font-semibold text-slate-600">ASSIGNED</strong> and updates the permanent audit trail.
                    </p>

                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      icon={UserCheck}
                      loading={assigning}
                      disabled={!selectedDeptId || !selectedOfficerId}
                    >
                      {complaint.assignedOfficerId ? 'Confirm Reassignment' : 'Assign Grievance'}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Module 9: Duplicate Grievance Detection & Similarity Analysis Card (Admin Only) */}
            {user?.role === 'admin' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-indigo-600" />
                      <h2 className="text-base font-bold text-slate-900">
                        Potential Duplicate Grievances & Similarity Analysis
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 font-light mt-1">
                      Automated civic similarity detection comparing category, municipal location, and grievance content. Decision remains with administration.
                    </p>
                  </div>

                  {/* Review Status Badge */}
                  <div>
                    {complaint.duplicateReviewStatus === 'CONFIRMED_DUPLICATE' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200 text-xs font-semibold">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Confirmed Duplicate</span>
                      </span>
                    ) : complaint.duplicateReviewStatus === 'NOT_DUPLICATE' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Reviewed: Not a Duplicate</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Duplicate Review: Pending</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Review feedback message */}
                {duplicateMsg.text && (
                  <div
                    className={`p-3.5 rounded-xl text-xs font-medium border flex items-center gap-2 ${
                      duplicateMsg.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    {duplicateMsg.type === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                    )}
                    <span>{duplicateMsg.text}</span>
                  </div>
                )}

                {/* Confirmed Duplicate Details if already confirmed */}
                {complaint.duplicateReviewStatus === 'CONFIRMED_DUPLICATE' && (
                  <div className="p-4 rounded-xl bg-violet-50/70 border border-violet-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-violet-900">
                        Linked Primary Grievance: {complaint.confirmedDuplicateOf?.grievanceId || complaint.confirmedDuplicateOf || 'Registered Grievance'}
                      </span>
                      {complaint.duplicateReviewedAt && (
                        <span className="text-[11px] text-violet-700">
                          Reviewed: {new Date(complaint.duplicateReviewedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      )}
                    </div>
                    {complaint.confirmedDuplicateOf?.title && (
                      <p className="text-violet-800 font-medium">"{complaint.confirmedDuplicateOf.title}"</p>
                    )}
                    {complaint.duplicateReviewNote && (
                      <p className="text-violet-700 text-[11px] italic">Admin Note: "{complaint.duplicateReviewNote}"</p>
                    )}
                  </div>
                )}

                {complaint.duplicateReviewStatus === 'NOT_DUPLICATE' && complaint.duplicateReviewNote && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                    <span className="font-semibold text-slate-800 block mb-0.5">Admin Determination:</span>
                    <span>{complaint.duplicateReviewNote}</span>
                  </div>
                )}

                {/* Candidate List */}
                {complaint.duplicateCandidates && complaint.duplicateCandidates.length > 0 ? (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Identified Potential Duplicates ({complaint.duplicateCandidates.length})
                    </h3>
                    <div className="space-y-3">
                      {complaint.duplicateCandidates.map((cand, idx) => {
                        const targetId = cand.grievanceId || cand.complaintId?.grievanceId || cand.complaintId?._id || cand.complaintId;
                        const candScore = Math.round(cand.similarityScore * 100);
                        const candTitle = cand.complaintId?.title || 'Reported Civic Issue';
                        const candLoc = cand.complaintId?.location;
                        const candStatus = cand.complaintId?.status;
                        const isSelected = selectedDuplicateTarget === targetId;

                        return (
                          <div
                            key={idx}
                            className={`p-4 rounded-xl border transition-all ${
                              isSelected
                                ? 'bg-indigo-50/60 border-indigo-300 ring-2 ring-indigo-200'
                                : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                                  {targetId}
                                </span>
                                {candStatus && (
                                  <StatusBadge status={candStatus} />
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                  candScore >= 80
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : candScore >= 65
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-sky-50 text-sky-700 border-sky-200'
                                }`}>
                                  {candScore}% Similarity ({cand.similarityLevel})
                                </span>

                                <Link
                                  to={`/admin/grievances/${cand.complaintId?._id || cand.complaintId}`}
                                  target="_blank"
                                  className="text-xs text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 font-medium ml-1"
                                >
                                  <span>Inspect</span>
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              </div>
                            </div>

                            <p className="text-xs font-semibold text-slate-900 mb-1">{candTitle}</p>
                            {candLoc && (
                              <p className="text-[11px] text-slate-500 flex items-center gap-1 mb-2">
                                <MapPin className="h-3 w-3 text-slate-400" />
                                <span>{candLoc}</span>
                              </p>
                            )}

                            {cand.reason && (
                              <p className="text-xs text-slate-600 bg-white/90 p-2.5 rounded-lg border border-slate-200/70 font-light mb-2">
                                <strong className="font-semibold text-slate-700">Similarity Rationale: </strong>
                                {cand.reason}
                              </p>
                            )}

                            {cand.matchingFactors && cand.matchingFactors.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 mb-3">
                                <span className="text-[10px] text-slate-400 uppercase font-semibold">Matching Factors:</span>
                                {cand.matchingFactors.map((factor, fIdx) => (
                                  <span
                                    key={fIdx}
                                    className="px-2 py-0.5 bg-slate-200/70 text-slate-700 rounded text-[11px] font-medium"
                                  >
                                    {factor}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                              <span className="text-[10px] text-slate-400">
                                Detected: {new Date(cand.detectedAt || Date.now()).toLocaleDateString()}
                              </span>

                              <button
                                type="button"
                                onClick={() => setSelectedDuplicateTarget(targetId)}
                                className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                {isSelected ? 'Selected for Decision' : 'Select Target'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/80 text-center space-y-1">
                    <p className="text-xs font-semibold text-slate-700">No Potential Duplicates Detected</p>
                    <p className="text-[11px] text-slate-400 font-light">
                      The automated similarity engine found no existing complaints exceeding the similarity threshold across category, location, or content.
                    </p>
                  </div>
                )}

                {/* Administrative Decision Form */}
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Administrative Determination
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Target Duplicate Grievance ID:
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. GRV-2026-000101 (or select above)"
                        value={selectedDuplicateTarget}
                        onChange={(e) => setSelectedDuplicateTarget(e.target.value.trim())}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Review Note / Rationale:
                      </label>
                      <input
                        type="text"
                        placeholder="Administrative note explaining duplicate decision..."
                        value={duplicateNote}
                        onChange={(e) => setDuplicateNote(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      icon={CheckCircle2}
                      loading={duplicateActionLoading}
                      disabled={!selectedDuplicateTarget}
                      onClick={() => handleDuplicateReview('CONFIRMED_DUPLICATE')}
                    >
                      Confirm Duplicate
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      icon={XCircle}
                      loading={duplicateActionLoading}
                      onClick={() => handleDuplicateReview('NOT_DUPLICATE')}
                    >
                      Mark as Not Duplicate
                    </Button>

                    {complaint.duplicateReviewStatus !== 'PENDING' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        icon={Clock}
                        loading={duplicateActionLoading}
                        onClick={() => handleDuplicateReview('PENDING')}
                      >
                        Reset to Pending
                      </Button>
                    )}

                    <p className="text-[11px] text-slate-400 italic ml-auto">
                      Grievance remains in active operational workflow. Decisions are recorded in the audit trail.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* AI-Powered Complaint Resolution Assistant (Admin Oversight Only) */}
            {user?.role === 'admin' && (
              <AIResolutionAssistant
                complaint={complaint}
                role="admin"
                onStatusUpdate={fetchComplaint}
              />
            )}

            {/* Description & Attachments (Module 6.7 & 6.12) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Complaint Description</h3>
              <p className="text-sm text-slate-700 font-light leading-relaxed whitespace-pre-wrap">
                {complaint.description}
              </p>

              {/* Evidence & Attachments Table */}
              {(complaint.imageUrl || (complaint.attachments && complaint.attachments.length > 0)) && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <h4 className="text-xs font-semibold text-slate-700">Supporting Attachments:</h4>
                  
                  {evidenceError && (
                    <div className="p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                        <span>{evidenceError}</span>
                      </div>
                      <button
                        onClick={() => setEvidenceError('')}
                        className="text-xs text-rose-600 hover:text-rose-800 font-bold ml-2 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {complaint.attachments && complaint.attachments.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {complaint.attachments.map((att, idx) => {
                        const isPdf = (att.filename || att.url || '').toLowerCase().endsWith('.pdf');
                        const fileIdentifier = att.url || att.filename;
                        const isOpening = openingFile === fileIdentifier;

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
                                  {att.originalName || att.filename || `Attachment-${idx + 1}`}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {isPdf ? 'PDF Document' : 'Image File'} • {att.uploadedAt ? new Date(att.uploadedAt).toLocaleDateString() : 'Uploaded'}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenEvidence(fileIdentifier)}
                              disabled={isOpening}
                              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shrink-0 inline-flex items-center gap-1 disabled:opacity-60 cursor-pointer"
                            >
                              {isOpening ? (
                                <span>Opening...</span>
                              ) : (
                                <>
                                  <span>Open</span>
                                  <ExternalLink className="h-3 w-3 text-slate-400" />
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  {/* Inline Document / Image Preview */}
                  {complaint.imageUrl && complaint.imageUrl.toLowerCase().endsWith('.pdf') ? (
                    <button
                      type="button"
                      onClick={() => handleOpenEvidence(complaint.imageUrl)}
                      disabled={openingFile === complaint.imageUrl}
                      className="inline-flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <FileCheck className="h-5 w-5 text-rose-600" />
                      <span>{openingFile === complaint.imageUrl ? 'Loading PDF Document...' : 'View Uploaded PDF Document'}</span>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                  ) : previewLoading ? (
                    <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center">
                      <LoadingSpinner text="Retrieving evidence preview..." />
                    </div>
                  ) : previewBlobUrl ? (
                    <div className="space-y-1">
                      <img
                        src={previewBlobUrl}
                        alt="Supporting Evidence"
                        onClick={() => handleOpenEvidence(complaint.imageUrl || complaint.attachments[0]?.filename)}
                        title="Click to view full image in new tab"
                        className="rounded-xl max-h-72 object-cover border border-slate-200 shadow-2xs cursor-pointer hover:opacity-95 transition-opacity"
                      />
                      <p className="text-[11px] text-slate-400">Click image to inspect full size in a new tab</p>
                    </div>
                  ) : previewUnavailable ? (
                    <div className="p-4 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 text-xs flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>Evidence file is unavailable; please upload it again</span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Official Action Taken & Resolution Summary (Module 8.6, 8.7, 8.11, 8.12) */}
            {(complaint.officerAction || complaint.officerRemarks || complaint.resolutionRemark || complaint.status === 'RESOLVED') && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span>Official Processing & Resolution Details</span>
                  </h3>
                  {complaint.resolvedAt && (
                    <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-semibold">
                      Resolved on: {new Date(complaint.resolvedAt).toLocaleDateString([], { dateStyle: 'medium' })}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {complaint.officerAction && (
                    <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                      <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block">
                        Action Taken by Officer
                      </span>
                      <p className="text-slate-700 leading-relaxed font-light">{complaint.officerAction}</p>
                    </div>
                  )}

                  {complaint.officerRemarks && (
                    <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                      <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block">
                        Officer Processing Notes
                      </span>
                      <p className="text-slate-700 leading-relaxed font-light">{complaint.officerRemarks}</p>
                    </div>
                  )}
                </div>

                {complaint.resolutionRemark && (
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1 text-xs">
                    <span className="font-bold text-emerald-900 uppercase tracking-wider text-[10px] block">
                      Official Resolution Summary
                    </span>
                    <p className="text-emerald-800 leading-relaxed font-light">{complaint.resolutionRemark}</p>
                  </div>
                )}
              </div>
            )}

            {/* Redressal Status Progression */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 mb-4">Redressal Status Progression</h3>
              <StatusTimeline currentStatus={complaint.status} remarks={complaint.remarks} />
            </div>

            {/* Historical Audit Trail (Module 6.11) */}
            {complaint.history && complaint.history.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-slate-900">
                  <History className="h-4 w-4 text-violet-600" />
                  <h3 className="text-base font-bold">Grievance Audit Trail & History</h3>
                </div>

                <div className="relative border-l-2 border-slate-200 ml-3 space-y-5 py-2">
                  {complaint.history.map((h, i) => (
                    <div key={i} className="relative pl-6">
                      {/* Node point */}
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

        {/* Delete Grievance Confirmation Modal */}
        {showDeleteModal && complaint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600 shrink-0">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Permanently Delete Grievance
                    </h3>
                    <p className="text-xs font-mono font-semibold text-rose-700 mt-0.5">
                      {complaint.grievanceId || `GRV-${String(complaint._id).slice(-6).toUpperCase()}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteError('');
                  }}
                  disabled={deleting}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer disabled:opacity-50"
                >
                  ✕
                </button>
              </div>

              {deleteError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <p className="font-semibold text-slate-800 text-sm">
                  Are you sure you want to permanently delete this grievance? This action cannot be undone.
                </p>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1 text-[11px]">
                  <p className="text-slate-700 truncate">
                    <strong className="text-slate-900">Title:</strong> {complaint.title}
                  </p>
                  <p className="text-slate-500">
                    <strong>Citizen:</strong> {complaint.userId?.name || 'Citizen'} • <strong>Location:</strong> {complaint.location || 'N/A'}
                  </p>
                </div>
                <p className="text-slate-500">
                  This will completely remove the grievance record, all associated AI analysis results, resolution recommendations, timeline history, and any unshared evidence files from storage.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={deleting}
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteError('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  loading={deleting}
                  onClick={handleConfirmDelete}
                >
                  Delete Grievance
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

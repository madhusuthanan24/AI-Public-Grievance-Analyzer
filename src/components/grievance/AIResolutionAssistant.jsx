import { useState, useEffect } from 'react';
import {
  Sparkles,
  Wrench,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Building2,
  CheckCircle2,
  XCircle,
  FileText,
  AlertOctagon,
  RefreshCw,
  Layers,
  ChevronDown,
  ChevronUp,
  Edit3,
  ListChecks,
  Info,
  Check,
  ArrowRight,
  HardHat,
  Eye,
  Hammer
} from 'lucide-react';
import Button from '../common/Button';
import LoadingSpinner from '../common/LoadingSpinner';
import PriorityBadge from './PriorityBadge';
import {
  getAISolution,
  generateAISolution,
  submitOfficerReview,
  submitAdminReview
} from '../../services/api';

export default function AIResolutionAssistant({ complaint, role = 'officer', onStatusUpdate }) {
  const [recommendation, setRecommendation] = useState(null);
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // Officer review form state
  const [officerDecision, setOfficerDecision] = useState('');
  const [officerNotes, setOfficerNotes] = useState('');
  const [officerAction, setOfficerAction] = useState('');
  const [isEditingSteps, setIsEditingSteps] = useState(false);
  const [modifiedSteps, setModifiedSteps] = useState([]);

  // Admin review form state
  const [adminDecision, setAdminDecision] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const complaintId = complaint?.grievanceId || complaint?._id;

  const fetchSolution = async () => {
    if (!complaintId) return;
    try {
      setLoading(true);
      setError('');
      const res = await getAISolution(complaintId);
      if (res.data) {
        setRecommendation(res.data.latest || null);
        setVersions(res.data.versions || []);
        setSelectedVersion(res.data.latest?.version || null);
        if (res.data.latest) {
          setOfficerDecision(res.data.latest.officerDecision || 'PENDING');
          setOfficerNotes(res.data.latest.officerNotes || '');
          setOfficerAction(res.data.latest.officerActionTaken || '');
          setModifiedSteps(
            res.data.latest.officerModifiedSteps?.length > 0
              ? res.data.latest.officerModifiedSteps
              : res.data.latest.generatedResult?.resolutionSteps || []
          );
          setAdminDecision(res.data.latest.adminDecision || 'PENDING');
          setAdminNotes(res.data.latest.adminNotes || '');
        }
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        console.warn('Could not load AI resolution recommendations:', err.response?.status);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSolution();
  }, [complaintId]);

  const handleGenerate = async () => {
    if (generating) return;
    try {
      setGenerating(true);
      setError('');
      setSuccess('');
      const res = await generateAISolution(complaintId);
      setRecommendation(res.data);
      setVersions((prev) => [res.data, ...prev.filter((v) => v._id !== res.data._id)]);
      setSelectedVersion(res.data.version);
      setOfficerDecision('PENDING');
      setOfficerNotes('');
      setOfficerAction('');
      setModifiedSteps(res.data.generatedResult?.resolutionSteps || []);
      setAdminDecision('PENDING');
      setAdminNotes('');
      setSuccess(`AI Resolution Plan (Version ${res.data.version}) generated successfully.`);
      if (onStatusUpdate) onStatusUpdate();
      setTimeout(() => setSuccess(''), 6000);
    } catch (err) {
      console.error('Failed to generate AI solution:', err);
      setError(err.response?.data?.message || 'Failed to generate resolution plan. Please retry.');
    } finally {
      setGenerating(false);
    }
  };

  const handleOfficerSubmit = async (decisionChoice) => {
    const finalDecision = decisionChoice || officerDecision;
    if (!finalDecision || finalDecision === 'PENDING') {
      setError('Please select a decision: Accept, Modify Steps, or Reject.');
      return;
    }

    try {
      setSubmittingReview(true);
      setError('');
      setSuccess('');
      const payload = {
        decision: finalDecision,
        officerNotes: officerNotes.trim(),
        officerActionTaken: officerAction.trim(),
        modifiedSteps: finalDecision === 'MODIFIED' ? modifiedSteps.filter(Boolean) : undefined
      };
      const res = await submitOfficerReview(complaintId, payload);
      setRecommendation(res.data);
      setSuccess(`Officer decision recorded as "${finalDecision}".`);
      setIsEditingSteps(false);
      if (onStatusUpdate) onStatusUpdate();
      setTimeout(() => setSuccess(''), 6000);
    } catch (err) {
      console.error('Officer review submission error:', err);
      setError(err.response?.data?.message || 'Failed to record officer review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleAdminSubmit = async (decisionChoice) => {
    const finalDecision = decisionChoice || adminDecision;
    if (!finalDecision || finalDecision === 'PENDING') {
      setError('Please select an administrative determination: Approve, Reject, or Request Revision.');
      return;
    }

    try {
      setSubmittingReview(true);
      setError('');
      setSuccess('');
      const payload = {
        decision: finalDecision,
        adminNotes: adminNotes.trim()
      };
      const res = await submitAdminReview(complaintId, payload);
      setRecommendation(res.data);
      setSuccess(`Admin determination recorded as "${finalDecision}". Audit trail updated.`);
      if (onStatusUpdate) onStatusUpdate();
      setTimeout(() => setSuccess(''), 6000);
    } catch (err) {
      console.error('Admin review submission error:', err);
      setError(err.response?.data?.message || 'Failed to record administrative determination.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleStepChange = (index, value) => {
    const updated = [...modifiedSteps];
    updated[index] = value;
    setModifiedSteps(updated);
  };

  const handleAddStep = () => {
    setModifiedSteps([...modifiedSteps, `${modifiedSteps.length + 1}. `]);
  };

  const handleRemoveStep = (index) => {
    setModifiedSteps(modifiedSteps.filter((_, idx) => idx !== index));
  };

  // Select displayed version
  const displayedRecommendation =
    selectedVersion && versions.length > 0
      ? versions.find((v) => v.version === selectedVersion) || recommendation
      : recommendation;

  const result = displayedRecommendation?.generatedResult;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <LoadingSpinner text="Loading AI Resolution Assistant..." />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-violet-100 text-violet-700">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>AI Resolution Assistant</span>
                {displayedRecommendation && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200 font-semibold">
                    Version {displayedRecommendation.version}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 font-light mt-0.5">
                Technical corrective action plans, required materials, and safety procedures for field personnel.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {displayedRecommendation && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={RefreshCw}
              loading={generating}
              onClick={handleGenerate}
            >
              Regenerate Plan
            </Button>
          )}

          {!displayedRecommendation && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={Sparkles}
              loading={generating}
              onClick={handleGenerate}
            >
              Generate AI Solution
            </Button>
          )}

          {versions.length > 1 && (
            <select
              value={selectedVersion || ''}
              onChange={(e) => setSelectedVersion(Number(e.target.value))}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none"
            >
              {versions.map((v) => (
                <option key={v._id || v.version} value={v.version}>
                  Version {v.version} ({new Date(v.generatedAt).toLocaleDateString()})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError('')}
            className="text-xs text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {success && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Empty State when no recommendation exists */}
      {!displayedRecommendation ? (
        <div className="p-8 rounded-2xl bg-slate-50/70 border border-dashed border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-violet-100 flex items-center justify-center text-violet-600">
            <Wrench className="h-6 w-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h4 className="text-sm font-bold text-slate-800">No Resolution Plan Generated Yet</h4>
            <p className="text-xs text-slate-500 font-light">
              Click <strong>"Generate AI Solution"</strong> to let the AI analyze the complaint details,
              location, and uploaded photo evidence to recommend tools, safety steps, and corrective procedures.
            </p>
          </div>
          <div className="pt-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={Sparkles}
              loading={generating}
              onClick={handleGenerate}
            >
              Generate AI Solution
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: AI Analytical Assessment & Likely Cause */}
          <div className="bg-gradient-to-br from-violet-50/60 via-white to-slate-50/40 p-5 rounded-2xl border border-violet-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-violet-100 pb-3">
              <span className="text-xs font-bold text-violet-900 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="h-4 w-4 text-violet-600" />
                <span>Problem Summary & Engineering Assessment</span>
              </span>
              <div className="flex items-center gap-2">
                {result.requiresSiteInspection && (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-amber-600" />
                    <span>On-Site Inspection Required</span>
                  </span>
                )}
                {result.confidence && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-800">
                    {Math.round(result.confidence * 100)}% Confidence
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-normal">
              {result.problemSummary}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
              {/* Image Observations */}
              <div className="p-3.5 bg-white/90 rounded-xl border border-violet-100 text-xs space-y-1">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  <Eye className="h-3.5 w-3.5 text-violet-600" />
                  <span>Visual Evidence Observations</span>
                </span>
                <p className="text-slate-600 font-light leading-relaxed">
                  {result.imageObservations || 'No visual anomalies reported; physical field verification recommended.'}
                </p>
              </div>

              {/* Likely Cause */}
              <div className="p-3.5 bg-white/90 rounded-xl border border-violet-100 text-xs space-y-1">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  <Wrench className="h-3.5 w-3.5 text-amber-500" />
                  <span>Likely Root Cause</span>
                </span>
                <p className="text-slate-600 font-light leading-relaxed">
                  {result.likelyCause || 'Environmental exposure and infrastructure operational wear.'}
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Recommended Solution & Key Metrics */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Recommended Corrective Solution
            </span>

            <p className="text-xs text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 font-normal leading-relaxed">
              {result.recommendedSolution}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Suggested Urgency
                </span>
                <div className="mt-1">
                  <PriorityBadge priority={result.suggestedPriority || complaint.priority} />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Estimated Completion Time
                </span>
                <span className="text-xs font-bold text-slate-800 mt-1 block flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-indigo-600" />
                  <span>{result.estimatedCompletionTime || '2 to 3 working days'}</span>
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Target Department / Unit
                </span>
                <span className="text-xs font-bold text-slate-800 mt-1 block flex items-center gap-1.5 truncate">
                  <Building2 className="h-3.5 w-3.5 text-violet-600" />
                  <span className="truncate">{result.recommendedDepartment || complaint.assignedDepartment?.name || 'Department'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Step-by-Step Resolution Procedure */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ListChecks className="h-4 w-4 text-violet-600" />
                <span>Step-by-Step Resolution Procedure</span>
              </span>

              {role === 'officer' && (
                <button
                  type="button"
                  onClick={() => setIsEditingSteps(!isEditingSteps)}
                  className="text-xs text-violet-600 hover:text-violet-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="h-3 w-3" />
                  <span>{isEditingSteps ? 'Cancel Customizing' : 'Customize Procedure'}</span>
                </button>
              )}
            </div>

            {isEditingSteps ? (
              <div className="space-y-2 pt-1">
                <p className="text-[11px] text-slate-500 italic">
                  Modify resolution steps to adapt to specific field constraints or equipment availability:
                </p>
                {modifiedSteps.map((step, sIdx) => (
                  <div key={sIdx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={step}
                      onChange={(e) => handleStepChange(sIdx, e.target.value)}
                      className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveStep(sIdx)}
                      className="text-xs text-rose-500 hover:text-rose-700 px-2 py-1 font-bold cursor-pointer"
                      title="Remove step"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                  >
                    + Add Step
                  </button>
                  <Button
                    size="sm"
                    variant="primary"
                    loading={submittingReview}
                    onClick={() => handleOfficerSubmit('MODIFIED')}
                  >
                    Save Customized Procedure
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {(displayedRecommendation.officerModifiedSteps?.length > 0
                  ? displayedRecommendation.officerModifiedSteps
                  : result.resolutionSteps || []
                ).map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 text-xs text-slate-700"
                  >
                    <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="font-normal leading-relaxed">{step.replace(/^\d+[\.\)]\s*/, '')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Required Materials & Safety Precautions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Required Materials */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Hammer className="h-4 w-4 text-slate-600" />
                <span>Suggested Tools, Materials & Equipment</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {result.requiredMaterials?.map((mat, mIdx) => (
                  <span
                    key={mIdx}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200 flex items-center gap-1"
                  >
                    <Wrench className="h-3 w-3 text-slate-400" />
                    <span>{mat}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Safety Precautions */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <HardHat className="h-4 w-4 text-amber-500" />
                <span>Safety Precautions & Site Protocols</span>
              </span>
              <div className="space-y-1.5">
                {result.safetyPrecautions?.map((safe, sIdx) => (
                  <div key={sIdx} className="flex items-start gap-2 text-xs text-slate-600">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="font-light">{safe}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 5: Analytical Limitations & Disclaimer */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-500 font-light flex items-start gap-2">
            <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p>
                <strong>Analytical Disclaimer:</strong> {result.limitations || 'This resolution plan is an automated municipal engineering recommendation generated for decision support. It does not replace on-site physical engineering verification.'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Generated via Model: <code>{displayedRecommendation.model || 'gemini-flash-latest'}</code> on {new Date(displayedRecommendation.generatedAt).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Section 6: Officer Review & Action Recording Panel (Module: Officer Dashboard) */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/60 pb-3">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Officer Review & Action Log</span>
                </h4>
                <p className="text-[11px] text-slate-500 font-light mt-0.5">
                  Assigned officer reviews the AI recommendation, notes actual field action taken, and accepts or rejects the plan.
                </p>
              </div>

              {/* Status Badge */}
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  displayedRecommendation.officerDecision === 'ACCEPTED'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : displayedRecommendation.officerDecision === 'MODIFIED'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : displayedRecommendation.officerDecision === 'REJECTED'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                Officer Status: {displayedRecommendation.officerDecision || 'PENDING'}
              </span>
            </div>

            {/* Officer Inputs (Active if officer or if decision is being updated) */}
            {role === 'officer' ? (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Actual Action Taken / Field Updates:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cordoned road; scheduled hot-mix asphalt crew for tomorrow morning."
                    value={officerAction}
                    onChange={(e) => setOfficerAction(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Officer Review Notes & Evaluation:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter technical comments or reasons for accepting/rejecting this recommendation..."
                    value={officerNotes}
                    onChange={(e) => setOfficerNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 bg-white"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    icon={CheckCircle2}
                    loading={submittingReview}
                    onClick={() => handleOfficerSubmit('ACCEPTED')}
                  >
                    Accept Plan
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    icon={Edit3}
                    loading={submittingReview}
                    onClick={() => {
                      setIsEditingSteps(true);
                      handleOfficerSubmit('MODIFIED');
                    }}
                  >
                    Modify & Accept
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={XCircle}
                    loading={submittingReview}
                    onClick={() => handleOfficerSubmit('REJECTED')}
                  >
                    Reject Plan
                  </Button>

                  <p className="text-[11px] text-slate-400 italic ml-auto">
                    Recorded separately from the AI suggestion for audit integrity.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                {displayedRecommendation.officerActionTaken && (
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-700 block">Officer Action Taken:</span>
                    <p className="text-slate-600 font-light mt-0.5">{displayedRecommendation.officerActionTaken}</p>
                  </div>
                )}
                {displayedRecommendation.officerNotes && (
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-700 block">Officer Notes:</span>
                    <p className="text-slate-600 font-light mt-0.5">{displayedRecommendation.officerNotes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 7: Admin Oversight & Determination Panel (Module: Admin Dashboard) */}
          {role === 'admin' && (
            <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-200/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-indigo-200/60 pb-3">
                <div>
                  <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-indigo-700" />
                    <span>Administrative Oversight & Determination</span>
                  </h4>
                  <p className="text-[11px] text-indigo-800 font-light mt-0.5">
                    Central administration oversight: approve, reject, or request revision on the proposed resolution.
                  </p>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    displayedRecommendation.adminDecision === 'APPROVED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : displayedRecommendation.adminDecision === 'NEEDS_REVISION'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : displayedRecommendation.adminDecision === 'REJECTED'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  Admin Status: {displayedRecommendation.adminDecision || 'PENDING'}
                </span>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Administrative Review Notes:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter administrative directive or conditions for approval/revision..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    icon={CheckCircle2}
                    loading={submittingReview}
                    onClick={() => handleAdminSubmit('APPROVED')}
                  >
                    Approve Resolution
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    icon={AlertTriangle}
                    loading={submittingReview}
                    onClick={() => handleAdminSubmit('NEEDS_REVISION')}
                  >
                    Request Revision
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={XCircle}
                    loading={submittingReview}
                    onClick={() => handleAdminSubmit('REJECTED')}
                  >
                    Reject Plan
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Section 8: Version & Decision History Audit Trail */}
          {displayedRecommendation.history && displayedRecommendation.history.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
              >
                <Layers className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  Resolution Decision Audit Trail ({displayedRecommendation.history.length} entries)
                </span>
                {showHistory ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              {showHistory && (
                <div className="mt-3 space-y-2">
                  {displayedRecommendation.history.map((h, hIdx) => (
                    <div
                      key={hIdx}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-800 font-mono">{h.action}</span>
                        {h.notes && <p className="text-slate-600 font-light">{h.notes}</p>}
                      </div>
                      <div className="text-[11px] text-slate-400 shrink-0">
                        {new Date(h.timestamp).toLocaleString()} ({h.performedByRole || 'system'})
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

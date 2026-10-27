import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import PriorityBadge from '../../components/grievance/PriorityBadge';
import { GRIEVANCE_CATEGORIES } from '../../utils/constants';
import {
  FileText,
  MapPin,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ArrowRight,
  UploadCloud,
  X,
  Copy,
  Check,
  Building2,
  FileCheck,
  Info
} from 'lucide-react';

export default function SubmitComplaint() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    category: ''
  });
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [error, setError] = useState('');
  const [submittedData, setSubmittedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        return setError('File size must be under 5MB.');
      }
      const allowedExt = /\.(jpe?g|png|webp|pdf)$/i;
      if (!allowedExt.test(selectedFile.name)) {
        return setError('Invalid file format. Allowed: JPG, JPEG, PNG, WEBP, PDF.');
      }

      setFile(selectedFile);
      if (selectedFile.type.startsWith('image/')) {
        setFilePreview(URL.createObjectURL(selectedFile));
      } else {
        setFilePreview('pdf');
      }
      setError('');
    }
  };

  const removeFile = () => {
    setFile(null);
    setFilePreview(null);
  };

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const { title, description, location } = formData;
    if (!title.trim() || title.trim().length < 3) {
      return setError('Title is required (at least 3 characters).');
    }
    if (title.trim().length > 200) {
      return setError('Title cannot exceed 200 characters.');
    }

    if (!description.trim() || description.trim().length < 10) {
      return setError('Description is required (at least 10 characters).');
    }
    if (description.trim().length > 3000) {
      return setError('Description cannot exceed 3000 characters.');
    }

    if (!location.trim() || location.trim().length < 3) {
      return setError('Location is required (at least 3 characters).');
    }
    if (location.trim().length > 200) {
      return setError('Location cannot exceed 200 characters.');
    }

    try {
      setLoading(true);

      const data = new FormData();
      data.append('title', title.trim());
      data.append('description', description.trim());
      data.append('location', location.trim());
      if (formData.category) {
        data.append('category', formData.category);
      }
      if (file) {
        data.append('image', file);
      }

      const res = await api.post('/complaints', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSubmittedData(res.data);
    } catch (err) {
      console.error('Submission error:', err);
      const serverMsg = err.response?.data?.message;
      if (serverMsg) {
        setError(serverMsg);
      } else if (!err.response || err.message?.includes('Network Error') || err.code === 'ERR_NETWORK') {
        setError('Unable to reach the server. Please check your network connection and retry.');
      } else {
        setError(err.message || 'Failed to submit grievance. Please verify fields and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <span className="text-xs font-bold text-violet-600 uppercase tracking-widest">Public Service</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">Submit Grievance</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-light mt-1">
            Lodge a civic grievance with municipal authorities. Integrated Gemini AI analyzes your complaint,
            detects urgency, extracts entities, and recommends the target department.
          </p>
        </div>

        {/* Success & AI Analysis Showcase Banner (Module 5.17 & 5.18) */}
        {submittedData && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 sm:p-7 text-emerald-950 shadow-xs">
              <div className="flex items-start gap-3.5">
                <CheckCircle className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-emerald-900">Grievance submitted successfully</h3>
                  <p className="text-xs text-emerald-700 mt-1">
                    Your grievance has been securely stored and evaluated by the AI classification engine.
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <div className="p-3 bg-white rounded-xl border border-emerald-200 inline-flex items-center gap-3 shadow-2xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                          Your Grievance ID
                        </span>
                        <span className="font-mono font-extrabold text-slate-900 text-base">
                          {submittedData.grievanceId || `GRV-2026-${String(submittedData._id).slice(-6).toUpperCase()}`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyId(submittedData.grievanceId || submittedData._id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        title="Copy Grievance ID"
                      >
                        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/citizen/grievances/${submittedData.grievanceId || submittedData._id}`}>
                        <Button size="md" variant="primary" icon={ArrowRight}>
                          View Grievance
                        </Button>
                      </Link>
                      <Link to="/citizen/grievances">
                        <Button size="md" variant="secondary">
                          My Grievances
                        </Button>
                      </Link>
                      <Button
                        size="md"
                        variant="outline"
                        onClick={() => {
                          setSubmittedData(null);
                          setFormData({ title: '', description: '', location: '', category: '' });
                          removeFile();
                        }}
                      >
                        Submit Another
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Analysis Summary Preview Card */}
            {(submittedData.aiSummary || submittedData.category) && (
              <div className="bg-gradient-to-br from-violet-50/70 via-white to-indigo-50/40 rounded-2xl border border-violet-200/80 p-6 sm:p-7 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-violet-100 pb-3">
                  <div className="flex items-center gap-2 text-violet-700">
                    <Sparkles className="h-5 w-5" />
                    <h3 className="text-base font-bold text-slate-900">AI Grievance Analysis</h3>
                  </div>
                  {submittedData.aiConfidence !== null && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-100 text-violet-800">
                      {Math.round((submittedData.aiConfidence || 0.85) * 100)}% AI confidence
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-white rounded-xl border border-violet-100">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                      Category
                    </span>
                    <span className="text-sm font-bold text-slate-800 mt-0.5 block">
                      {submittedData.category || 'General'}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-violet-100">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                      Recommended Department
                    </span>
                    <span className="text-sm font-bold text-slate-800 mt-0.5 block">
                      {submittedData.assignedDepartment?.name || 'Municipal General Desk'}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-violet-100">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                      Assessed Priority
                    </span>
                    <div className="mt-1">
                      <PriorityBadge priority={submittedData.priority || 'MEDIUM'} />
                    </div>
                  </div>
                </div>

                {submittedData.aiSummary && (
                  <div className="p-3.5 bg-white rounded-xl border border-violet-100 text-xs space-y-1">
                    <strong className="text-slate-800">AI Summary:</strong>
                    <p className="text-slate-600 font-light leading-relaxed">{submittedData.aiSummary}</p>
                  </div>
                )}

                {submittedData.aiRecommendedAction && (
                  <div className="p-3.5 bg-white rounded-xl border border-violet-100 text-xs space-y-1">
                    <strong className="text-slate-800">Recommended Administrative Action:</strong>
                    <p className="text-slate-600 font-light leading-relaxed">{submittedData.aiRecommendedAction}</p>
                  </div>
                )}

                {/* Module 5.18 Visual Disclaimer */}
                <div className="flex items-start gap-2 text-[11px] text-slate-500 font-light pt-2 border-t border-violet-100/80">
                  <Info className="h-3.5 w-3.5 text-violet-500 shrink-0 mt-0.5" />
                  <p>
                    AI-generated analysis is an administrative recommendation and may be reviewed or corrected by authorized staff.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Grievance Submission Form */}
        {!submittedData && (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-5"
          >
            {error && (
              <div className="flex items-center gap-2.5 rounded-xl bg-rose-50 p-3.5 text-xs text-rose-700 border border-rose-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Title with Counter */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Grievance Title <span className="text-rose-500">*</span>
                </label>
                <span className={`text-[11px] ${formData.title.length > 180 ? 'text-amber-600' : 'text-slate-400'}`}>
                  {formData.title.length}/200
                </span>
              </div>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                maxLength={200}
                placeholder="e.g. Hazardous open manhole on Main Market Road"
                required
                className="block w-full rounded-lg border border-slate-300 bg-white text-slate-900 text-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-500"
              />
            </div>

            {/* Description with Counter */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Detailed Description <span className="text-rose-500">*</span>
                </label>
                <span className={`text-[11px] ${formData.description.length > 2800 ? 'text-amber-600' : 'text-slate-400'}`}>
                  {formData.description.length}/3000
                </span>
              </div>
              <textarea
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                maxLength={3000}
                placeholder="Provide specific details about the civic problem. Gemini AI will analyze category, priority, and key entities."
                required
                className="block w-full rounded-lg border border-slate-300 bg-white text-slate-900 text-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-500 leading-relaxed"
              />
            </div>

            {/* Location & Optional Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-slate-700">
                    Location / Landmark <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">{formData.location.length}/200</span>
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    maxLength={200}
                    placeholder="e.g. Near Bus Stand, Main Commercial Cross"
                    required
                    className="block w-full pl-9 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Category</span>
                  <span className="text-[11px] text-violet-600 font-normal flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Auto-classified if omitted
                  </span>
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="block w-full rounded-lg border border-slate-300 bg-white text-slate-900 text-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-500"
                >
                  <option value="">Let Gemini AI Decide (Recommended)</option>
                  {GRIEVANCE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Evidence File Upload (Module 5.22: JPG, JPEG, PNG, PDF up to 5MB) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Supporting Evidence / Attachment (Optional)
              </label>

              {!filePreview ? (
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                  <UploadCloud className="h-8 w-8 text-slate-400 mb-2" />
                  <span className="text-xs font-semibold text-slate-700">Click to upload photo or document</span>
                  <span className="text-[11px] text-slate-400 font-light mt-0.5">JPG, JPEG, PNG, WEBP, or PDF up to 5MB</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="relative rounded-xl border border-slate-200 overflow-hidden max-w-sm bg-slate-50">
                  {filePreview === 'pdf' ? (
                    <div className="p-6 flex items-center gap-3 bg-slate-100 text-slate-700">
                      <FileCheck className="h-8 w-8 text-rose-600" />
                      <div>
                        <span className="text-xs font-bold block">{file?.name}</span>
                        <span className="text-[11px] text-slate-500 font-mono">PDF Document</span>
                      </div>
                    </div>
                  ) : (
                    <img src={filePreview} alt="Preview" className="w-full h-44 object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={removeFile}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/70 text-white hover:bg-slate-900 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="p-2 bg-slate-50 text-[11px] text-slate-600 truncate border-t border-slate-200">
                    {file?.name} ({Math.round((file?.size || 0) / 1024)} KB)
                  </div>
                </div>
              )}
            </div>

            {/* AI Assistant Notice */}
            <div className="p-3 bg-violet-50/60 rounded-xl border border-violet-100 text-[11px] text-violet-800 flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
              <span>
                Gemini AI will analyze your grievance upon submission. AI findings serve as an administrative recommendation to assist municipal staff in routing and triaging tickets.
              </span>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                loading={loading}
                className="w-full sm:w-auto"
                size="md"
                icon={Sparkles}
              >
                {loading ? 'Analyzing your grievance...' : 'Submit Grievance for AI Analysis'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}

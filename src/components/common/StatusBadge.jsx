export default function StatusBadge({ status }) {
  const normalized = (status || 'SUBMITTED').toUpperCase().replace(/\s+/g, '_');

  const configs = {
    SUBMITTED: {
      label: 'Submitted',
      classes: 'bg-slate-100 text-slate-700 border-slate-200'
    },
    AI_ANALYZED: {
      label: 'AI Analyzed',
      classes: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    },
    UNDER_REVIEW: {
      label: 'Under Review',
      classes: 'bg-sky-50 text-sky-700 border-sky-200'
    },
    ASSIGNED: {
      label: 'Assigned',
      classes: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    IN_PROGRESS: {
      label: 'In Progress',
      classes: 'bg-amber-50 text-amber-700 border-amber-200'
    },
    RESOLVED: {
      label: 'Resolved',
      classes: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    REJECTED: {
      label: 'Rejected',
      classes: 'bg-rose-50 text-rose-700 border-rose-200'
    },
    CLOSED: {
      label: 'Closed',
      classes: 'bg-slate-100 text-slate-500 border-slate-200'
    }
  };

  const current = configs[normalized] || {
    label: status || 'Unknown',
    classes: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${current.classes}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70"></span>
      {current.label}
    </span>
  );
}

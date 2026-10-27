import { CheckCircle2, Clock, Check } from 'lucide-react';

const STEPS = [
  { key: 'SUBMITTED', label: 'Submitted', desc: 'Registered by citizen' },
  { key: 'AI_ANALYZED', label: 'AI Analyzed', desc: 'Category & priority analyzed' },
  { key: 'ASSIGNED', label: 'Assigned', desc: 'Department officer appointed' },
  { key: 'IN_PROGRESS', label: 'In Progress', desc: 'Investigation or field work' },
  { key: 'RESOLVED', label: 'Resolved', desc: 'Issue resolved by administration' }
];

const STEP_INDEX_MAP = {
  'SUBMITTED': 0,
  'AI_ANALYZED': 1,
  'UNDER_REVIEW': 1,
  'ASSIGNED': 2,
  'IN_PROGRESS': 3,
  'RESOLVED': 4,
  'REJECTED': 0,
  'CLOSED': 4
};

export default function StatusTimeline({ currentStatus = 'SUBMITTED', remarks = [] }) {
  const normCurrent = currentStatus.toUpperCase().replace(/\s+/g, '_');
  const activeStepIndex = STEP_INDEX_MAP[normCurrent] !== undefined ? STEP_INDEX_MAP[normCurrent] : 0;

  return (
    <div className="py-2">
      <div className="relative">
        <div className="overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between relative gap-6 md:gap-0">
            {STEPS.map((step, idx) => {
              const isResolvedStatus = normCurrent === 'RESOLVED' || normCurrent === 'CLOSED';
              const isCompleted = idx < activeStepIndex || (idx === activeStepIndex && isResolvedStatus);
              const isCurrent = idx === activeStepIndex && !isResolvedStatus;
              const isUpcoming = idx > activeStepIndex;

              return (
                <div key={step.key} className="flex-1 flex md:flex-col items-start md:items-center relative group">
                  {/* Connecting bar for desktop */}
                  {idx < STEPS.length - 1 && (
                    <div
                      className={`hidden md:block absolute top-4 left-1/2 w-full h-0.5 -z-0 transition-colors ${
                        idx < activeStepIndex || isResolvedStatus ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}
                    />
                  )}

                  {/* Icon badge */}
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all z-10 shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                        : isCurrent
                        ? 'bg-white border-violet-600 text-violet-600 ring-4 ring-violet-100 font-bold'
                        : 'bg-white border-slate-200 text-slate-300'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    ) : isCurrent ? (
                      <Clock className="w-4 h-4 animate-pulse" />
                    ) : (
                      <span className="text-xs font-semibold text-slate-400">{idx + 1}</span>
                    )}
                  </div>

                  <div className="ml-4 md:ml-0 md:mt-3 md:text-center">
                    <p className={`text-xs font-semibold ${
                      isCurrent
                        ? 'text-violet-700'
                        : isCompleted
                        ? 'text-slate-900'
                        : 'text-slate-400'
                    }`}>
                      {step.label}
                    </p>
                    <p className="text-[11px] text-slate-400 font-light hidden sm:block max-w-[120px] md:mx-auto">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {remarks && remarks.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Official Remarks Log</h4>
          <div className="space-y-3">
            {remarks.map((r, i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-sm">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-semibold text-slate-800">
                    {r.officerId?.name ? `${r.officerId.name} (${r.officerId.role || 'Officer'})` : 'Assigned Officer'}
                  </span>
                  <span>{new Date(r.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
                <p className="text-slate-700 font-light">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { AlertCircle, AlertTriangle, Info, Flame } from 'lucide-react';

export default function PriorityBadge({ priority }) {
  const norm = (priority || 'MEDIUM').toUpperCase();

  const configs = {
    LOW: {
      label: 'Low',
      classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: Info
    },
    MEDIUM: {
      label: 'Medium',
      classes: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: AlertTriangle
    },
    HIGH: {
      label: 'High',
      classes: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold',
      icon: AlertCircle
    },
    CRITICAL: {
      label: 'Critical',
      classes: 'bg-red-100 text-red-800 border-red-300 font-bold animate-pulse',
      icon: Flame
    }
  };

  const current = configs[norm] || configs.MEDIUM;
  const Icon = current.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs border ${current.classes}`}>
      <Icon className="h-3 w-3" />
      {current.label}
    </span>
  );
}

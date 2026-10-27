import { Link } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';
import PriorityBadge from './PriorityBadge';
import { MapPin, Calendar, Building2, ChevronRight } from 'lucide-react';

export default function GrievanceCard({ grievance, basePath = '/complaints' }) {
  const deptName = grievance.assignedDepartment?.name || grievance.department || 'Awaiting Routing';

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[11px] font-mono font-medium text-slate-400">
            ID: #{String(grievance._id || '').slice(-6).toUpperCase()}
          </span>
          <div className="flex items-center gap-1.5">
            <PriorityBadge priority={grievance.priority} />
            <StatusBadge status={grievance.status} />
          </div>
        </div>

        <Link
          to={`${basePath}/${grievance._id}`}
          className="text-base font-semibold text-slate-800 hover:text-violet-600 transition-colors line-clamp-1 mb-2 block"
        >
          {grievance.title}
        </Link>

        <p className="text-sm text-slate-500 line-clamp-2 mb-4 font-light leading-relaxed">
          {grievance.description}
        </p>
      </div>

      <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1 truncate max-w-[50%]">
            <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{deptName}</span>
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>{new Date(grievance.createdAt).toLocaleDateString()}</span>
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1 truncate max-w-[65%]">
            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{grievance.location || 'Not specified'}</span>
          </span>

          <Link
            to={`${basePath}/${grievance._id}`}
            className="inline-flex items-center text-xs font-semibold text-violet-600 hover:text-violet-700"
          >
            View details
            <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

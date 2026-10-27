import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../common/StatusBadge';
import PriorityBadge from './PriorityBadge';
import { Eye, MapPin, Building2, CheckCircle2, UserCheck } from 'lucide-react';

export default function GrievanceTable({
  grievances = [],
  basePath,
  showCitizen = false,
  showDepartment = true,
  showOfficer = false,
  showConfidence = true,
  onAction
}) {
  const { user } = useAuth();
  const defaultBasePath =
    user?.role === 'admin'
      ? '/admin/grievances'
      : user?.role === 'officer'
      ? '/officer/grievances'
      : '/citizen/grievances';
  const effectiveBasePath = basePath || defaultBasePath;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-xs">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-600 uppercase tracking-wider">
            <th className="py-3 px-4">Grievance ID</th>
            {showCitizen && <th className="py-3 px-4">Citizen</th>}
            <th className="py-3 px-4">Title & Details</th>
            <th className="py-3 px-4">Category</th>
            <th className="py-3 px-4">Priority</th>
            <th className="py-3 px-4">Status</th>
            {showDepartment && <th className="py-3 px-4">Assigned / Rec. Dept</th>}
            {showOfficer && <th className="py-3 px-4">Assigned Officer</th>}
            {showConfidence && <th className="py-3 px-4">AI Confidence</th>}
            <th className="py-3 px-4">Submitted</th>
            <th className="py-3 px-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {grievances.map((item) => {
            const formattedId = item.grievanceId || `#${String(item._id || '').slice(-6).toUpperCase()}`;
            const citizenName = item.userId?.name || 'Citizen';
            const deptName = item.assignedDepartment?.name || 'General Desk';
            const officerName = item.assignedOfficerId?.name || (item.status === 'ASSIGNED' ? 'Assigned' : 'Not assigned');
            const confidencePercent = item.aiConfidence !== null && item.aiConfidence !== undefined
              ? `${Math.round(item.aiConfidence * 100)}%`
              : '—';

            return (
              <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span>{formattedId}</span>
                    {item.isReviewed && (
                      <span title="Reviewed by Administrator">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      </span>
                    )}
                  </div>
                </td>

                {showCitizen && (
                  <td className="py-3.5 px-4 text-slate-800 font-medium whitespace-nowrap">
                    {citizenName}
                  </td>
                )}

                <td className="py-3.5 px-4 max-w-xs">
                  <div className="font-semibold text-slate-900 truncate">{item.title}</div>
                  <div className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                    <span>{item.location || 'Location unassigned'}</span>
                  </div>
                </td>

                <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                  <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                    {item.category || 'General'}
                  </span>
                </td>

                <td className="py-3.5 px-4 whitespace-nowrap">
                  <PriorityBadge priority={item.priority} />
                </td>

                <td className="py-3.5 px-4 whitespace-nowrap">
                  <StatusBadge status={item.status} />
                </td>

                {showDepartment && (
                  <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                    <span className="text-xs text-slate-700 font-medium flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[130px]">{deptName}</span>
                    </span>
                  </td>
                )}

                {showOfficer && (
                  <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                    <span className="text-xs font-medium flex items-center gap-1">
                      <UserCheck className={`h-3.5 w-3.5 ${item.assignedOfficerId ? 'text-violet-600' : 'text-slate-300'}`} />
                      <span className={item.assignedOfficerId ? 'text-slate-800 font-semibold' : 'text-slate-400 italic'}>
                        {officerName}
                      </span>
                    </span>
                  </td>
                )}

                {showConfidence && (
                  <td className="py-3.5 px-4 whitespace-nowrap text-xs font-medium text-slate-600">
                    {item.aiConfidence !== null && item.aiConfidence !== undefined ? (
                      <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
                        {confidencePercent}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                )}

                <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                  {new Date(item.createdAt).toLocaleDateString()}
                </td>

                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                  <Link
                    to={`${effectiveBasePath}/${item._id}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

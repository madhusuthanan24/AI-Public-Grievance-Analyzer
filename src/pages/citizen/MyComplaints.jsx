import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import GrievanceTable from '../../components/grievance/GrievanceTable';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { Search, Filter, RefreshCw, FilePlus } from 'lucide-react';
import { GRIEVANCE_CATEGORIES, GRIEVANCE_PRIORITIES } from '../../utils/constants';

export default function MyComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('newest');

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/complaints/my');
      setComplaints(res.data);
    } catch (err) {
      console.error(err);
      setError('Unable to fetch complaints.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const filteredComplaints = complaints
    .filter((c) => {
      const matchesSearch =
        (c.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c._id || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        selectedStatus === 'ALL' ||
        (c.status || '').toUpperCase().replace(/\s+/g, '_') === selectedStatus;

      const matchesPriority =
        selectedPriority === 'ALL' ||
        (c.priority || '').toUpperCase() === selectedPriority;

      return matchesSearch && matchesStatus && matchesPriority;
    })
    .sort((a, b) => {
      if (sortOrder === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortOrder === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      return 0;
    });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-violet-600 uppercase tracking-widest">Tracking & History</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">My Grievances</h1>
            <p className="text-xs sm:text-sm text-slate-500 font-light mt-1">
              Search, filter, and monitor resolution updates for your filed grievances.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchComplaints} loading={loading}>
              Refresh
            </Button>
            <Link to="/citizen/submit">
              <Button size="sm" icon={FilePlus}>
                Submit Grievance
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Input
                name="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title, location, ID..."
                icon={Search}
              />
            </div>

            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs px-3 focus:outline-none focus:ring-2 focus:ring-violet-200"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>

            <div>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs px-3 focus:outline-none focus:ring-2 focus:ring-violet-200"
              >
                <option value="ALL">All Priorities</option>
                {GRIEVANCE_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p} Priority
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs px-3 focus:outline-none focus:ring-2 focus:ring-violet-200"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content list / table */}
        {loading ? (
          <LoadingSpinner text="Loading grievances..." />
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">{error}</div>
        ) : filteredComplaints.length === 0 ? (
          <EmptyState
            title="No matching grievances"
            description={
              searchTerm || selectedStatus !== 'ALL' || selectedPriority !== 'ALL'
                ? 'Try clearing your search query or adjusting your filters.'
                : 'You have not submitted any complaints yet.'
            }
            actionLabel="Reset Filters"
            onAction={() => {
              setSearchTerm('');
              setSelectedStatus('ALL');
              setSelectedPriority('ALL');
            }}
          />
        ) : (
          <GrievanceTable grievances={filteredComplaints} basePath="/citizen/grievances" />
        )}
      </div>
    </DashboardLayout>
  );
}

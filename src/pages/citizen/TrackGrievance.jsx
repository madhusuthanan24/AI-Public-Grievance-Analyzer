import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { Search, Hash, ArrowRight } from 'lucide-react';

export default function TrackGrievance() {
  const [ticketId, setTicketId] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (!ticketId.trim()) {
      return setError('Please enter a valid Grievance ID.');
    }
    const clean = ticketId.trim().replace(/^#/, '');
    navigate(`/citizen/grievances/${clean}`);
  };

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto py-8 space-y-6">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 mb-3 border border-violet-100">
            <Search className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Track Grievance Status</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-light mt-1">
            Enter your unique Grievance tracking reference or MongoDB ticket ID to jump directly to its live status timeline.
          </p>
        </div>

        <form onSubmit={handleSearch} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

          <Input
            label="Grievance ID"
            name="ticketId"
            value={ticketId}
            onChange={(e) => {
              setTicketId(e.target.value);
              setError('');
            }}
            placeholder="e.g. 661ad3300000000000000001 or #000001"
            icon={Hash}
            required
          />

          <Button type="submit" size="md" className="w-full" icon={ArrowRight}>
            Lookup Status
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}

import { useState, useEffect } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { Building2, Plus, Trash2, Edit2, AlertCircle, Users } from 'lucide-react';

export default function ManageDepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchDepts = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/departments');
      setDepartments(res.data);
    } catch (err) {
      setError('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepts();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !newDesc.trim()) return;
    try {
      setCreating(true);
      await api.post('/departments', { name: newName.trim(), description: newDesc.trim() });
      setNewName('');
      setNewDesc('');
      setShowForm(false);
      fetchDepts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create department');
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (dept) => {
    setEditingId(dept._id);
    setEditName(dept.name);
    setEditDesc(dept.description);
  };

  const saveEdit = async (id) => {
    try {
      setSaving(true);
      await api.put(`/departments/${id}`, { name: editName, description: editDesc });
      setEditingId(null);
      fetchDepts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update department');
    } finally {
      setSaving(false);
    }
  };

  const deleteDept = async (id) => {
    if (!window.confirm('Delete this department? Officers assigned will be unlinked.')) return;
    try {
      await api.delete(`/departments/${id}`);
      fetchDepts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete department');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-violet-600 uppercase tracking-widest">
              Administration
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">
              Municipal Departments
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-light mt-1">
              Configure organizational departments, automated routing targets, and officer allocations.
            </p>
          </div>

          <Button
            size="sm"
            icon={Plus}
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancel Creation' : 'Add Department'}
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3.5 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Creation Form */}
        {showForm && (
          <form
            onSubmit={handleCreate}
            className="bg-white p-6 rounded-2xl border border-violet-200 shadow-xs space-y-4"
          >
            <h3 className="text-sm font-bold text-slate-900">New Department Profile</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Department Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Public Health & Sanitation"
                required
              />
              <Input
                label="Responsibilities & Description"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Scope of work and handling responsibilities"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" loading={creating}>
                Create Department
              </Button>
            </div>
          </form>
        )}

        {/* Departments List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {loading ? (
            <div className="col-span-full">
              <LoadingSpinner text="Fetching department roster..." />
            </div>
          ) : (
            departments.map((dept) => {
              const isEditing = editingId === dept._id;
              return (
                <div
                  key={dept._id}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-violet-50 text-violet-600">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-semibold text-slate-400 font-mono">
                          #{String(dept._id).slice(-4).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(dept)}
                          className="p-1.5 text-slate-400 hover:text-violet-600 rounded-lg"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteDept(dept._id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="space-y-3 mb-4">
                        <Input
                          label="Name"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                        <Input
                          label="Description"
                          type="textarea"
                          rows={2}
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveEdit(dept._id)} loading={saving}>
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-base font-bold text-slate-900 mb-1">{dept.name}</h3>
                        <p className="text-xs text-slate-500 font-light leading-relaxed mb-4">
                          {dept.description}
                        </p>
                      </>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      <span>{dept.officerIds?.length || 0} Officers Appointed</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

import { useState, useEffect } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Button from '../../components/common/Button';
import { Users, Trash2, Edit2, X, Check, AlertCircle, Shield } from 'lucide-react';

const ROLES = ['citizen', 'officer', 'admin'];

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editRole, setEditRole] = useState('');
  const [editDept, setEditDept] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [uRes, dRes] = await Promise.all([
        api.get('/auth/users'),
        api.get('/departments')
      ]);
      setUsers(uRes.data);
      setDepartments(dRes.data);
    } catch (err) {
      setError('Failed to load user directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const startEdit = (user) => {
    setEditingId(user._id);
    setEditRole(user.role);
    setEditDept(user.department?._id || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditRole('');
    setEditDept('');
  };

  const saveEdit = async (userId) => {
    try {
      setSavingId(userId);
      await api.put(`/auth/users/${userId}`, {
        role: editRole,
        department: editRole === 'officer' ? editDept : undefined
      });
      setEditingId(null);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user');
    } finally {
      setSavingId(null);
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user permanently?')) return;
    try {
      setDeleteId(userId);
      await api.delete(`/auth/users/${userId}`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <span className="text-xs font-bold text-violet-600 uppercase tracking-widest">
            Administration
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">
            User Role Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-light mt-1">
            Grant Administrative privileges, designate department officers, and oversee platform accounts.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3.5 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Registered Accounts ({users.length})</h2>
          </div>

          {loading ? (
            <LoadingSpinner text="Loading accounts directory..." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-5">Name & Email</th>
                    <th className="py-3 px-5">Role</th>
                    <th className="py-3 px-5">Assigned Department</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const isEditing = editingId === u._id;
                    return (
                      <tr key={u._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="font-semibold text-slate-900">{u.name}</div>
                          <div className="text-xs text-slate-500">{u.email}</div>
                        </td>

                        <td className="py-3.5 px-5">
                          {isEditing ? (
                            <select
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value)}
                              className="text-xs rounded-lg border border-slate-300 py-1.5 px-2 bg-white"
                            >
                              {ROLES.map((r) => (
                                <option key={r} value={r}>
                                  {r.toUpperCase()}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                u.role === 'admin'
                                  ? 'bg-violet-100 text-violet-800'
                                  : u.role === 'officer'
                                  ? 'bg-sky-100 text-sky-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {u.role.toUpperCase()}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-5 text-xs text-slate-600">
                          {isEditing ? (
                            editRole === 'officer' ? (
                              <select
                                value={editDept}
                                onChange={(e) => setEditDept(e.target.value)}
                                className="text-xs rounded-lg border border-slate-300 py-1.5 px-2 bg-white max-w-xs"
                              >
                                <option value="">Select Department...</option>
                                {departments.map((d) => (
                                  <option key={d._id} value={d._id}>
                                    {d.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-slate-400 italic">N/A for non-officers</span>
                            )
                          ) : (
                            u.department?.name || <span className="text-slate-400">None</span>
                          )}
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => saveEdit(u._id)}
                                loading={savingId === u._id}
                              >
                                Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelEdit}>
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => startEdit(u)}
                                className="p-1.5 text-slate-400 hover:text-violet-600 rounded-lg hover:bg-violet-50 transition-colors"
                                title="Edit role"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => deleteUser(u._id)}
                                disabled={deleteId === u._id}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                                title="Delete account"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

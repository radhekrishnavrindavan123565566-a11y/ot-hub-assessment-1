import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsersApi, createUserApi, updateOtCapApi } from '../../api/users.api';
import Spinner from '../../components/common/Spinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

const DEPARTMENTS = ['Machining', 'Assembly', 'Quality', 'Dispatch'];
const ROLES = ['employee', 'manager', 'admin'];

const EMPTY_FORM = { name: '', email: '', password: '', role: 'employee', department: 'Machining' };

// Eye icons
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const EyeSlashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
);

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [editingCap, setEditingCap] = useState({});
  const [savingCap, setSavingCap] = useState({});

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [createError, setCreateError] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => getUsersApi({ page, limit: 12, search: search || undefined }),
    select: (res) => res.data.data,
  });

  const capMutation = useMutation({
    mutationFn: ({ userId, cap }) => updateOtCapApi(userId, Number(cap)),
    onSuccess: (_, { userId }) => {
      toast.success('OT cap updated ✅');
      setSavingCap((p) => { const n = { ...p }; delete n[userId]; return n; });
      setEditingCap((p) => { const n = { ...p }; delete n[userId]; return n; });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Update failed'),
  });

  const createMutation = useMutation({
    mutationFn: createUserApi,
    onSuccess: () => {
      toast.success('User created! 🎉');
      setModalOpen(false);
      setForm(EMPTY_FORM);
      setCreateError(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => setCreateError(err),
  });

  const openModal = () => { setForm(EMPTY_FORM); setCreateError(null); setShowPassword(false); setModalOpen(true); };
  const closeModal = () => { if (!createMutation.isPending) { setModalOpen(false); setCreateError(null); } };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleCreate = (e) => {
    e.preventDefault();
    setCreateError(null);
    const payload = { ...form };
    if (form.role === 'admin') delete payload.department;
    createMutation.mutate(payload);
  };

  const saveCap = (userId, cap) => {
    setSavingCap((p) => ({ ...p, [userId]: true }));
    capMutation.mutate({ userId, cap });
  };

  const inputClass = "w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200 placeholder-slate-400";

  if (isLoading) return <Spinner fullPage />;
  if (error) return <div className="p-8"><ErrorMessage error={error} /></div>;

  const { users = [], totalPages = 1, total = 0 } = data || {};

  const roleGradients = { employee: 'from-violet-500 to-purple-600', manager: 'from-blue-500 to-indigo-600', admin: 'from-orange-500 to-red-500' };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">👥 Users</h1>
          <p className="text-slate-500 mt-0.5 text-sm">{total} total users · {users.filter(u=>u.role==='employee').length} employees on this page</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 transition-all duration-150 btn-press"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
          </svg>
          + Create User
        </button>
      </div>

      {/* Stats by role */}
      {data && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { role: 'employee', label: 'Employees', icon: '👷', gradient: 'from-violet-500 to-purple-600' },
            { role: 'manager',  label: 'Managers',  icon: '🏭', gradient: 'from-blue-500 to-indigo-600' },
            { role: 'admin',    label: 'Admins',    icon: '👑', gradient: 'from-orange-500 to-red-500' },
          ].map(({ role, label, icon, gradient }) => {
            const count = users.filter((u) => u.role === role).length;
            return (
              <div key={role} className={`bg-gradient-to-br ${gradient} rounded-2xl p-4 text-white shadow-md card-hover`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-extrabold">{count}</div>
                    <div className="text-white/70 text-xs font-medium mt-0.5">{label}</div>
                  </div>
                  <span className="text-2xl">{icon}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Search bar */}
      <div className="relative mb-6 max-w-md">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name or email..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-all"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Users table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['User', 'Email', 'Role', 'Department', 'Weekly OT Cap (editable)', 'Status'].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="text-4xl mb-2">👤</div>
                    <p>No users found</p>
                  </td>
                </tr>
              ) : users.map((u, i) => (
                <tr key={u._id} className="row-hover animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${roleGradients[u.role] || 'from-slate-400 to-slate-600'} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                        {u.name?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-800 text-sm">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500">{u.email}</td>
                  <td className="px-5 py-4"><Badge label={u.role} /></td>
                  <td className="px-5 py-4 text-sm text-slate-600">{u.department || '—'}</td>
                  <td className="px-5 py-4">
                    {u.role === 'employee' ? (
                      <div className="flex items-center gap-2">
                        {/* minus button */}
                        <button
                          onClick={() => setEditingCap((p) => ({ ...p, [u._id]: Math.max(0, Number(p[u._id] ?? u.weeklyOtCapHours) - 1) }))}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-base flex items-center justify-center transition-all btn-press"
                        >−</button>
                        <input
                          type="number" min={0} max={84}
                          value={editingCap[u._id] ?? u.weeklyOtCapHours}
                          onChange={(e) => setEditingCap((p) => ({ ...p, [u._id]: e.target.value }))}
                          className="w-14 border-2 border-slate-200 rounded-lg px-1 py-1.5 text-sm text-center font-bold focus:outline-none focus:border-blue-500 transition-all"
                          aria-label={`OT cap for ${u.name}`}
                        />
                        {/* plus button */}
                        <button
                          onClick={() => setEditingCap((p) => ({ ...p, [u._id]: Math.min(84, Number(p[u._id] ?? u.weeklyOtCapHours) + 1) }))}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-base flex items-center justify-center transition-all btn-press"
                        >+</button>
                        <span className="text-xs text-slate-400 mr-1">h</span>
                        {/* Save button — always visible for employees */}
                        <button
                          onClick={() => saveCap(u._id, editingCap[u._id] ?? u.weeklyOtCapHours)}
                          disabled={savingCap[u._id] || (editingCap[u._id] === undefined || String(editingCap[u._id]) === String(u.weeklyOtCapHours))}
                          className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-all disabled:opacity-30 flex items-center gap-1 btn-press shrink-0"
                        >
                          {savingCap[u._id] ? (
                            <svg className="animate-spin w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )}
                          Save
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-300 text-sm">— not applicable</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${u.isActive !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.isActive !== false ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                        {u.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} total={total} limit={12} onPageChange={setPage} />

      {/* ── Create User Modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title="Create New User"
        subtitle="Add a new employee, manager or admin to the system"
        icon="👤"
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {/* Name + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                name="name" type="text" value={form.name}
                onChange={handleFormChange} required maxLength={100}
                className={inputClass} placeholder="Ravi Shankar"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                name="email" type="email" value={form.email}
                onChange={handleFormChange} required
                className={inputClass} placeholder="ravi@sundar.com"
              />
            </div>
          </div>

          {/* Password with eye toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                name="password" type={showPassword ? 'text' : 'password'}
                value={form.password} onChange={handleFormChange}
                required minLength={6}
                className={`${inputClass} pr-10`}
                placeholder="Min. 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors p-0.5 rounded"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {/* Role + Department */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Role <span className="text-red-500">*</span>
              </label>
              <select name="role" value={form.role} onChange={handleFormChange} className={inputClass}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>
            {form.role !== 'admin' && (
              <div className="animate-slide-down">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                  Department <span className="text-red-500">*</span>
                </label>
                <select name="department" value={form.department} onChange={handleFormChange} className={inputClass}>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Role info chip */}
          <div className={`px-3 py-2 rounded-xl text-xs font-medium border ${
            form.role === 'admin' ? 'bg-orange-50 border-orange-200 text-orange-700' :
            form.role === 'manager' ? 'bg-blue-50 border-blue-200 text-blue-700' :
            'bg-violet-50 border-violet-200 text-violet-700'
          }`}>
            {form.role === 'admin' && '👑 Admin can access all departments, reports and audit logs'}
            {form.role === 'manager' && '🏭 Manager can create slots and approve signups for their department'}
            {form.role === 'employee' && '👷 Employee can view department slots, sign up, and track their OT'}
          </div>

          <ErrorMessage error={createError} />

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-md shadow-blue-300/30 hover:shadow-blue-300/50 transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-2 btn-press text-sm"
            >
              {createMutation.isPending ? (
                <><svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Creating...</>
              ) : (
                <><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>Create User</>
              )}
            </button>
            <button
              type="button"
              onClick={closeModal}
              disabled={createMutation.isPending}
              className="px-5 py-2.5 border-2 border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-150 disabled:opacity-50 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

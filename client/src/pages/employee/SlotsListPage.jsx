import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getSlotsApi, signupForSlotApi } from '../../api/slots.api';
import { getMySignupsApi } from '../../api/signups.api';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/common/Spinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import { formatDate, formatTime, calculateSlotDuration } from '../../utils/format';
import toast from 'react-hot-toast';

export default function SlotsListPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['slots', page, statusFilter],
    queryFn: () => getSlotsApi({ page, limit: 10, status: statusFilter || undefined }),
    select: (res) => res.data.data,
  });

  const { data: mySignupsData } = useQuery({
    queryKey: ['mySignups'],
    queryFn: () => getMySignupsApi({ limit: 100 }),
    select: (res) => res.data.data.signups,
    enabled: user?.role === 'employee',
  });

  const mySignupMap = {};
  mySignupsData?.forEach((s) => {
    if (['pending', 'approved'].includes(s.status)) mySignupMap[s.slot._id] = s;
  });

  const signupMutation = useMutation({
    mutationFn: signupForSlotApi,
    onSuccess: () => {
      toast.success("You're marked as available! ✅");
      queryClient.invalidateQueries({ queryKey: ['slots'] });
      queryClient.invalidateQueries({ queryKey: ['mySignups'] });
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to sign up'),
  });

  const STATUS_FILTERS = [
    { value: '', label: 'All Slots', icon: '📋' },
    { value: 'open', label: 'Open', icon: '🟢' },
    { value: 'filled', label: 'Filled', icon: '🔵' },
    { value: 'cancelled', label: 'Cancelled', icon: '🔴' },
  ];

  if (isLoading) return <Spinner fullPage />;
  if (error) return <div className="p-8"><ErrorMessage error={error} /></div>;

  const slots = data?.slots || [];
  const isManager = user?.role === 'manager';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">
            {user?.role === 'employee' ? '📋 Available OT Slots' : '📋 OT Slots'}
          </h1>
          <p className="text-slate-500 mt-0.5 text-sm">
            {user?.department ? `${user.department} department` : 'All departments'}
          </p>
        </div>
        {isManager && (
          <Link
            to="/slots/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 transition-all duration-150 btn-press"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Slot
          </Link>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setStatusFilter(f.value); setPage(1); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 ${
              statusFilter === f.value
                ? 'bg-blue-600 text-white shadow-md shadow-blue-300'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            <span>{f.icon}</span>
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-sm text-slate-400 self-center">
          {data?.total || 0} slots found
        </span>
      </div>

      {/* Table */}
      {slots.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-20 text-center animate-fade-in">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-lg font-semibold text-slate-700">No slots found</h3>
          <p className="text-slate-400 text-sm mt-1">
            {statusFilter ? `No ${statusFilter} slots available` : 'No OT slots have been created yet'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Slot', 'Date & Time', 'Duration', 'Dept', 'Spots', 'Status',
                    ...(user?.role === 'employee' ? ['Action'] : []),
                    ...(isManager ? ['Detail'] : []),
                  ].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {slots.map((slot, i) => {
                  const spotsLeft = slot.headcountRequired - slot.approvedCount;
                  const mySignup = mySignupMap[slot._id];
                  return (
                    <tr
                      key={slot._id}
                      className="row-hover animate-fade-in"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800 text-sm">{slot.title}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        <div className="font-medium">{formatDate(slot.startTime)}</div>
                        <div className="text-slate-400 text-xs mt-0.5">{formatTime(slot.startTime)} – {formatTime(slot.endTime)}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">
                          ⏱ {calculateSlotDuration(slot.startTime, slot.endTime)}h
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">{slot.department}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${spotsLeft === 0 ? 'bg-red-500' : 'bg-emerald-500'}`}
                              style={{ width: `${(slot.approvedCount / slot.headcountRequired) * 100}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold ${spotsLeft === 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                            {spotsLeft}/{slot.headcountRequired}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4"><Badge label={slot.status} showDot /></td>
                      {user?.role === 'employee' && (
                        <td className="px-5 py-4">
                          {mySignup ? (
                            <Badge label={mySignup.status} />
                          ) : slot.status === 'open' ? (
                            <button
                              onClick={() => signupMutation.mutate(slot._id)}
                              disabled={signupMutation.isPending}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold rounded-lg hover:shadow-md hover:scale-105 transition-all duration-150 disabled:opacity-50 disabled:scale-100"
                            >
                              {signupMutation.isPending ? (
                                <svg className="animate-spin w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                </svg>
                              ) : '✋'}
                              I'm available
                            </button>
                          ) : null}
                        </td>
                      )}
                      {isManager && (
                        <td className="px-5 py-4">
                          <Link
                            to={`/slots/${slot._id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-all duration-150"
                          >
                            View
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                          </Link>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={page} totalPages={data?.totalPages || 1} total={data?.total} limit={10} onPageChange={setPage} />
    </div>
  );
}

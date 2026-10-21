import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMySignupsApi, withdrawSignupApi } from '../../api/signups.api';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/common/Spinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import Badge from '../../components/common/Badge';
import ProgressBar from '../../components/common/ProgressBar';
import Pagination from '../../components/common/Pagination';
import { formatDate, formatTime, calculateSlotDuration } from '../../utils/format';
import toast from 'react-hot-toast';

export default function MyOtPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['mySignups', page],
    queryFn: () => getMySignupsApi({ page, limit: 10 }),
    select: (res) => res.data.data,
  });

  const withdrawMutation = useMutation({
    mutationFn: withdrawSignupApi,
    onSuccess: () => {
      toast.success('Signup withdrawn');
      queryClient.invalidateQueries({ queryKey: ['mySignups'] });
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Cannot withdraw'),
  });

  if (isLoading) return <Spinner fullPage />;
  if (error) return <div className="p-8"><ErrorMessage error={error} /></div>;

  const { signups = [], weeklyOtHours = 0, cap = user?.weeklyOtCapHours || 12, totalPages = 1, total = 0 } = data || {};
  const pct = cap > 0 ? (weeklyOtHours / cap) * 100 : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 page-enter">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-800">⏱️ My OT History</h1>
        <p className="text-slate-500 mt-0.5 text-sm">{user?.department} · {user?.name}</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'This Week', value: `${weeklyOtHours.toFixed(1)}h`, sub: `of ${cap}h cap`, color: 'from-blue-500 to-indigo-600', icon: '📅' },
          { label: 'Cap Used', value: `${Math.min(Math.round(pct), 100)}%`, sub: pct >= 100 ? 'Cap reached!' : 'of weekly cap', color: pct >= 100 ? 'from-red-500 to-rose-600' : 'from-violet-500 to-purple-600', icon: '📊' },
          { label: 'Total Signups', value: total, sub: 'all time', color: 'from-emerald-500 to-teal-600', icon: '✅' },
        ].map((stat) => (
          <div key={stat.label} className={`bg-gradient-to-br ${stat.color} rounded-2xl p-5 text-white shadow-lg card-hover`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{stat.icon}</span>
            </div>
            <div className="text-3xl font-extrabold">{stat.value}</div>
            <div className="text-white/70 text-sm font-medium mt-1">{stat.label}</div>
            <div className="text-white/50 text-xs mt-0.5">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Progress bar card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8">
        <h2 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
          </svg>
          Weekly OT Hours
        </h2>
        <ProgressBar used={weeklyOtHours} cap={cap} />
        {pct >= 80 && pct < 100 && (
          <p className="text-amber-600 text-xs mt-2 font-medium animate-pulse-soft">⚠️ Approaching weekly cap</p>
        )}
        {pct >= 100 && (
          <p className="text-red-600 text-xs mt-2 font-semibold">🚫 Weekly cap reached</p>
        )}
      </div>

      {/* History table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50">
          <h2 className="font-bold text-slate-700">Signup History</h2>
        </div>
        {signups.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-5xl mb-3">📭</div>
            <p className="text-slate-500 font-medium">No OT history yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Slot', 'Date', 'Time', 'Duration', 'Status', 'Action'].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {signups.map((signup, i) => (
                  <tr key={signup._id} className="row-hover animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                    <td className="px-5 py-4 font-semibold text-slate-800 text-sm">{signup.slot?.title}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {signup.slot?.startTime ? formatDate(signup.slot.startTime) : '—'}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500">
                      {signup.slot?.startTime ? `${formatTime(signup.slot.startTime)} – ${formatTime(signup.slot.endTime)}` : '—'}
                    </td>
                    <td className="px-5 py-4">
                      {signup.slot?.startTime && (
                        <span className="px-2 py-1 bg-slate-100 rounded-lg text-xs font-semibold text-slate-700">
                          {calculateSlotDuration(signup.slot.startTime, signup.slot.endTime)}h
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4"><Badge label={signup.status} showDot /></td>
                    <td className="px-5 py-4">
                      {['pending', 'approved'].includes(signup.status) && (
                        <button
                          onClick={() => {
                            if (window.confirm('Withdraw this signup?')) withdrawMutation.mutate(signup._id);
                          }}
                          disabled={withdrawMutation.isPending}
                          className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all duration-150 disabled:opacity-50"
                        >
                          Withdraw
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} total={total} limit={10} onPageChange={setPage} />
    </div>
  );
}

import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSlotApi, getSlotSignupsApi, cancelSlotApi } from '../../api/slots.api';
import { decideSignupApi } from '../../api/signups.api';
import Spinner from '../../components/common/Spinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import Badge from '../../components/common/Badge';
import ProgressBar from '../../components/common/ProgressBar';
import { formatDate, formatTime, calculateSlotDuration } from '../../utils/format';
import toast from 'react-hot-toast';

export default function SlotDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: slot, isLoading: slotLoading, error: slotError } = useQuery({
    queryKey: ['slot', id],
    queryFn: () => getSlotApi(id),
    select: (res) => res.data.data.slot,
  });

  const { data: signups = [], isLoading: signupsLoading, error: signupsError } = useQuery({
    queryKey: ['slotSignups', id],
    queryFn: () => getSlotSignupsApi(id),
    select: (res) => res.data.data.signups,
  });

  const decideMutation = useMutation({
    mutationFn: ({ signupId, decision }) => decideSignupApi(signupId, decision),
    onSuccess: (_, { decision }) => {
      toast.success(`Signup ${decision === 'approved' ? '✅ approved' : '❌ rejected'}`);
      queryClient.invalidateQueries({ queryKey: ['slotSignups', id] });
      queryClient.invalidateQueries({ queryKey: ['slot', id] });
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Decision failed'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelSlotApi(id),
    onSuccess: () => {
      toast.success('Slot cancelled');
      queryClient.invalidateQueries({ queryKey: ['slot', id] });
      queryClient.invalidateQueries({ queryKey: ['slotSignups', id] });
      queryClient.invalidateQueries({ queryKey: ['slots'] });
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Cancel failed'),
  });

  if (slotLoading || signupsLoading) return <Spinner fullPage />;
  if (slotError) return <div className="p-8"><ErrorMessage error={slotError} /></div>;

  const pending = signups.filter((s) => s.status === 'pending');
  const approved = signups.filter((s) => s.status === 'approved');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 page-enter">
      {/* Back */}
      <Link to="/slots" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-blue-600 text-sm font-medium mb-6 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to Slots
      </Link>

      {/* Slot info card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
        <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-xl font-extrabold text-slate-800">{slot.title}</h1>
                <Badge label={slot.status} showDot />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                <span className="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-blue-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                  </svg>
                  {formatDate(slot.startTime)}
                </span>
                <span className="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-blue-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                </span>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-lg font-semibold">
                  ⏱ {calculateSlotDuration(slot.startTime, slot.endTime)}h
                </span>
                <span>🏭 {slot.department}</span>
              </div>
            </div>

            {slot.status !== 'cancelled' && (
              <button
                onClick={() => { if (window.confirm('Cancel this slot? All signups will be removed.')) cancelMutation.mutate(); }}
                disabled={cancelMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 font-semibold text-sm rounded-xl border border-red-200 hover:bg-red-100 hover:border-red-300 transition-all duration-150 disabled:opacity-50 btn-press"
              >
                {cancelMutation.isPending ? '...' : '🚫 Cancel Slot'}
              </button>
            )}
          </div>

          {/* Headcount progress */}
          <div className="mt-5 pt-5 border-t border-slate-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700">Headcount Progress</span>
              <span className="text-sm font-bold text-slate-600">{slot.approvedCount}/{slot.headcountRequired} approved</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700 relative overflow-hidden"
                style={{ width: `${(slot.approvedCount / slot.headcountRequired) * 100}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {signupsError && <ErrorMessage error={signupsError} className="mb-4" />}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Signups', value: signups.length, color: 'bg-slate-700', icon: '👥' },
          { label: 'Pending Review', value: pending.length, color: 'bg-amber-600', icon: '⏳' },
          { label: 'Approved', value: approved.length, color: 'bg-emerald-600', icon: '✅' },
        ].map((s) => (
          <div key={s.label} className={`${s.color} text-white rounded-2xl p-4 text-center shadow-md`}>
            <div className="text-2xl font-extrabold">{s.value}</div>
            <div className="text-xs text-white/70 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Signups table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
          <h2 className="font-bold text-slate-700">Signups ({signups.length})</h2>
          {pending.length > 0 && (
            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold animate-pulse-soft">
              {pending.length} pending
            </span>
          )}
        </div>

        {signups.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-5xl mb-3">📭</div>
            <p className="text-slate-500 font-medium">No signups yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Employee', 'This Week OT', 'Cap', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {signups.map((signup, i) => {
                  const used = signup.employee?.currentWeekOtHours || 0;
                  const cap = signup.employee?.weeklyOtCapHours || 12;
                  return (
                    <tr key={signup._id} className="row-hover animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {signup.employee?.name?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 text-sm">{signup.employee?.name}</div>
                            <div className="text-xs text-slate-400">{signup.employee?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="w-36">
                          <ProgressBar used={used} cap={cap} showPercentage={false} />
                          <p className="text-xs text-slate-500 mt-1">{used.toFixed(1)}h this week</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-700">{cap}h</td>
                      <td className="px-5 py-4"><Badge label={signup.status} showDot /></td>
                      <td className="px-5 py-4">
                        {signup.status === 'pending' ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => decideMutation.mutate({ signupId: signup._id, decision: 'approved' })}
                              disabled={decideMutation.isPending}
                              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 hover:scale-105 transition-all duration-150 disabled:opacity-50 shadow-sm btn-press"
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => decideMutation.mutate({ signupId: signup._id, decision: 'rejected' })}
                              disabled={decideMutation.isPending}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 hover:scale-105 transition-all duration-150 disabled:opacity-50 shadow-sm btn-press"
                            >
                              ✕ Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">
                            by {signup.decidedBy?.name || '—'}
                          </span>
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
  );
}

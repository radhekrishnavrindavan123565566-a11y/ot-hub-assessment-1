import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAuditLogsApi } from '../../api/reports.api';
import Spinner from '../../components/common/Spinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import Pagination from '../../components/common/Pagination';
import { formatDateTime } from '../../utils/format';

const ACTION_CONFIG = {
  signup_approved:  { label: 'Approved',    color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: '✅' },
  signup_rejected:  { label: 'Rejected',    color: 'bg-red-100 text-red-700 border-red-200',             icon: '❌' },
  signup_withdrawn: { label: 'Withdrawn',   color: 'bg-amber-100 text-amber-800 border-amber-200',       icon: '↩️' },
  slot_cancelled:   { label: 'Cancelled',   color: 'bg-rose-100 text-rose-800 border-rose-200',          icon: '🚫' },
  slot_created:     { label: 'Slot Created',color: 'bg-blue-100 text-blue-800 border-blue-200',          icon: '➕' },
  slot_edited:      { label: 'Slot Edited', color: 'bg-indigo-100 text-indigo-800 border-indigo-200',    icon: '✏️' },
  ot_cap_changed:   { label: 'Cap Changed', color: 'bg-purple-100 text-purple-800 border-purple-200',    icon: '⚙️' },
  user_created:     { label: 'User Created',color: 'bg-teal-100 text-teal-800 border-teal-200',          icon: '👤' },
};

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['auditLogs', page, actionFilter],
    queryFn: () => getAuditLogsApi({ page, limit: 20, action: actionFilter || undefined }),
    select: (res) => res.data.data,
  });

  if (isLoading) return <Spinner fullPage />;
  if (error) return <div className="p-8"><ErrorMessage error={error} /></div>;

  const { logs = [], totalPages = 1, total = 0 } = data || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 page-enter">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">🔍 Audit Log</h1>
          <p className="text-slate-500 mt-0.5 text-sm">{total} events recorded</p>
        </div>
        {/* Action filter */}
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-all"
        >
          <option value="">All Events</option>
          {Object.entries(ACTION_CONFIG).map(([key, val]) => (
            <option key={key} value={key}>{val.icon} {val.label}</option>
          ))}
        </select>
      </div>

      {logs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-20 text-center animate-fade-in">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-lg font-semibold text-slate-700">No audit records</h3>
          <p className="text-slate-400 text-sm mt-1">Events will appear here as actions are performed</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log, i) => {
            const cfg = ACTION_CONFIG[log.action] || { label: log.action, color: 'bg-slate-100 text-slate-700 border-slate-200', icon: '📌' };
            return (
              <div
                key={log._id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-start gap-4 card-hover animate-fade-in"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-xl shrink-0 border border-slate-100">
                  {cfg.icon}
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <span className="text-sm font-semibold text-slate-800 truncate">
                      by <span className="text-blue-600">{log.performedBy?.name || '—'}</span>
                    </span>
                    {log.performedBy?.role && (
                      <span className="text-xs text-slate-400 capitalize">({log.performedBy.role})</span>
                    )}
                  </div>

                  {log.targetUser && (
                    <p className="text-xs text-slate-500 mt-1">
                      Target: <span className="font-medium text-slate-700">{log.targetUser.name}</span>
                      {log.targetUser.email && <span className="text-slate-400"> · {log.targetUser.email}</span>}
                    </p>
                  )}

                  {/* Diff: previous → new */}
                  {(log.previousValue || log.newValue) && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
                      {log.previousValue && (
                        <span className="px-2 py-1 bg-red-50 border border-red-100 rounded-lg text-red-700 font-mono">
                          {JSON.stringify(log.previousValue)}
                        </span>
                      )}
                      {log.previousValue && log.newValue && (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 text-slate-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      )}
                      {log.newValue && (
                        <span className="px-2 py-1 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 font-mono">
                          {JSON.stringify(log.newValue)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <div className="text-xs text-slate-400 whitespace-nowrap shrink-0 text-right">
                  {formatDateTime(log.createdAt)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} total={total} limit={20} onPageChange={setPage} />
    </div>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMonthlyReportApi } from '../../api/reports.api';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/common/Spinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import { exportToCSV } from '../../utils/format';

const currentMonth = () => new Date().toISOString().substring(0, 7);

const DEPT_COLORS = {
  Machining: 'bg-blue-100 text-blue-800',
  Assembly:  'bg-emerald-100 text-emerald-800',
  Quality:   'bg-purple-100 text-purple-800',
  Dispatch:  'bg-orange-100 text-orange-800',
};

export default function ReportPage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(currentMonth());

  const { data, isLoading, error } = useQuery({
    queryKey: ['report', month],
    queryFn: () => getMonthlyReportApi(month),
    select: (res) => res.data.data,
    enabled: !!month,
  });

  const handleExportCSV = () => {
    if (!data?.results?.length) return;
    exportToCSV(
      data.results.map((r) => ({
        Name: r.name, Email: r.email, Department: r.department,
        'Approved Shifts': r.approvedCount,
        'Total OT Hours': r.totalHours,
        'Weekly Cap (hrs)': r.weeklyOtCapHours,
      })),
      `ot-report-${month}.csv`
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">📊 Monthly OT Report</h1>
          <p className="text-slate-500 mt-0.5 text-sm">
            {user?.role === 'manager' ? `${user.department} department` : 'All departments'}
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={!data?.results?.length}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-105 disabled:opacity-40 disabled:scale-100 transition-all duration-150 btn-press"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Month picker */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6 flex items-center gap-4 flex-wrap">
        <label htmlFor="month" className="text-sm font-semibold text-slate-700 shrink-0">Select Month:</label>
        <input
          id="month" type="month" value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
        />
        {data && (
          <div className="flex items-center gap-1.5 ml-auto text-sm text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-soft" />
            Report for <span className="font-semibold text-slate-700">{month}</span>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12">
          <Spinner />
        </div>
      )}
      {error && <ErrorMessage error={error} />}

      {data && (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Total OT Hours', value: `${data.totalHours}h`, sub: 'approved this month', gradient: 'from-blue-600 to-indigo-600', icon: '⏱️' },
              { label: 'Employees with OT', value: data.employeeCount, sub: 'participated', gradient: 'from-violet-600 to-purple-600', icon: '👷' },
              { label: 'Avg per Employee', value: data.employeeCount > 0 ? `${(data.totalHours / data.employeeCount).toFixed(1)}h` : '—', sub: 'average hours', gradient: 'from-emerald-600 to-teal-600', icon: '📈' },
            ].map((s) => (
              <div key={s.label} className={`bg-gradient-to-br ${s.gradient} rounded-2xl p-5 text-white shadow-lg card-hover animate-scale-in`}>
                <div className="text-2xl mb-2">{s.icon}</div>
                <div className="text-3xl font-extrabold">{s.value}</div>
                <div className="text-white/70 text-sm mt-1">{s.label}</div>
                <div className="text-white/50 text-xs mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Results table */}
          {data.results.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-20 text-center animate-fade-in">
              <div className="text-5xl mb-4">📭</div>
              <h3 className="text-lg font-semibold text-slate-700">No approved OT for {month}</h3>
              <p className="text-slate-400 text-sm mt-1">Approved signups will appear here</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
              <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
                <h2 className="font-bold text-slate-700">Employee Breakdown</h2>
                <span className="text-sm text-slate-400">{data.results.length} employees</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {['Employee', 'Department', 'Approved Shifts', 'Total OT Hours', 'Weekly Cap', 'Utilization'].map((h) => (
                        <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.results.map((row, i) => {
                      // Monthly utilisation: totalHours vs (weeklyOtCapHours × 4.33 avg weeks/month)
                      const monthlyCap = Math.round((row.weeklyOtCapHours || 12) * 4.33);
                      const utilPct = Math.min((row.totalHours / monthlyCap) * 100, 100);
                      const utilColor = utilPct >= 80
                        ? 'bg-gradient-to-r from-red-500 to-rose-500'
                        : utilPct >= 50
                        ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-500';
                      return (
                        <tr key={row.employeeId} className="row-hover animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {row.name?.[0]?.toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-800 text-sm">{row.name}</div>
                                <div className="text-xs text-slate-400">{row.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${DEPT_COLORS[row.department] || 'bg-slate-100 text-slate-700'}`}>
                              {row.department}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold text-sm">
                              {row.approvedCount}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-lg font-extrabold text-slate-800">{row.totalHours}h</span>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600">{row.weeklyOtCapHours}h/wk</td>
                          <td className="px-5 py-4 min-w-[140px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden" title={`${row.totalHours}h of ${monthlyCap}h monthly cap`}>
                                <div
                                  className={`h-full rounded-full transition-all duration-700 ${utilColor}`}
                                  style={{ width: `${utilPct}%` }}
                                />
                              </div>
                              <span className={`text-xs font-bold w-9 ${utilPct >= 80 ? 'text-red-600' : 'text-slate-500'}`}>
                                {Math.round(utilPct)}%
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">{row.totalHours}h of ~{monthlyCap}h/mo</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Total row */}
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-200">
                      <td colSpan={3} className="px-5 py-3.5 font-bold text-slate-700 text-sm">Grand Total</td>
                      <td className="px-5 py-3.5">
                        <span className="text-xl font-extrabold text-blue-700">{data.totalHours}h</span>
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

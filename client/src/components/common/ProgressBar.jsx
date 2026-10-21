export default function ProgressBar({ used, cap, label, showPercentage = true }) {
  const pct = cap > 0 ? Math.min((used / cap) * 100, 100) : 0;
  const isWarning = pct >= 80 && pct < 100;
  const isDanger = pct >= 100;

  const trackColor = isDanger ? 'bg-red-100' : isWarning ? 'bg-amber-100' : 'bg-slate-100';
  const barColor = isDanger
    ? 'bg-gradient-to-r from-red-500 to-red-600'
    : isWarning
    ? 'bg-gradient-to-r from-amber-400 to-orange-500'
    : 'bg-gradient-to-r from-blue-500 to-indigo-500';

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-sm text-slate-600 font-medium">{label}</span>}
          <span className={`text-sm font-bold ${isDanger ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-slate-700'}`}>
            {used.toFixed(1)}h / {cap}h
            {showPercentage && <span className="text-xs font-normal text-slate-400 ml-1">({Math.round(pct)}%)</span>}
          </span>
        </div>
      )}
      <div className={`w-full ${trackColor} rounded-full h-2.5 overflow-hidden`} role="progressbar" aria-valuenow={used} aria-valuemax={cap}>
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-700 ease-out relative overflow-hidden`}
          style={{ width: `${pct}%` }}
        >
          {/* Shimmer effect on the bar */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
        </div>
      </div>
    </div>
  );
}

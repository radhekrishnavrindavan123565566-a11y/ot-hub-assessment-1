const VARIANTS = {
  open:      'bg-emerald-100 text-emerald-800 border-emerald-200',
  filled:    'bg-blue-100 text-blue-800 border-blue-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
  pending:   'bg-amber-100 text-amber-800 border-amber-200',
  approved:  'bg-emerald-100 text-emerald-800 border-emerald-200',
  rejected:  'bg-red-100 text-red-700 border-red-200',
  withdrawn: 'bg-slate-100 text-slate-600 border-slate-200',
  employee:  'bg-violet-100 text-violet-700 border-violet-200',
  manager:   'bg-blue-100 text-blue-700 border-blue-200',
  admin:     'bg-orange-100 text-orange-700 border-orange-200',
};

const DOTS = {
  open:      'bg-emerald-500',
  filled:    'bg-blue-500',
  cancelled: 'bg-red-500',
  pending:   'bg-amber-500',
  approved:  'bg-emerald-500',
  rejected:  'bg-red-500',
  withdrawn: 'bg-slate-400',
};

export default function Badge({ label, showDot = false }) {
  const key = label?.toLowerCase() || '';
  const colorClass = VARIANTS[key] || 'bg-slate-100 text-slate-600 border-slate-200';
  const dotClass = DOTS[key];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${colorClass}`}>
      {showDot && dotClass && <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />}
      {label}
    </span>
  );
}

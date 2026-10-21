export default function Spinner({ size = 'md', className = '', fullPage = false }) {
  const sizes = { sm: 'h-4 w-4 border-2', md: 'h-8 w-8 border-[3px]', lg: 'h-12 w-12 border-4' };

  const spinner = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className="relative">
        <div className={`${sizes[size]} rounded-full border-blue-100 border-t-blue-600 animate-spin`} role="status" aria-label="Loading" />
        <div className={`absolute inset-0 ${sizes[size]} rounded-full border-blue-100 border-l-indigo-400 animate-spin opacity-40`} style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
      </div>
      {size !== 'sm' && <p className="text-sm text-slate-400 animate-pulse-soft">Loading...</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        {spinner}
      </div>
    );
  }
  return spinner;
}

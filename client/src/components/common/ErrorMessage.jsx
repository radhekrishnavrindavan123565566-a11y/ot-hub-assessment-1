export default function ErrorMessage({ error, className = '' }) {
  if (!error) return null;
  const message = error?.response?.data?.error?.message || error?.message || 'Something went wrong';
  return (
    <div role="alert" className={`animate-slide-down flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 p-3.5 ${className}`}>
      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-red-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <p className="text-sm text-red-700 font-medium pt-1">{message}</p>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { createSlotApi } from '../../api/slots.api';
import { useAuth } from '../../context/AuthContext';
import ErrorMessage from '../../components/common/ErrorMessage';
import toast from 'react-hot-toast';

const toISOString = (date, time) => {
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  let utcHour = h - 5;
  let utcMin = min - 30;
  if (utcMin < 0) { utcMin += 60; utcHour -= 1; }
  return new Date(Date.UTC(y, m - 1, d, utcHour, utcMin)).toISOString();
};

const todayStr = () => new Date().toISOString().substring(0, 10);

export default function CreateSlotPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ title: '', date: '', startTime: '', endTime: '', headcountRequired: 2 });
  const [formError, setFormError] = useState(null);

  const mutation = useMutation({
    mutationFn: createSlotApi,
    onSuccess: () => {
      toast.success('Slot created! 🎉');
      navigate('/slots');
    },
    onError: (err) => setFormError(err),
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError(null);
    if (!form.date || !form.startTime || !form.endTime) {
      setFormError({ message: 'Date and times are required' });
      return;
    }
    mutation.mutate({
      title: form.title,
      department: user.department,
      date: form.date,
      startTime: toISOString(form.date, form.startTime),
      endTime: toISOString(form.date, form.endTime),
      headcountRequired: Number(form.headcountRequired),
    });
  };

  const inputClass = "w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200 placeholder-slate-400";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 page-enter">
      {/* Back nav */}
      <Link to="/slots" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-blue-600 text-sm font-medium mb-6 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to Slots
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800">➕ Create OT Slot</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Department: <span className="font-semibold text-blue-600">{user?.department}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
          <div className="p-6 space-y-5">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Slot Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title" name="title" value={form.title} onChange={handleChange}
                required maxLength={200}
                className={inputClass}
                placeholder="e.g. CNC Machine Run – Evening Shift"
              />
            </div>

            {/* Date */}
            <div>
              <label htmlFor="date" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Date (IST) <span className="text-red-500">*</span>
              </label>
              <input
                id="date" name="date" type="date" value={form.date} onChange={handleChange}
                required min={todayStr()}
                className={inputClass}
              />
            </div>

            {/* Start / End time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startTime" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Start Time (IST) <span className="text-red-500">*</span>
                </label>
                <input id="startTime" name="startTime" type="time" value={form.startTime} onChange={handleChange} required className={inputClass} />
              </div>
              <div>
                <label htmlFor="endTime" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  End Time (IST) <span className="text-red-500">*</span>
                </label>
                <input id="endTime" name="endTime" type="time" value={form.endTime} onChange={handleChange} required className={inputClass} />
              </div>
            </div>

            {/* Duration hint */}
            {form.startTime && form.endTime && (
              <div className="animate-slide-down flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
                <span className="text-blue-500">⏱</span>
                <span className="text-sm text-blue-700 font-medium">
                  Duration: {(() => {
                    const [sh, sm] = form.startTime.split(':').map(Number);
                    const [eh, em] = form.endTime.split(':').map(Number);
                    const diff = (eh * 60 + em) - (sh * 60 + sm);
                    if (diff <= 0) return '—';
                    if (diff > 360) return <span className="text-red-600 font-bold">⚠ Exceeds 6h max!</span>;
                    return `${(diff / 60).toFixed(1)} hours`;
                  })()}
                </span>
              </div>
            )}

            {/* Headcount */}
            <div>
              <label htmlFor="headcountRequired" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Headcount Required <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, headcountRequired: Math.max(1, p.headcountRequired - 1) }))}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-lg transition-all btn-press"
                >−</button>
                <input
                  id="headcountRequired" name="headcountRequired" type="number"
                  min={1} max={50} value={form.headcountRequired} onChange={handleChange} required
                  className="w-20 text-center px-3 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 font-bold text-lg focus:outline-none focus:border-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, headcountRequired: Math.min(50, p.headcountRequired + 1) }))}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-lg transition-all btn-press"
                >+</button>
                <span className="text-sm text-slate-500">people (max 50)</span>
              </div>
            </div>

            <ErrorMessage error={formError} />
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-md shadow-blue-300/40 hover:shadow-blue-300/60 hover:scale-[1.01] transition-all duration-150 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 btn-press"
            >
              {mutation.isPending ? (
                <><svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Creating...</>
              ) : (
                <><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>Create Slot</>
              )}
            </button>
            <Link
              to="/slots"
              className="px-6 py-3 border-2 border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-150 text-center"
            >
              Cancel
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}

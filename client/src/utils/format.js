import { format, parseISO } from 'date-fns';

export const formatDate = (isoString) => format(parseISO(isoString), 'MMM dd, yyyy');
export const formatTime = (isoString) => format(parseISO(isoString), 'HH:mm');
export const formatDateTime = (isoString) => format(parseISO(isoString), 'MMM dd, yyyy HH:mm');

export const calculateSlotDuration = (start, end) => {
  const diffMs = new Date(end) - new Date(start);
  return Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10; // hours, 1 decimal
};

export const exportToCSV = (data, filename) => {
  if (data.length === 0) return;
  const keys = Object.keys(data[0]);
  const header = keys.join(',');
  const rows = data.map((row) => keys.map((k) => JSON.stringify(row[k] ?? '')).join(','));
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

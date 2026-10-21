import api from './axiosInstance';

export const getMonthlyReportApi = (month) => api.get('/reports/monthly', { params: { month } });
export const getAuditLogsApi = (params) => api.get('/audit-logs', { params });

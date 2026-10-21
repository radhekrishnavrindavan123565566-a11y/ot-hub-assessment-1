import api from './axiosInstance';

export const getMySignupsApi = (params) => api.get('/me/signups', { params });
export const decideSignupApi = (signupId, decision) =>
  api.patch(`/signups/${signupId}/decision`, { decision });
export const withdrawSignupApi = (signupId) => api.delete(`/signups/${signupId}`);

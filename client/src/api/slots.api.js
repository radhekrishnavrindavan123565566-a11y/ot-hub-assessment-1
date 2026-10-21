import api from './axiosInstance';

export const getSlotsApi = (params) => api.get('/slots', { params });
export const getSlotApi = (id) => api.get(`/slots/${id}`);
export const createSlotApi = (data) => api.post('/slots', data);
export const updateSlotApi = (id, data) => api.patch(`/slots/${id}`, data);
export const cancelSlotApi = (id) => api.post(`/slots/${id}/cancel`);
export const signupForSlotApi = (slotId) => api.post(`/slots/${slotId}/signups`);
export const getSlotSignupsApi = (slotId) => api.get(`/slots/${slotId}/signups`);

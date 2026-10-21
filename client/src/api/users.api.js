import api from './axiosInstance';

export const getUsersApi = (params) => api.get('/users', { params });
export const createUserApi = (data) => api.post('/users', data);
export const updateOtCapApi = (userId, weeklyOtCapHours) =>
  api.patch(`/users/${userId}/ot-cap`, { weeklyOtCapHours });

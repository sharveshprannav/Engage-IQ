import { axiosClient } from './axiosClient';

export const feedbackApi = {
  create: (data) => axiosClient.post('/feedback', data),
  bulkCreate: (items) => axiosClient.post('/feedback/bulk', { items }),
  list: (params) => axiosClient.get('/feedback', { params }),
  getById: (id) => axiosClient.get(`/feedback/${id}`),
  update: (id, data) => axiosClient.patch(`/feedback/${id}`, data),
};

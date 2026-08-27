import { axiosClient } from './axiosClient';

export const analyticsApi = {
  getOverview: () => axiosClient.get('/analytics/overview'),
  getInsights: () => axiosClient.get('/analytics/insights'),
  getClusters: () => axiosClient.get('/analytics/clusters'),
  semanticSearch: (query, category) => axiosClient.get('/search/semantic', { params: { q: query, category } }),
  nlQuery: (query) => axiosClient.get('/search/nl-query', { params: { q: query } }),
};

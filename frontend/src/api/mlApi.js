/**
 * EngageAI — ML Pipeline API Client
 * Axios-based client for all ML Pipeline Studio endpoints.
 */

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const mlClient = axios.create({
  baseURL: `${BASE_URL}/api/v1/ml-pipeline`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Attach JWT token to every request
mlClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const mlApi = {
  /**
   * Real-time multi-modal inference.
   * @param {Object} payload - MLPipelineInput
   */
  predict: (payload) => mlClient.post('/predict', payload),

  /**
   * Submit async batch job.
   * @param {Object} payload - MLPipelineInput
   */
  submitBatch: (payload) => mlClient.post('/batch', payload),

  /**
   * Submit user correction for feedback loop.
   * @param {Object} correction - MLFeedbackSubmit
   */
  submitFeedback: (correction) => mlClient.post('/feedback', correction),

  /**
   * Retrieve paginated, user-isolated history logs with optional search & filters.
   * @param {number|Object} pageOrParams - Page number or query params object
   * @param {number} [pageSize]
   */
  getLogs: (pageOrParams = 1, pageSize = 50) => {
    if (typeof pageOrParams === 'object') {
      return mlClient.get('/logs', { params: pageOrParams });
    }
    return mlClient.get('/logs', { params: { page: pageOrParams, page_size: pageSize } });
  },

  /**
   * Retrieve a single history session by ID or request_id (with 403 server authorization check).
   * @param {string} identifier - UUID or request_id
   */
  getLog: (identifier) => mlClient.get(`/logs/${identifier}`),

  /**
   * Update a history session (category, notes, label).
   * @param {string} identifier - UUID or request_id
   * @param {Object} dto - { category_name, primary_label, correction_note, corrected_label }
   */
  updateLog: (identifier, dto) => mlClient.patch(`/logs/${identifier}`, dto),

  /**
   * Delete a single history session owned by the authenticated user.
   * @param {string} identifier - UUID or request_id
   */
  deleteLog: (identifier) => mlClient.delete(`/logs/${identifier}`),

  /**
   * Clear all history sessions for the authenticated user.
   */
  clearLogs: () => mlClient.delete('/logs'),

  /**
   * Export user history in CSV or JSON format.
   * @param {string} format - 'csv' or 'json'
   */
  exportLogs: (format = 'csv') =>
    mlClient.get('/logs/export', {
      params: { format },
      responseType: format === 'json' ? 'json' : 'blob',
    }),
};

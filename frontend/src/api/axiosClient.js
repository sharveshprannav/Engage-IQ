import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const axiosClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor — Auth Token Injection
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor — 401 Refresh Handling & Error Normalization
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized & auto refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token: newRefresh } = res.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', newRefresh);

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return axiosClient(originalRequest);
        } catch (refreshErr) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshErr);
        }
      }
    }

    // Normalized error format for UI toasts
    const normalizedError = {
      message:
        error.response?.data?.detail ||
        error.response?.data?.error?.message ||
        error.message ||
        'An unexpected error occurred',
      code: error.response?.data?.error?.code || 'UNKNOWN_ERROR',
      details: error.response?.data?.error?.details || null,
      status: error.response?.status,
    };

    return Promise.reject(normalizedError);
  }
);

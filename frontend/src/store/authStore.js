import { create } from 'zustand';
import { axiosClient } from '../api/axiosClient';

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await axiosClient.post('/auth/login', { email, password });
      const { access_token, refresh_token } = res.data;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);

      const meRes = await axiosClient.get('/auth/me');

      set({
        user: meRes.data,
        isAuthenticated: true,
        loading: false,
      });
      return true;
    } catch (err) {
      set({
        error: err.message || 'Login failed',
        loading: false,
      });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('engageai_user_profile');
    localStorage.removeItem('engageai_gemini_key');
    set({ user: null, isAuthenticated: false });
  },

  fetchProfile: async () => {
    if (!localStorage.getItem('access_token')) return;
    try {
      const res = await axiosClient.get('/auth/me');
      set({ user: res.data, isAuthenticated: true });
    } catch (err) {
      set({ user: null, isAuthenticated: false });
    }
  },
}));

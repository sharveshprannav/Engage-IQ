import { create } from 'zustand';
import { feedbackApi } from '../api/feedbackApi';

export const useFeedbackStore = create((set, get) => ({
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  selectedFeedback: null,
  loading: false,
  filters: {
    status: '',
    priority: '',
    category: '',
    customer_tier: '',
    search: '',
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      page: 1,
    }));
    get().fetchFeedback();
  },

  fetchFeedback: async () => {
    set({ loading: true });
    try {
      const { filters, page, pageSize } = get();
      const res = await feedbackApi.list({ ...filters, page, page_size: pageSize });
      set({
        items: res.data.items,
        total: res.data.total,
        loading: false,
      });
    } catch (err) {
      set({ loading: false });
    }
  },

  setSelectedFeedback: (item) => set({ selectedFeedback: item }),

  addLiveFeedback: (newItem) => {
    set((state) => ({
      items: [newItem, ...state.items],
      total: state.total + 1,
    }));
  },
}));

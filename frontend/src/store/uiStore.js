import { create } from 'zustand';

export const useUIStore = create((set) => ({
  isDarkMode: localStorage.getItem('theme') === 'dark' || true,
  sidebarOpen: true,
  toasts: [],

  toggleDarkMode: () => {
    set((state) => {
      const newDark = !state.isDarkMode;
      localStorage.setItem('theme', newDark ? 'dark' : 'light');
      if (newDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { isDarkMode: newDark };
    });
  },

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  addToast: (message, type = 'info') => {
    const id = Date.now();
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 4000);
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

// Initialize theme on load
if (localStorage.getItem('theme') !== 'light') {
  document.documentElement.classList.add('dark');
}

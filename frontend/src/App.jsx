import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useAuthStore } from './store/authStore';

export function App() {
  const fetchProfile = useAuthStore((s) => s.fetchProfile);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return <RouterProvider router={router} />;
}

export default App;

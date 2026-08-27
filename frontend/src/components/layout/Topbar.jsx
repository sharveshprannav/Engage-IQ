import React from 'react';
import { DarkModeToggle } from '../common/DarkModeToggle';
import { useAuthStore } from '../../store/authStore';
import { Bell, User } from 'lucide-react';

export function Topbar() {
  const { user } = useAuthStore();

  return (
    <header className="h-16 px-6 bg-white/80 dark:bg-dark-card/80 backdrop-blur-md border-b border-gray-200 dark:border-dark-border flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center space-x-3">
        <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Feedback Intelligence Hub</h1>
        <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          Live Agent Network Active
        </span>
      </div>

      <div className="flex items-center space-x-4">
        <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 relative rounded-lg">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full animate-ping" />
        </button>

        <DarkModeToggle />

        <div className="flex items-center space-x-3 pl-3 border-l border-gray-200 dark:border-dark-border">
          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white font-semibold text-xs">
            {user?.full_name ? user.full_name.charAt(0) : 'A'}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{user?.full_name || 'Admin User'}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role || 'admin'}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

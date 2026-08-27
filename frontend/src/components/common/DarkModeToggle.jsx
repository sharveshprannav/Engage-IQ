import React from 'react';
import { useUIStore } from '../../store/uiStore';
import { Sun, Moon } from 'lucide-react';

export function DarkModeToggle() {
  const { isDarkMode, toggleDarkMode } = useUIStore();

  return (
    <button
      onClick={toggleDarkMode}
      className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
      title="Toggle Dark Mode"
    >
      {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
    </button>
  );
}

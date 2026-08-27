import React from 'react';
import { NavLink } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import {
  LayoutDashboard,
  MessageSquare,
  Bot,
  User,
  BrainCircuit,
  ChevronLeft,
  FlaskConical,
} from 'lucide-react';

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'ML Pipeline Studio', path: '/ml-pipeline', icon: FlaskConical },
    { name: 'AI Assistant', path: '/assistant', icon: Bot },
    { name: 'Feedback Explorer', path: '/explorer', icon: MessageSquare },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 bg-white dark:bg-dark-card border-r border-gray-200 dark:border-dark-border ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-dark-border">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-brand-600 rounded-xl text-white shadow-lg shadow-brand-500/30">
            <BrainCircuit className="w-6 h-6" />
          </div>
          {sidebarOpen && (
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-brand-600 to-indigo-500 bg-clip-text text-transparent">
              EngageAI
            </span>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
        >
          <ChevronLeft className={`w-5 h-5 transition-transform ${!sidebarOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <nav className="p-3 space-y-1 mt-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all ${
                isActive
                  ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-hover hover:text-gray-900 dark:hover:text-white'
              }`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>{item.name}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

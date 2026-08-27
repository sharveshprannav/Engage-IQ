import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Toast } from '../common/Toast';
import { useUIStore } from '../../store/uiStore';
import { useWebSocket } from '../../hooks/useWebSocket';

export function DashboardLayout({ children }) {
  const { sidebarOpen } = useUIStore();
  
  // Initialize auto-reconnecting WebSocket connection for live events
  useWebSocket();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors duration-200">
      <Sidebar />
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <Topbar />
        <main className="p-6">{children}</main>
      </div>
      <Toast />
    </div>
  );
}

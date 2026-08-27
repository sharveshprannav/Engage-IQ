import React from 'react';
import { useUIStore } from '../../store/uiStore';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export function Toast() {
  const { toasts, removeToast } = useUIStore();

  if (!toasts.length) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 max-w-md w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-center justify-between p-4 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl shadow-lg transition-all"
        >
          <div className="flex items-center space-x-3">
            {icons[toast.type] || icons.info}
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{toast.message}</span>
          </div>
          <button onClick={() => removeToast(toast.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

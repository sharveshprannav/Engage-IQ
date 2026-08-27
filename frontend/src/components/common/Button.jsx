import React from 'react';
import { Loader2 } from 'lucide-react';

export function Button({ children, variant = 'primary', size = 'md', loading = false, className = '', disabled, ...props }) {
  const baseStyle = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-brand-600 hover:bg-brand-700 text-white focus:ring-brand-500',
    secondary: 'bg-gray-200 dark:bg-dark-hover hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    outline: 'border border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-hover',
  };

  const sizes = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
}

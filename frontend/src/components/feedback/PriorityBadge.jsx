import React from 'react';

export function PriorityBadge({ priority }) {
  const styles = {
    very_high: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    high: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    low: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    normal: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
  };

  const labels = {
    very_high: '🔴 Very High',
    high: '🟠 High',
    low: '🟡 Low',
    normal: '🟢 Normal',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
        styles[priority] || styles.normal
      }`}
    >
      {labels[priority] || priority}
    </span>
  );
}

import React from 'react';

export function LoadingSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-gray-200 dark:bg-dark-hover rounded-lg w-full" />
      ))}
    </div>
  );
}

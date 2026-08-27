import React from 'react';
import { PriorityBadge } from './PriorityBadge';
import { SentimentTag } from './SentimentTag';
import { Eye, Clock } from 'lucide-react';

export function FeedbackTable({ items, onSelect }) {
  if (!items || !items.length) {
    return (
      <div className="p-12 text-center text-gray-500 dark:text-gray-400">
        No feedback items found matching current filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-gray-200 dark:border-dark-border rounded-xl">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 dark:bg-dark-hover text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-dark-border font-medium">
          <tr>
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3">Feedback Summary</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Tier</th>
            <th className="px-4 py-3">Priority</th>
            <th className="px-4 py-3">Sentiment</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-dark-border bg-white dark:bg-dark-card">
          {items.map((item) => (
            <tr
              key={item.id}
              onClick={() => onSelect(item)}
              className="hover:bg-gray-50 dark:hover:bg-dark-hover/50 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3.5 capitalize font-medium text-gray-700 dark:text-gray-300">
                {item.source_channel}
              </td>
              <td className="px-4 py-3.5 max-w-xs truncate text-gray-900 dark:text-gray-100 font-normal">
                {item.summary || item.raw_text}
              </td>
              <td className="px-4 py-3.5">
                <span className="capitalize px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300">
                  {item.category || 'inquiry'}
                </span>
              </td>
              <td className="px-4 py-3.5 uppercase text-xs font-semibold text-gray-500 dark:text-gray-400">
                {item.customer_tier}
              </td>
              <td className="px-4 py-3.5">
                <PriorityBadge priority={item.priority} />
              </td>
              <td className="px-4 py-3.5">
                <SentimentTag sentiment={item.sentiment} />
              </td>
              <td className="px-4 py-3.5 text-right">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(item);
                  }}
                  className="p-1.5 text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 rounded-lg"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

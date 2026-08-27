import React from 'react';
import { PriorityBadge } from './PriorityBadge';
import { SentimentTag } from './SentimentTag';

export function FeedbackCard({ item, onClick }) {
  return (
    <div
      onClick={onClick}
      className="p-5 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase font-bold text-gray-400">{item.source_channel}</span>
        <PriorityBadge priority={item.priority} />
      </div>
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
        {item.raw_text}
      </p>
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-dark-border">
        <SentimentTag sentiment={item.sentiment} />
        <span className="text-xs text-gray-400 capitalize">{item.customer_tier} tier</span>
      </div>
    </div>
  );
}

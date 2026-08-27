import React from 'react';

export function SentimentTag({ sentiment }) {
  if (sentiment === null || sentiment === undefined) return null;

  let style = 'bg-gray-100 dark:bg-gray-800 text-gray-600';
  let label = 'Neutral';

  if (sentiment >= 0.3) {
    style = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    label = `Positive (${sentiment.toFixed(2)})`;
  } else if (sentiment <= -0.3) {
    style = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
    label = `Negative (${sentiment.toFixed(2)})`;
  } else {
    style = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    label = `Mixed/Neutral (${sentiment.toFixed(2)})`;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      {label}
    </span>
  );
}

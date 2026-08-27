import React from 'react';
import { AlertOctagon, ShieldAlert, CheckSquare, Sparkles } from 'lucide-react';

export function RootCauseTree({ hypothesis }) {
  if (!hypothesis) {
    return (
      <div className="p-6 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl text-center text-gray-400">
        No active incident hypothesis loaded.
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl shadow-sm space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-dark-border">
        <div className="flex items-center space-x-2 text-rose-500 font-bold">
          <AlertOctagon className="w-5 h-5" />
          <h3 className="text-base text-gray-900 dark:text-white">AI Root Cause Hypothesis Viewer</h3>
        </div>
        <span className="px-3 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full text-xs font-semibold">
          Confidence: {(hypothesis.confidence * 100).toFixed(0)}%
        </span>
      </div>

      {/* Main Hypothesis Box */}
      <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-2">
        <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase">Core Hypothesis</span>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{hypothesis.hypothesis}</p>
      </div>

      {/* Supporting Evidence */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-gray-400 uppercase flex items-center">
          <ShieldAlert className="w-4 h-4 mr-1.5 text-amber-500" /> Correlated Evidence
        </h4>
        <ul className="space-y-2">
          {hypothesis.supporting_evidence?.map((ev, i) => (
            <li key={i} className="flex items-start space-x-2 text-sm text-gray-700 dark:text-gray-300">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-2" />
              <span>{ev}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Suggested Actions */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-gray-400 uppercase flex items-center">
          <CheckSquare className="w-4 h-4 mr-1.5 text-emerald-500" /> Suggested Mitigation Actions
        </h4>
        <ul className="space-y-2">
          {hypothesis.suggested_actions?.map((act, i) => (
            <li key={i} className="p-3 bg-gray-50 dark:bg-dark-hover rounded-lg text-sm text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-dark-border">
              {i + 1}. {act}
            </li>
          ))}
        </ul>
      </div>

      {/* Disclaimer */}
      <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs text-gray-500 dark:text-gray-400 italic">
        ⚠️ {hypothesis.disclaimer}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { X, Sparkles, Brain, AlertTriangle, ShieldCheck, CheckCircle, Clock } from 'lucide-react';
import { PriorityBadge } from './PriorityBadge';
import { SentimentTag } from './SentimentTag';
import { Button } from '../common/Button';
import { feedbackApi } from '../../api/feedbackApi';

export function FeedbackDetailDrawer({ item, onClose, onUpdateStatus }) {
  const [updating, setUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(item?.status || 'new');

  if (!item) return null;

  const handleUpdateStatus = async (newStatus) => {
    setUpdating(true);
    try {
      await feedbackApi.update(item.id, { status: newStatus });
      setCurrentStatus(newStatus);
      if (onUpdateStatus) onUpdateStatus(item.id, newStatus);
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white dark:bg-dark-card border-l border-gray-200 dark:border-dark-border shadow-2xl overflow-y-auto transform transition-all p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-dark-border pb-4">
        <div className="flex items-center space-x-2">
          <Brain className="w-5 h-5 text-brand-500" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">AI Analysis & Feedback Detail</h2>
        </div>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Status Badge */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-hover rounded-xl">
        <span className="text-xs font-semibold text-gray-500 uppercase">Current Status</span>
        <span className={`text-xs font-extrabold uppercase px-2.5 py-1 rounded-full ${
          currentStatus === 'resolved'
            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            : currentStatus === 'in_progress'
            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
            : 'bg-sky-500/20 text-sky-600 dark:text-sky-400'
        }`}>
          {currentStatus}
        </span>
      </div>

      {/* Raw Feedback */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-400 uppercase">Raw Customer Feedback</label>
        <div className="p-4 bg-gray-50 dark:bg-dark-hover/70 rounded-xl border border-gray-200 dark:border-dark-border text-sm text-gray-800 dark:text-gray-200">
          "{item.raw_text}"
        </div>
      </div>

      {/* AI Reasoning Section */}
      <div className="p-4 bg-brand-500/10 border border-brand-500/20 rounded-xl space-y-3">
        <div className="flex items-center space-x-2 text-brand-600 dark:text-brand-400 font-semibold text-sm">
          <Sparkles className="w-4 h-4" />
          <span>Priority Reasoning (AI Explainability)</span>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          {item.priority_reasoning || 'Priority assigned based on sentiment and customer tier parameters.'}
        </p>
      </div>

      {/* Metadata Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-gray-50 dark:bg-dark-hover rounded-xl">
          <span className="text-xs text-gray-400">Assigned Priority</span>
          <div className="mt-1">
            <PriorityBadge priority={item.priority} />
          </div>
        </div>

        <div className="p-3 bg-gray-50 dark:bg-dark-hover rounded-xl">
          <span className="text-xs text-gray-400">Sentiment Score</span>
          <div className="mt-1">
            <SentimentTag sentiment={item.sentiment} />
          </div>
        </div>

        <div className="p-3 bg-gray-50 dark:bg-dark-hover rounded-xl">
          <span className="text-xs text-gray-400">Classified Category</span>
          <p className="mt-1 text-sm font-semibold capitalize text-gray-800 dark:text-gray-200">
            {item.category || 'Inquiry'}
          </p>
        </div>

        <div className="p-3 bg-gray-50 dark:bg-dark-hover rounded-xl">
          <span className="text-xs text-gray-400">Customer Tier</span>
          <p className="mt-1 text-sm font-semibold uppercase text-gray-800 dark:text-gray-200">
            {item.customer_tier}
          </p>
        </div>
      </div>

      {/* Detected Topics */}
      {item.topics && (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-400 uppercase">Detected Topics</label>
          <div className="flex flex-wrap gap-2">
            {item.topics.split(',').map((topic, i) => (
              <span key={i} className="px-2.5 py-1 text-xs rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-dark-border">
                #{topic.trim()}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Workflow Action Buttons */}
      <div className="pt-4 border-t border-gray-200 dark:border-dark-border flex items-center justify-between gap-3">
        <Button
          variant="outline"
          disabled={updating}
          onClick={() => handleUpdateStatus('in_progress')}
        >
          <Clock className="w-4 h-4 mr-2 text-amber-500" />
          Set In-Progress
        </Button>
        <Button
          variant="primary"
          disabled={updating}
          onClick={() => handleUpdateStatus('resolved')}
        >
          <ShieldCheck className="w-4 h-4 mr-2 text-white" />
          Mark Resolved
        </Button>
      </div>
    </div>
  );
}

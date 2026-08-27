import React, { useState } from 'react';
import { HelpCircle, Sparkles, ChevronRight } from 'lucide-react';

/**
 * AmbiguityModal — shown when the backend returns ambiguity_detected: true.
 * Offers two paths: use default assumptions and proceed, or supply clarification context.
 */
export function AmbiguityModal({ result, onProceedDefault, onClarify, onDismiss }) {
  const [clarifications, setClarifications] = useState({});
  const [activeView, setActiveView] = useState('main'); // 'main' | 'clarify'

  if (!result?.ambiguity_detected) return null;

  const hints = result.clarification_hints || [];

  // Derive suggestion fields from hints
  const getFieldsFromHints = () => {
    const fields = [];
    if (hints.some(h => h.toLowerCase().includes('sentiment') || h.toLowerCase().includes('sarcas'))) {
      fields.push({ key: 'sentiment_note', label: 'Clarify Sentiment', placeholder: 'e.g. This is sarcastic, actual sentiment is positive' });
    }
    if (hints.some(h => h.toLowerCase().includes('category') || h.toLowerCase().includes('bug') || h.toLowerCase().includes('complaint'))) {
      fields.push({ key: 'category_note', label: 'Category Hint', placeholder: 'e.g. This is a bug report' });
    }
    if (hints.some(h => h.toLowerCase().includes('customer_tier') || h.toLowerCase().includes('tier'))) {
      fields.push({
        key: 'customer_tier',
        label: 'Customer Tier',
        type: 'select',
        options: ['free', 'pro', 'enterprise'],
      });
    }
    if (hints.some(h => h.toLowerCase().includes('context') || h.toLowerCase().includes('short'))) {
      fields.push({ key: 'additional_context', label: 'Additional Context', placeholder: 'Add more detail about this input…' });
    }
    if (hints.some(h => h.toLowerCase().includes('intent') || h.toLowerCase().includes('type'))) {
      fields.push({
        key: 'type',
        label: 'Query Intent',
        type: 'select',
        options: ['search_query', 'data_mutation', 'analytics_request', 'configuration', 'general'],
      });
    }
    return fields.length ? fields : [
      { key: 'additional_context', label: 'Additional Context', placeholder: 'Provide more detail…' }
    ];
  };

  const clarifyFields = getFieldsFromHints();

  const handleProceedWithClarification = () => {
    const nonEmpty = Object.fromEntries(
      Object.entries(clarifications).filter(([, v]) => v && v.trim?.() !== '' && v !== '')
    );
    onClarify(nonEmpty);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onDismiss}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden z-10 border border-amber-200 dark:border-amber-800">
        {/* Header gradient */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base">Ambiguous Input Detected</h2>
              <p className="text-amber-100 text-xs">The model flagged uncertain signals in your input</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {activeView === 'main' ? (
            <>
              {/* Hints list */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Clarification Hints
                </p>
                {hints.map((hint, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">{hint}</p>
                  </div>
                ))}
              </div>

              {/* Default assumptions */}
              <div className="p-3 bg-gray-50 dark:bg-dark-hover rounded-xl border border-gray-200 dark:border-dark-border">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Default Assumptions Applied:</p>
                <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5 list-disc list-inside">
                  <li>Customer tier: <strong>free</strong></li>
                  <li>Processing mode: <strong>realtime</strong></li>
                  <li>Ambiguous fields use <strong>highest-scoring</strong> label</li>
                </ul>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  id="ml-ambiguity-default"
                  onClick={onProceedDefault}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/30"
                >
                  <ChevronRight className="w-4 h-4" />
                  Proceed with Default Assumptions
                </button>
                <button
                  id="ml-ambiguity-clarify"
                  onClick={() => setActiveView('clarify')}
                  className="w-full py-2.5 border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 font-semibold rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
                >
                  ✏️ Provide Clarification
                </button>
                <button
                  onClick={onDismiss}
                  className="w-full py-2 text-gray-400 text-xs hover:text-gray-600 transition-colors"
                >
                  Dismiss — accept result as-is
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-bold text-gray-800 dark:text-white">Supply Clarification</h3>
                <p className="text-xs text-gray-500 mt-1">Fill in the fields below and re-submit for a more accurate prediction.</p>
              </div>

              <div className="space-y-3">
                {clarifyFields.map(f => (
                  <div key={f.key} className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">{f.label}</label>
                    {f.type === 'select' ? (
                      <select
                        value={clarifications[f.key] || ''}
                        onChange={e => setClarifications(prev => ({ ...prev, [f.key]: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                      >
                        <option value="">-- Select --</option>
                        {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        value={clarifications[f.key] || ''}
                        onChange={e => setClarifications(prev => ({ ...prev, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setActiveView('main')}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-dark-hover"
                >
                  ← Back
                </button>
                <button
                  id="ml-clarify-submit"
                  onClick={handleProceedWithClarification}
                  className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold rounded-xl transition-colors"
                >
                  Resubmit with Clarification
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

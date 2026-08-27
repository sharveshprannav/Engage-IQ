import React from 'react';
import { Zap, Clock, AlertTriangle } from 'lucide-react';

const SLA_TIERS = [
  { maxMs: 300, label: 'Fast', color: 'emerald', bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' },
  { maxMs: 800, label: 'Degraded', color: 'amber', bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' },
  { maxMs: Infinity, label: 'SLA Breach', color: 'rose', bar: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800' },
];

function getSLATier(ms) {
  return SLA_TIERS.find(t => ms <= t.maxMs) || SLA_TIERS[SLA_TIERS.length - 1];
}

export function LatencyTelemetryBar({ latency, mode, requestCount }) {
  if (!latency) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border rounded-xl text-xs text-gray-400">
        <Zap className="w-3.5 h-3.5" />
        <span>No requests yet — submit input to see latency telemetry</span>
      </div>
    );
  }

  const { total_ms, validation_ms, preprocessing_ms, model_ms, postprocessing_ms } = latency;
  const tier = mode === 'batch' ? null : getSLATier(total_ms);

  // Breakdown bar widths (proportional to total)
  const segments = [
    { label: 'Validation', ms: validation_ms, color: 'bg-sky-400' },
    { label: 'Preprocessing', ms: preprocessing_ms, color: 'bg-indigo-400' },
    { label: 'Model', ms: model_ms, color: 'bg-violet-500' },
    { label: 'Postprocess', ms: postprocessing_ms, color: 'bg-emerald-400' },
  ].filter(s => s.ms > 0);

  return (
    <div className={`border rounded-xl px-4 py-3 space-y-2 transition-colors ${
      mode === 'batch' ? 'bg-gray-50 dark:bg-dark-hover border-gray-200 dark:border-dark-border' :
      tier.bg
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Mode badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
            mode === 'realtime'
              ? 'bg-brand-100 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-800'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-dark-border'
          }`}>
            {mode === 'realtime' ? <Zap className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {mode === 'realtime' ? '⚡ Real-time' : '⏱ Batch'}
          </div>

          {/* Total latency */}
          <span className={`text-sm font-bold font-mono ${mode === 'batch' ? 'text-gray-500' : tier.text}`}>
            {mode === 'batch' ? 'Async' : `${total_ms.toFixed(1)}ms`}
          </span>

          {/* SLA badge */}
          {mode === 'realtime' && tier && (
            <span className={`text-xs font-semibold ${tier.text}`}>
              {tier.label === 'SLA Breach' && <AlertTriangle className="inline w-3 h-3 mr-0.5" />}
              {tier.label}
              {tier.label === 'Fast' && ` ✓ < 300ms`}
              {tier.label === 'Degraded' && ` ⚠ 300–800ms`}
              {tier.label === 'SLA Breach' && ` ✗ > 800ms`}
            </span>
          )}
        </div>

        {requestCount > 0 && (
          <span className="text-xs text-gray-400 font-mono">{requestCount} request{requestCount > 1 ? 's' : ''} this session</span>
        )}
      </div>

      {/* Breakdown segmented bar */}
      {mode === 'realtime' && segments.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex h-2 rounded-full overflow-hidden gap-px bg-gray-200 dark:bg-dark-border">
            {segments.map((seg, i) => (
              <div
                key={i}
                className={`${seg.color} transition-all duration-700`}
                style={{ width: `${Math.max(2, (seg.ms / total_ms) * 100)}%` }}
                title={`${seg.label}: ${seg.ms.toFixed(1)}ms`}
              />
            ))}
          </div>
          <div className="flex gap-4 flex-wrap">
            {segments.map((seg, i) => (
              <span key={i} className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <span className={`w-2 h-2 rounded-full inline-block ${seg.color}`} />
                {seg.label}: <span className="font-mono">{seg.ms.toFixed(1)}ms</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

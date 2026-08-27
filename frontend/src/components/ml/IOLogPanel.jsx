import React, { useEffect, useState } from 'react';
import { ClipboardList, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { mlApi } from '../../api/mlApi';

const STATUS_STYLES = {
  success: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
  ambiguous: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
  error: 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300',
  fallback: 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300',
  pending: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
};

const INPUT_TYPE_ICONS = {
  text: '📝',
  csv: '📄',
  excel: '📊',
  image: '🖼️',
  structured: '{ }',
};

function LatencyIndicator({ ms }) {
  const color = ms < 300 ? 'text-emerald-500' : ms < 800 ? 'text-amber-500' : 'text-rose-500';
  return <span className={`font-mono text-xs ${color}`}>{ms.toFixed(0)}ms</span>;
}

export function IOLogPanel({ sessionLogs }) {
  const [expanded, setExpanded] = useState(true);
  const [serverLogs, setServerLogs] = useState(null);
  const [loadingServer, setLoadingServer] = useState(false);
  const [activeSource, setActiveSource] = useState('session'); // 'session' | 'server'

  const fetchServerLogs = async () => {
    setLoadingServer(true);
    try {
      const res = await mlApi.getLogs(1, 50);
      setServerLogs(res.data);
      setActiveSource('server');
    } catch (e) {
      console.error('Failed to load server logs', e);
    } finally {
      setLoadingServer(false);
    }
  };

  const displayLogs = activeSource === 'server' && serverLogs
    ? serverLogs.items
    : [...(sessionLogs || [])].reverse();

  const totalCount = activeSource === 'server' && serverLogs
    ? serverLogs.total
    : sessionLogs?.length || 0;

  return (
    <div className="border border-gray-200 dark:border-dark-border rounded-2xl overflow-hidden bg-white dark:bg-dark-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-hover">
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-2 font-semibold text-sm text-gray-700 dark:text-gray-200"
        >
          <ClipboardList className="w-4 h-4 text-brand-500" />
          I/O Inference Log
          <span className="ml-1 px-1.5 py-0.5 bg-brand-100 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 text-xs font-bold rounded-full">
            {totalCount}
          </span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
        </button>

        <div className="flex items-center gap-2">
          {/* Source toggle */}
          <div className="flex gap-1 p-0.5 bg-gray-100 dark:bg-dark-card rounded-lg">
            <button
              onClick={() => setActiveSource('session')}
              className={`px-2 py-0.5 rounded text-xs font-semibold transition-all ${
                activeSource === 'session'
                  ? 'bg-white dark:bg-dark-hover shadow text-brand-600 dark:text-brand-400'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Session
            </button>
            <button
              onClick={() => fetchServerLogs()}
              className={`px-2 py-0.5 rounded text-xs font-semibold transition-all ${
                activeSource === 'server'
                  ? 'bg-white dark:bg-dark-hover shadow text-brand-600 dark:text-brand-400'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Server DB
            </button>
          </div>

          <button
            id="ml-log-refresh"
            onClick={() => activeSource === 'server' ? fetchServerLogs() : undefined}
            disabled={loadingServer}
            className="p-1.5 text-gray-400 hover:text-brand-500 rounded-lg transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingServer ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="overflow-auto max-h-64">
          {displayLogs.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              No inference logs yet — run an analysis to populate this log.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50 dark:bg-dark-hover border-b border-gray-200 dark:border-dark-border">
                <tr>
                  {['Timestamp', 'Type', 'Model', 'Latency', 'Status', 'Confidence', 'Corrected'].map(h => (
                    <th key={h} className="text-left px-3 py-2 font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayLogs.map((log, i) => {
                  const ts = new Date(log.created_at || log.timestamp);
                  const isSession = !log.id; // session logs don't have server UUIDs
                  return (
                    <tr
                      key={log.request_id || i}
                      className={`border-b border-gray-100 dark:border-dark-border last:border-0 hover:bg-gray-50 dark:hover:bg-dark-hover/50 transition-colors ${
                        i === 0 && activeSource === 'session' ? 'bg-brand-50/50 dark:bg-brand-950/10' : ''
                      }`}
                    >
                      <td className="px-3 py-2 font-mono text-gray-400 whitespace-nowrap">
                        {ts.toLocaleTimeString()}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <span>{INPUT_TYPE_ICONS[log.input_type] || '?'}</span>
                          <span className="text-gray-600 dark:text-gray-300 capitalize">{log.input_type}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400 max-w-[140px] truncate">
                        {log.model_used}
                      </td>
                      <td className="px-3 py-2">
                        {log.latency_total_ms != null
                          ? <LatencyIndicator ms={log.latency_total_ms} />
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[log.status] || STATUS_STYLES.pending}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-gray-500">
                        {log.overall_confidence != null
                          ? `${Math.round(log.overall_confidence * 100)}%`
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {log.user_corrected
                          ? <span title={`Corrected to: ${log.corrected_label}`} className="text-amber-500">✎</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

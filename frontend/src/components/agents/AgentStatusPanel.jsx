import React from 'react';
import { Bot, Play, Pause, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../common/Button';

export function AgentStatusPanel({ agents = [], onControl }) {
  const statusColors = {
    idle: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    running: 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20 animate-pulse',
    paused: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    error: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {agents.map((agent) => (
        <div
          key={agent.name}
          className="p-5 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-brand-500/10 text-brand-500 rounded-lg">
                <Bot className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{agent.name}</h4>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase border ${
                statusColors[agent.status] || statusColors.idle
              }`}
            >
              {agent.status}
            </span>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <div className="flex justify-between">
              <span>Runs Completed:</span>
              <span className="font-semibold text-gray-700 dark:text-gray-200">{agent.runs_completed || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Errors Count:</span>
              <span className="font-semibold text-gray-700 dark:text-gray-200">{agent.errors_count || 0}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 dark:border-dark-border flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onControl('trigger', agent.name)}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Run Cycle
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onControl(agent.status === 'paused' ? 'resume' : 'pause', agent.name)}
            >
              {agent.status === 'paused' ? <Play className="w-3.5 h-3.5 mr-1" /> : <Pause className="w-3.5 h-3.5 mr-1" />}
              {agent.status === 'paused' ? 'Resume' : 'Pause'}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

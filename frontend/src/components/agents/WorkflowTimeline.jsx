import React from 'react';
import { CheckCircle2, Bot, ArrowRight, Ticket, Bell } from 'lucide-react';

export function WorkflowTimeline() {
  const steps = [
    { agent: 'MonitorAgent', action: 'Ingested raw email payload from enterprise customer', icon: Bot, time: '10:42 AM' },
    { agent: 'AnomalyAgent', action: 'Evaluated volume z-score (Z=0.8, no anomaly spike)', icon: CheckCircle2, time: '10:42 AM' },
    { agent: 'PriorityAgent', action: 'Assigned Very High priority (outage keywords + enterprise tier)', icon: CheckCircle2, time: '10:43 AM' },
    { agent: 'WorkflowAgent', action: 'Triggered auto-ticketing & critical notification rule', icon: ArrowRight, time: '10:43 AM' },
    { agent: 'TicketingAgent', action: 'Auto-created Jira ticket ENG-482 with AI reproduction steps', icon: Ticket, time: '10:43 AM' },
    { agent: 'NotificationAgent', action: 'Dispatched alert to #engageai-alerts and on-call email', icon: Bell, time: '10:43 AM' },
  ];

  return (
    <div className="p-6 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl shadow-sm space-y-4">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">Agent Execution Chain Timeline</h3>
      <div className="relative border-l-2 border-brand-500/30 ml-4 space-y-6">
        {steps.map((s, idx) => (
          <div key={idx} className="relative pl-6">
            <div className="absolute -left-[9px] top-1 p-1 bg-brand-600 rounded-full text-white">
              <s.icon className="w-3 h-3" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-600 dark:text-brand-400">{s.agent}</span>
              <span className="text-xs text-gray-400">{s.time}</span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{s.action}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

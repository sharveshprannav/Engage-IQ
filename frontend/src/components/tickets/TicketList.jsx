import React from 'react';
import { ExternalLink, Bot, User } from 'lucide-react';

export function TicketList({ tickets = [] }) {
  if (!tickets || !tickets.length) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        No ticket integrations created yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-gray-200 dark:border-dark-border rounded-xl">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 dark:bg-dark-hover text-gray-600 dark:text-gray-400 font-medium">
          <tr>
            <th className="px-4 py-3">System</th>
            <th className="px-4 py-3">Ticket ID</th>
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3">Creator</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Link</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-dark-border bg-white dark:bg-dark-card">
          {tickets.map((t) => (
            <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-dark-hover/50">
              <td className="px-4 py-3 font-semibold uppercase text-brand-600 dark:text-brand-400">{t.external_system}</td>
              <td className="px-4 py-3 font-mono text-xs">{t.external_ticket_id || 'ENG-MOCK'}</td>
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 max-w-xs truncate">{t.title}</td>
              <td className="px-4 py-3">
                {t.created_by_agent ? (
                  <span className="inline-flex items-center text-xs font-medium text-brand-500 bg-brand-500/10 px-2 py-0.5 rounded">
                    <Bot className="w-3 h-3 mr-1" /> Auto-Agent
                  </span>
                ) : (
                  <span className="inline-flex items-center text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                    <User className="w-3 h-3 mr-1" /> Manual
                  </span>
                )}
              </td>
              <td className="px-4 py-3 capitalize text-xs font-semibold text-emerald-500">{t.status}</td>
              <td className="px-4 py-3 text-right">
                <a
                  href={t.url || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  View Ticket <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

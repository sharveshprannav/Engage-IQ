import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export function TicketCreateModal({ isOpen, onClose, onSubmit }) {
  const [system, setSystem] = useState('jira');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim()) {
      onSubmit({ external_system: system, title, description });
      setTitle('');
      setDescription('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Ticket Integration">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
            Target System
          </label>
          <select
            value={system}
            onChange={(e) => setSystem(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-dark-hover border border-gray-200 dark:border-dark-border rounded-lg text-sm text-gray-900 dark:text-white"
          >
            <option value="jira">Jira Software</option>
            <option value="linear">Linear App</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
            Issue Title
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. [BUG] High export failure rate for enterprise users"
            className="w-full px-3 py-2 bg-white dark:bg-dark-hover border border-gray-200 dark:border-dark-border rounded-lg text-sm text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
            Description / Context
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description or reproduction steps..."
            className="w-full px-3 py-2 bg-white dark:bg-dark-hover border border-gray-200 dark:border-dark-border rounded-lg text-sm text-gray-900 dark:text-white"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-dark-border">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            Create Ticket
          </Button>
        </div>
      </form>
    </Modal>
  );
}

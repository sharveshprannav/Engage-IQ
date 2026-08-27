import React, { useState } from 'react';
import { Search, Sparkles } from 'lucide-react';

export function SemanticSearchBar({ onSearch }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="relative flex items-center">
        <Sparkles className="w-5 h-5 absolute left-4 text-brand-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Semantic Vector Search (e.g. 'enterprise export timeouts' or 'billing problems')..."
          className="w-full pl-12 pr-24 py-3 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
        />
        <button
          type="submit"
          className="absolute right-2 px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          Search
        </button>
      </div>
    </form>
  );
}

import React, { useState } from 'react';
import { Send, Bot, User, Quote, Sparkles, Loader2 } from 'lucide-react';
import { analyticsApi } from '../../api/analyticsApi';

export function NLQueryPanel() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Ask me anything about customer feedback trends! Example: "What are the top complaints from enterprise customers this week?"',
      references: []
    }
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userText = query.trim();
    setQuery('');
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    try {
      const res = await analyticsApi.nlQuery(userText);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: res.data.answer,
          references: res.data.references || []
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: 'Failed to synthesize answer for query. Please try again.',
          references: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-3.5 bg-gray-50 dark:bg-dark-hover border-b border-gray-200 dark:border-dark-border flex items-center space-x-2">
        <Sparkles className="w-5 h-5 text-brand-500" />
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Natural Language Intelligence Query</h3>
      </div>

      {/* Chat messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex items-start space-x-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
            {msg.sender === 'bot' && (
              <div className="p-2 bg-brand-600 rounded-lg text-white">
                <Bot className="w-4 h-4" />
              </div>
            )}
            <div className={`max-w-md p-3.5 rounded-xl text-sm ${
              msg.sender === 'user'
                ? 'bg-brand-600 text-white rounded-tr-none'
                : 'bg-gray-100 dark:bg-dark-hover text-gray-800 dark:text-gray-200 rounded-tl-none space-y-2'
            }`}>
              <p>{msg.text}</p>
              {msg.references && msg.references.length > 0 && (
                <div className="pt-2 border-t border-gray-200 dark:border-dark-border space-y-1.5">
                  <span className="text-xs font-bold text-gray-400 uppercase flex items-center">
                    <Quote className="w-3 h-3 mr-1" /> Supporting Citations:
                  </span>
                  {msg.references.map((ref, rIdx) => (
                    <div key={rIdx} className="p-2 bg-white dark:bg-dark-card rounded text-xs text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-dark-border">
                      <span className="font-semibold text-brand-500 uppercase">{ref.customer_tier}:</span> "{ref.snippet}"
                    </div>
                  ))}
                </div>
              )}
            </div>
            {msg.sender === 'user' && (
              <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-200">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center space-x-2 text-gray-400 text-xs italic">
            <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
            <span>Synthesizing answer & matching citations...</span>
          </div>
        )}
      </div>

      {/* Input box */}
      <form onSubmit={handleSend} className="p-3 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-hover flex items-center space-x-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask plain-English question..."
          className="flex-1 px-4 py-2 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="p-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

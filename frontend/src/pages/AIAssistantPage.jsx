import React, { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { assistantApi } from '../api/assistantApi';
import { Button } from '../components/common/Button';
import {
  Bot,
  Send,
  Sparkles,
  User,
  Trash2,
  Key,
  Settings,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Zap,
  Database,
  ExternalLink,
  X
} from 'lucide-react';

export function AIAssistantPage() {
  // Local state for Gemini Settings
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('engageai_gemini_key') || '');
  const [selectedModel, setSelectedModel] = useState(() => {
    const saved = localStorage.getItem('engageai_gemini_model');
    if (!saved || saved.includes('gemini-2.0') || saved.includes('gemini-1.5') || saved.includes('gemini-2.5')) {
      localStorage.setItem('engageai_gemini_model', 'gemini-3.6-flash');
      return 'gemini-3.6-flash';
    }
    return saved;
  });

  useEffect(() => {
    const saved = localStorage.getItem('engageai_gemini_model');
    if (!saved || saved.includes('gemini-2.0') || saved.includes('gemini-1.5') || saved.includes('gemini-2.5')) {
      localStorage.setItem('engageai_gemini_model', 'gemini-3.6-flash');
      setSelectedModel('gemini-3.6-flash');
    }
  }, []);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [serverStatus, setServerStatus] = useState({ has_key: false, total_feedback_count: 0 });
  const [copiedId, setCopiedId] = useState(null);

  // Chat state
  const [messages, setMessages] = useState([
    {
      id: '1',
      sender: 'assistant',
      text: "👋 Hello! I am your **EngageAI Assistant**, powered by **Google Gemini**.\n\nI analyze your live customer feedback, sentiment polarity distributions, SLA triage queues, and ML pipeline inference sessions in real time.\n\nHow can I help you today? You can ask any question about your customer data or select one of the suggested prompts below.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Fetch backend assistant & server key status on load
  useEffect(() => {
    assistantApi.getStatus()
      .then((res) => {
        setServerStatus(res.data);
      })
      .catch((err) => {
        console.error('Failed to fetch assistant status:', err);
      });
  }, []);

  const handleSaveSettings = (e) => {
    e?.preventDefault();
    if (geminiKey.trim()) {
      localStorage.setItem('engageai_gemini_key', geminiKey.trim());
    } else {
      localStorage.removeItem('engageai_gemini_key');
    }
    localStorage.setItem('engageai_gemini_model', selectedModel);
    setTestStatus('Settings saved successfully!');
    setTimeout(() => {
      setShowKeyModal(false);
      setTestStatus(null);
    }, 1200);
  };

  const handleTestConnection = async () => {
    setTestStatus('Testing Gemini connection...');
    try {
      const res = await assistantApi.chat(
        [{ sender: 'user', text: 'Hello! Respond with: "Gemini connection successful!"' }],
        geminiKey,
        selectedModel
      );
      if (res.data?.text && !res.data.text.includes('Error')) {
        setTestStatus('✅ Gemini connection successful!');
      } else {
        setTestStatus(`❌ ${res.data?.text || 'Connection failed'}`);
      }
    } catch (err) {
      setTestStatus(`❌ Connection error: ${err.response?.data?.detail || err.message}`);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = async (userQuery) => {
    const textToSend = userQuery || input;
    if (!textToSend.trim() || loading) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setLoading(true);

    try {
      // Send conversation history to backend Gemini endpoint
      const payloadMessages = newHistory.map((m) => ({
        sender: m.sender === 'user' ? 'user' : 'assistant',
        text: m.text,
      }));

      const res = await assistantApi.chat(payloadMessages, geminiKey, selectedModel);
      
      const botMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: res.data?.text || 'No response returned from model.',
        model: res.data?.model || selectedModel,
        grounded: res.data?.grounded,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Error communicating with assistant backend';
      const botMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `⚠️ **Error**: ${errorMsg}\n\nPlease verify your Gemini API key or network connection.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    { title: 'Summarize overall sentiment', query: 'Summarize our overall customer feedback sentiment polarity, trends, and key drivers.' },
    { title: 'Show high-priority SLA risks', query: 'Show top high-priority bug reports, SLA risks, and recommended engineering actions.' },
    { title: 'Top trending feedback topics', query: 'What are the key trending customer topics, complaints, and praise in our dataset?' },
    { title: 'Actionable product opportunities', query: 'Generate strategic, actionable product recommendations based on all customer feedback.' },
  ];

  const isKeyActive = Boolean(geminiKey.trim() || serverStatus.has_key);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-tr from-brand-600 via-indigo-600 to-purple-600 rounded-2xl text-white shadow-lg shadow-brand-500/30">
              <Bot className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                  AI Assistant
                </h1>
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  <Zap className="w-3 h-3 text-purple-500" />
                  <span>Google Gemini</span>
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Conversational feedback intelligence, sentiment synthesis & SLA triage engine
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowKeyModal(true)}
              className={`inline-flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                isKeyActive
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 animate-pulse'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>{isKeyActive ? `Gemini Key Active (${selectedModel})` : '⚙️ Setup Gemini Key'}</span>
            </button>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setMessages([
                  {
                    id: '1',
                    sender: 'assistant',
                    text: "Conversation cleared. How else can I assist you with your customer intelligence today?",
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  },
                ])
              }
            >
              <Trash2 className="w-4 h-4 mr-1.5" /> Clear Chat
            </Button>
          </div>
        </div>

        {/* Gemini Settings Modal */}
        {showKeyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-dark-border pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-purple-500/10 rounded-xl text-purple-500">
                    <Key className="w-5 h-5" />
                  </div>
                  <h3 className="font-extrabold text-lg text-gray-900 dark:text-white">
                    Google Gemini Configuration
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowKeyModal(false);
                    setTestStatus(null);
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">
                    Gemini API Key
                  </label>
                  <input
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border rounded-xl text-xs font-mono text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-[11px] text-gray-400 mt-1 flex items-center justify-between">
                    <span>
                      {serverStatus.has_key ? '✓ Server .env key detected' : 'Saved locally in your browser'}
                    </span>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-purple-500 hover:underline inline-flex items-center"
                    >
                      Get API Key <ExternalLink className="w-3 h-3 ml-0.5" />
                    </a>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">
                    Model Selection
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border rounded-xl text-xs font-medium text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="gemini-3.6-flash">gemini-3.6-flash (Recommended — Ultra Fast & Smart)</option>
                    <option value="gemini-3.7-flash">gemini-3.7-flash (Next-Gen Reasoning & Deep Analysis)</option>
                    <option value="gemini-3.5-flash">gemini-3.5-flash (High Throughput)</option>
                    <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Complex Pro Reasoning)</option>
                  </select>
                </div>

                {testStatus && (
                  <div className="p-3 bg-gray-50 dark:bg-dark-hover rounded-xl text-xs font-medium text-gray-700 dark:text-gray-300">
                    {testStatus}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-dark-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={!geminiKey.trim() && !serverStatus.has_key}
                >
                  Test Connection
                </Button>
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowKeyModal(false);
                      setTestStatus(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleSaveSettings}
                    className="bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-500/30"
                  >
                    Save Key & Settings
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Suggestion Prompts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p.query)}
              className="p-3 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl text-left hover:border-purple-500/50 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-all text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-between group shadow-sm"
            >
              <span className="flex items-center space-x-2 truncate">
                <Sparkles className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                <span className="truncate">{p.title}</span>
              </span>
            </button>
          ))}
        </div>

        {/* AI Assistant Chat Interface */}
        <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-3xl shadow-xl flex flex-col h-[620px] overflow-hidden">
          {/* Top Chat Status Bar */}
          <div className="px-6 py-3.5 bg-gray-50/80 dark:bg-dark-hover/60 border-b border-gray-200 dark:border-dark-border flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isKeyActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                EngageAI Assistant — {selectedModel}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-[11px] text-gray-500 dark:text-gray-400 font-medium">
              <Database className="w-3 h-3 text-purple-500" />
              <span>RAG Database Grounding Active</span>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isUser
                        ? 'bg-brand-600 text-white'
                        : 'bg-gradient-to-tr from-brand-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-brand-500/20'
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div className="space-y-1 max-w-3xl">
                    <div
                      className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        isUser
                          ? 'bg-brand-600 text-white rounded-tr-none shadow-md shadow-brand-500/10'
                          : 'bg-gray-100 dark:bg-dark-hover text-gray-800 dark:text-gray-100 rounded-tl-none border border-gray-200 dark:border-dark-border/80'
                      }`}
                    >
                      <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                    </div>

                    <div
                      className={`flex items-center space-x-2 text-[10px] px-1 ${
                        isUser ? 'justify-end text-brand-400' : 'justify-between text-gray-400'
                      }`}
                    >
                      {!isUser && (
                        <div className="flex items-center space-x-2">
                          <span>{msg.timestamp}</span>
                          <button
                            onClick={() => copyToClipboard(msg.text, msg.id)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 inline-flex items-center space-x-1"
                            title="Copy message"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span className="text-emerald-500">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                      {isUser && <span>{msg.timestamp}</span>}
                    </div>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-brand-500/20">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-4 bg-gray-100 dark:bg-dark-hover rounded-2xl rounded-tl-none border border-gray-200 dark:border-dark-border flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-300">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                  <span>Gemini is synthesizing feedback intelligence and formulating recommendations...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Field */}
          <div className="p-4 bg-white dark:bg-dark-card border-t border-gray-200 dark:border-dark-border">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                placeholder="Ask Gemini anything about customer sentiment, bug triage, SLA risks, or product recommendations..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                className="flex-1 px-4 py-3.5 bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border rounded-2xl text-xs sm:text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 transition-all placeholder-gray-400"
              />
              <Button
                type="submit"
                loading={loading}
                className="px-6 py-3.5 bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white shadow-lg shadow-purple-500/30 rounded-2xl"
              >
                <Send className="w-4 h-4 mr-1.5" /> Send
              </Button>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

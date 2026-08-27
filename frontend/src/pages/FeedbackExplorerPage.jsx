import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { mlApi } from '../api/mlApi';
import { Button } from '../components/common/Button';
import {
  History,
  Clock,
  Download,
  Filter,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Zap,
  Layers,
  ChevronRight,
  X,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  MessageSquare,
  Trash2,
  AlertCircle,
  Sparkles,
  Shield,
  Lock,
} from 'lucide-react';

export function FeedbackExplorerPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await mlApi.getLogs(1, 100);
      const items = res.data?.items || [];
      setLogs(items);
    } catch (err) {
      console.error('Failed to fetch historical pipeline logs:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleDeleteSession = async (log) => {
    if (!log) return;
    setActionLoading(true);
    try {
      await mlApi.deleteLog(log.request_id || log.id);
      setLogs((prev) => prev.filter((item) => item.request_id !== log.request_id && item.id !== log.id));
      if (selectedSession?.request_id === log.request_id || selectedSession?.id === log.id) {
        setSelectedSession(null);
      }
      setSessionToDelete(null);
    } catch (err) {
      console.error('Failed to delete history session:', err);
      alert(err.response?.data?.detail || 'Failed to delete history session');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearAllHistory = async () => {
    setActionLoading(true);
    try {
      await mlApi.clearLogs();
      setLogs([]);
      setSelectedSession(null);
      setShowClearConfirm(false);
    } catch (err) {
      console.error('Failed to clear history:', err);
      alert(err.response?.data?.detail || 'Failed to clear history');
    } finally {
      setActionLoading(false);
    }
  };

  // Available unique categories
  const availableCategories = useMemo(() => {
    const set = new Set();
    logs.forEach((l) => {
      if (l.category_name) set.add(l.category_name);
    });
    return Array.from(set);
  }, [logs]);

  // Filtered logs computation
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        log.request_id?.toLowerCase().includes(q) ||
        log.category_name?.toLowerCase().includes(q) ||
        log.input_type?.toLowerCase().includes(q) ||
        log.model_used?.toLowerCase().includes(q) ||
        log.input_summary?.toLowerCase().includes(q) ||
        log.output_summary?.toLowerCase().includes(q) ||
        log.primary_label?.toLowerCase().includes(q);

      const matchesType = !typeFilter || log.input_type === typeFilter;
      const matchesStatus = !statusFilter || log.status === statusFilter;

      let matchesDate = true;
      if (dateFilter !== 'all' && log.created_at) {
        const logDate = new Date(log.created_at);
        const now = new Date();
        if (dateFilter === 'today') {
          matchesDate = logDate.toDateString() === now.toDateString();
        } else if (dateFilter === '7days') {
          matchesDate = (now - logDate) <= 1000 * 60 * 60 * 24 * 7;
        } else if (dateFilter === '30days') {
          matchesDate = (now - logDate) <= 1000 * 60 * 60 * 24 * 30;
        }
      }

      return matchesSearch && matchesType && matchesStatus && matchesDate;
    });
  }, [logs, searchQuery, typeFilter, statusFilter, dateFilter]);

  // Is a subset filtered or selected?
  const isFilteredOrSelected =
    selectedSession !== null ||
    searchQuery !== '' ||
    typeFilter !== '' ||
    statusFilter !== '' ||
    dateFilter !== 'all';

  // Two-Tier Export Handlers:
  // Tier 1: Export ALL historical data
  const handleExportAll = (format = 'csv') => {
    const dataToExport = logs;
    if (!dataToExport.length) return;

    if (format === 'csv') {
      const headers = ['Request ID', 'Timestamp', 'Category Name', 'Input Type', 'Model Used', 'Latency (ms)', 'Confidence (%)', 'Status', 'Primary Label', 'Input Summary', 'Output Summary'];
      const rows = dataToExport.map((item) => [
        `"${item.request_id}"`,
        `"${item.created_at || ''}"`,
        `"${(item.category_name || 'General').replace(/"/g, '""')}"`,
        `"${item.input_type || ''}"`,
        `"${item.model_used || ''}"`,
        `"${item.latency_total_ms || 0}"`,
        `"${item.overall_confidence != null ? Math.round(item.overall_confidence * 100) : ''}"`,
        `"${item.status || ''}"`,
        `"${item.primary_label || ''}"`,
        `"${(item.input_summary || '').replace(/"/g, '""')}"`,
        `"${(item.output_summary || '').replace(/"/g, '""')}"`,
      ]);
      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      downloadBlob(csvContent, `PipelineStudio_All_History_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
    } else {
      const jsonContent = JSON.stringify(dataToExport, null, 2);
      downloadBlob(jsonContent, `PipelineStudio_All_History_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
    }
  };

  // Tier 2: Export FILTERED subset or SELECTED session
  const handleExportFiltered = (format = 'csv') => {
    const dataToExport = selectedSession ? [selectedSession] : filteredLogs;
    if (!dataToExport.length) return;

    const filePrefix = selectedSession ? `PipelineStudio_Session_${selectedSession.request_id}` : `PipelineStudio_Filtered_History`;

    if (format === 'csv') {
      const headers = ['Request ID', 'Timestamp', 'Category Name', 'Input Type', 'Model Used', 'Latency (ms)', 'Confidence (%)', 'Status', 'Primary Label', 'Input Summary', 'Output Summary'];
      const rows = dataToExport.map((item) => [
        `"${item.request_id}"`,
        `"${item.created_at || ''}"`,
        `"${(item.category_name || 'General').replace(/"/g, '""')}"`,
        `"${item.input_type || ''}"`,
        `"${item.model_used || ''}"`,
        `"${item.latency_total_ms || 0}"`,
        `"${item.overall_confidence != null ? Math.round(item.overall_confidence * 100) : ''}"`,
        `"${item.status || ''}"`,
        `"${item.primary_label || ''}"`,
        `"${(item.input_summary || '').replace(/"/g, '""')}"`,
        `"${(item.output_summary || '').replace(/"/g, '""')}"`,
      ]);
      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      downloadBlob(csvContent, `${filePrefix}_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
    } else {
      const jsonContent = JSON.stringify(dataToExport, null, 2);
      downloadBlob(jsonContent, `${filePrefix}_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
    }
  };

  const downloadBlob = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'csv':
        return <FileSpreadsheet className="w-4 h-4 text-emerald-500" />;
      case 'excel':
        return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
      case 'image':
        return <ImageIcon className="w-4 h-4 text-violet-500" />;
      case 'structured':
        return <FileCode className="w-4 h-4 text-sky-500" />;
      default:
        return <MessageSquare className="w-4 h-4 text-brand-500" />;
    }
  };

  // Parse details json for selected session
  const selectedDetails = useMemo(() => {
    if (!selectedSession?.details_json) return null;
    try {
      return typeof selectedSession.details_json === 'string'
        ? JSON.parse(selectedSession.details_json)
        : selectedSession.details_json;
    } catch {
      return null;
    }
  }, [selectedSession]);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Page Header & Two-Tier Export Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-brand-600 rounded-xl text-white shadow-lg shadow-brand-500/30">
                <History className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                    Pipeline Studio Historical Usage Viewer
                  </h1>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <Lock className="w-2.5 h-2.5 mr-1" /> Private & Isolated
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Chronological ledger of your past inference sessions, output inspection, & two-tier export system
                </p>
              </div>
            </div>
          </div>

          {/* TWO-TIER EXPORT ACTION BUTTONS & CLEAR HISTORY */}
          <div className="flex flex-wrap items-center gap-2">
            {logs.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClearConfirm(true)}
                className="border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                title="Clear all your inference history records"
              >
                <Trash2 className="w-4 h-4 mr-1.5" /> Clear All History
              </Button>
            )}

            {/* Tier 1: Global/All Export */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportAll('csv')}
              disabled={logs.length === 0}
              title="Export all historical sessions for your account"
            >
              <Download className="w-4 h-4 mr-1.5" /> Export All ({logs.length})
            </Button>

            {/* Tier 2: Filtered / Selected Session Export */}
            {isFilteredOrSelected && logs.length > 0 ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleExportFiltered('csv')}
                className="bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/20"
                title="Export only the selected session or currently filtered records"
              >
                <Download className="w-4 h-4 mr-1.5" />
                {selectedSession
                  ? `Export Selected Session (#${selectedSession.request_id})`
                  : `Export Filtered View (${filteredLogs.length})`}
              </Button>
            ) : null}
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="p-4 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl shadow-sm flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-gray-400 uppercase">
            <Filter className="w-4 h-4" /> Filters:
          </div>

          {/* Search by Category Backdrop Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Request ID, Category, Model, Output..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border rounded-xl text-xs font-medium text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Input Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border rounded-xl text-xs font-medium text-gray-800 dark:text-gray-200 outline-none"
          >
            <option value="">All Input Types</option>
            <option value="text">Text Inputs</option>
            <option value="csv">CSV Datasets</option>
            <option value="excel">Excel Workbooks</option>
            <option value="image">Image Files</option>
            <option value="structured">Structured JSON</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border rounded-xl text-xs font-medium text-gray-800 dark:text-gray-200 outline-none"
          >
            <option value="">All Statuses</option>
            <option value="success">Success</option>
            <option value="ambiguous">Ambiguous</option>
            <option value="error">Error</option>
            <option value="fallback">Fallback</option>
          </select>

          {/* Date Range Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border rounded-xl text-xs font-medium text-gray-800 dark:text-gray-200 outline-none"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
          </select>

          {/* Reset Filters */}
          {(searchQuery || typeFilter || statusFilter || dateFilter !== 'all') && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('');
                setStatusFilter('');
                setDateFilter('all');
                setSelectedSession(null);
              }}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
          )}
        </div>

        {/* Selected Session Banner Info (if active) */}
        {selectedSession && (
          <div className="p-4 bg-brand-500/10 border border-brand-500/30 rounded-2xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="p-2 bg-brand-500 text-white rounded-lg">
                <FileText className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-brand-600 dark:text-brand-400">
                  Currently Viewing Session: Request #{selectedSession.request_id} — Category: {selectedSession.category_name || 'General'}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  {selectedSession.output_summary || selectedSession.input_summary}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSelectedSession(null)}>
              Clear Selection
            </Button>
          </div>
        )}

        {/* Chronological Historical Usage Sessions Table */}
        <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-dark-border flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Chronological Usage Sessions ({filteredLogs.length})
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-gray-100 dark:bg-dark-hover text-gray-500 dark:text-gray-400 rounded-full">
                Account Private
              </span>
            </div>
            <span className="text-xs text-gray-400">Click any session row to inspect results & model telemetry</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-dark-hover text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-dark-border font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Request ID</th>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Input Type</th>
                  <th className="px-5 py-3.5">Input / File Details</th>
                  <th className="px-5 py-3.5">Confidence</th>
                  <th className="px-5 py-3.5">Latency</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-dark-border bg-white dark:bg-dark-card">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-gray-400 text-sm">
                      <div className="flex items-center justify-center space-x-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-brand-500" />
                        <span>Loading your private history sessions...</span>
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-16 text-center">
                      <div className="max-w-md mx-auto space-y-4">
                        <div className="w-14 h-14 bg-brand-50 dark:bg-brand-950/40 rounded-2xl flex items-center justify-center mx-auto text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
                          <Sparkles className="w-7 h-7" />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-gray-900 dark:text-white">
                            No Pipeline History Records Yet
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Sessions you run in the ML Pipeline Studio are strictly private to your account and will appear here.
                          </p>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => navigate('/ml-pipeline')}
                          className="bg-brand-600 hover:bg-brand-700"
                        >
                          <Zap className="w-4 h-4 mr-1.5" /> Launch ML Pipeline Studio
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-gray-400 text-sm">
                      <p>No historical sessions match your active filters.</p>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mt-3"
                        onClick={() => {
                          setSearchQuery('');
                          setTypeFilter('');
                          setStatusFilter('');
                          setDateFilter('all');
                        }}
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reset Active Filters
                      </Button>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const isSelected = selectedSession?.request_id === log.request_id;
                    return (
                      <tr
                        key={log.request_id}
                        onClick={() => setSelectedSession(log)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-brand-500/10 dark:bg-brand-950/40'
                            : 'hover:bg-gray-50 dark:hover:bg-dark-hover/50'
                        }`}
                      >
                        <td className="px-5 py-4 font-mono font-bold text-xs text-brand-600 dark:text-brand-400">
                          {log.request_id}
                        </td>
                        <td className="px-5 py-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-5 py-4">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 whitespace-nowrap">
                            {log.category_name || log.primary_label || 'General'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center space-x-1.5 font-medium text-xs text-gray-800 dark:text-gray-200 capitalize">
                            {getTypeIcon(log.input_type)}
                            <span>{log.input_type}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 max-w-xs truncate text-xs text-gray-700 dark:text-gray-300 font-medium">
                          {log.input_summary || log.model_used}
                        </td>
                        <td className="px-5 py-4 text-xs font-mono font-bold text-gray-800 dark:text-gray-200">
                          {log.overall_confidence != null ? `${Math.round(log.overall_confidence * 100)}%` : '—'}
                        </td>
                        <td className="px-5 py-4 text-xs font-mono text-emerald-500">
                          {log.latency_total_ms ? `${log.latency_total_ms.toFixed(1)} ms` : '—'}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              log.status === 'success'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : log.status === 'ambiguous'
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSession(log);
                              }}
                            >
                              Inspect <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSessionToDelete(log);
                              }}
                              className="p-1.5 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors"
                              title="Delete this history session"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── SESSION DETAILS DRAWER / INSPECTOR ─────────────────────────────── */}
        {selectedSession && (
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white dark:bg-dark-card border-l border-gray-200 dark:border-dark-border shadow-2xl overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-dark-border pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-brand-500 text-white rounded-xl">
                  {getTypeIcon(selectedSession.input_type)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Historical Session Inspector
                  </h3>
                  <p className="text-xs text-gray-400">Request #{selectedSession.request_id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filters & Configuration Used to Categorize It */}
            <div className="p-4 bg-indigo-500/5 dark:bg-indigo-950/20 border border-indigo-500/20 rounded-2xl space-y-3">
              <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
                <Filter className="w-4 h-4" />
                <span>Filters & Parameters Used To Categorize</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Target Category</span>
                  <p className="font-bold text-brand-600 dark:text-brand-400 mt-0.5">
                    {selectedSession.category_name || selectedDetails?.category_name || selectedSession.primary_label || 'General Analysis'}
                  </p>
                </div>

                <div className="p-3 bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Execution Mode</span>
                  <p className="font-bold text-gray-800 dark:text-gray-200 uppercase mt-0.5">
                    {selectedDetails?.filters_used?.mode || 'Real-Time'}
                  </p>
                </div>

                <div className="p-3 bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Selected Output Formats</span>
                  <p className="font-bold text-gray-800 dark:text-gray-200 capitalize mt-0.5">
                    {selectedDetails?.filters_used?.output_formats?.join(', ') || 'JSON, Table, NL, Visualization'}
                  </p>
                </div>

                <div className="p-3 bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Classification Engine</span>
                  <p className="font-bold text-gray-800 dark:text-gray-200 truncate mt-0.5" title={selectedSession.model_used}>
                    {selectedSession.model_used}
                  </p>
                </div>
              </div>
            </div>

            {/* Session Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-gray-50 dark:bg-dark-hover rounded-xl">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Input Type</span>
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200 capitalize mt-0.5">
                  {selectedSession.input_type}
                </p>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-dark-hover rounded-xl">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Latency</span>
                <p className="text-xs font-bold text-emerald-500 mt-0.5">
                  {selectedSession.latency_total_ms} ms
                </p>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-dark-hover rounded-xl">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Confidence</span>
                <p className="text-xs font-bold text-brand-500 mt-0.5">
                  {selectedSession.overall_confidence != null ? `${Math.round(selectedSession.overall_confidence * 100)}%` : '—'}
                </p>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-dark-hover rounded-xl">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Execution Time</span>
                <p className="text-[11px] font-medium text-gray-600 dark:text-gray-300 mt-0.5">
                  {new Date(selectedSession.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>

            {/* Input Payload Snippet */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Submitted Input Payload
              </label>
              <div className="p-4 bg-gray-50 dark:bg-dark-hover/70 rounded-xl border border-gray-200 dark:border-dark-border text-xs text-gray-800 dark:text-gray-200 leading-relaxed font-mono">
                {selectedSession.input_summary || 'Multi-modal inference payload'}
              </div>
            </div>

            {/* Processed Output Summary */}
            <div className="p-4 bg-brand-500/10 border border-brand-500/25 rounded-2xl space-y-2">
              <div className="flex items-center space-x-2 text-brand-600 dark:text-brand-400 font-bold text-sm">
                <FileText className="w-4 h-4" />
                <span>Session Content Summary</span>
              </div>
              <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed">
                {selectedSession.output_summary || 'No summary narrative available.'}
              </p>
            </div>

            {/* Detailed Predictions */}
            {selectedDetails?.predictions?.length > 0 && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Generated Model Predictions ({selectedDetails.predictions.length})
                </label>
                <div className="space-y-2">
                  {selectedDetails.predictions.map((pred, i) => (
                    <div
                      key={i}
                      className="p-3 bg-gray-50 dark:bg-dark-hover rounded-xl border border-gray-200 dark:border-dark-border space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900 dark:text-white uppercase">
                          [{pred.task}] {pred.label}
                        </span>
                        <span className="text-xs font-mono font-bold text-brand-500">
                          {Math.round(pred.confidence * 100)}%
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {pred.explanation || pred.model_name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Extracted Topics */}
            {selectedDetails?.metadata?.top_topics?.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Extracted Thematic Topics
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedDetails.metadata.top_topics.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 text-xs rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-semibold"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions: Download Single Session & Delete */}
            <div className="pt-4 border-t border-gray-200 dark:border-dark-border flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                className="border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400"
                onClick={() => setSessionToDelete(selectedSession)}
              >
                <Trash2 className="w-4 h-4 mr-1.5" /> Delete Session
              </Button>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedSession(null)}>
                  Close Inspector
                </Button>
                <Button variant="primary" size="sm" onClick={() => handleExportFiltered('json')}>
                  <Download className="w-4 h-4 mr-1.5" /> Export Session JSON
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── DELETE SINGLE SESSION MODAL ────────────────────────────────────── */}
        {sessionToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
                <div className="p-2 bg-rose-500/10 rounded-xl">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Delete History Session
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Are you sure you want to delete session <span className="font-mono font-bold text-brand-600 dark:text-brand-400">#{sessionToDelete.request_id}</span>? This action is permanent and cannot be undone.
              </p>
              <div className="flex items-center justify-end space-x-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSessionToDelete(null)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  loading={actionLoading}
                  onClick={() => handleDeleteSession(sessionToDelete)}
                >
                  Confirm Delete
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── CLEAR ALL HISTORY MODAL ────────────────────────────────────────── */}
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
                <div className="p-2 bg-rose-500/10 rounded-xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Clear All History Records
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Are you sure you want to permanently clear all <span className="font-bold text-rose-600 dark:text-rose-400">{logs.length}</span> historical sessions associated with your account? This cannot be undone.
              </p>
              <div className="flex items-center justify-end space-x-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowClearConfirm(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  loading={actionLoading}
                  onClick={handleClearAllHistory}
                >
                  Yes, Clear All
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

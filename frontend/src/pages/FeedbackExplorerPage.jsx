import React, { useEffect, useState, useMemo, useRef } from 'react';
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
  Upload,
  Table,
  Tag,
  Check,
  BarChart3,
} from 'lucide-react';

export function FeedbackExplorerPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTab, setUploadTab] = useState('csv'); // 'csv' | 'excel'
  const [uploadCategory, setUploadCategory] = useState('Customer Experience Analysis');
  const [uploadMode, setUploadMode] = useState('realtime');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // CSV Modal State
  const [modalCsvContent, setModalCsvContent] = useState('');
  const [modalCsvFilename, setModalCsvFilename] = useState('');
  const modalCsvFileRef = useRef(null);

  // Excel Modal State
  const [modalExcelBase64, setModalExcelBase64] = useState('');
  const [modalExcelFilename, setModalExcelFilename] = useState('');
  const [modalExcelSizeKB, setModalExcelSizeKB] = useState(0);
  const modalExcelFileRef = useRef(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  const fetchLogs = async (autoSelectId = null) => {
    setLoading(true);
    try {
      const res = await mlApi.getLogs(1, 100);
      const items = res.data?.items || [];
      setLogs(items);
      if (autoSelectId) {
        const found = items.find((item) => item.request_id === autoSelectId || item.id === autoSelectId);
        if (found) setSelectedSession(found);
      }
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

  // Upload Modal Handlers
  const handleModalCsvFile = (file) => {
    if (!file) return;
    const nameLower = (file.name || '').toLowerCase();
    if (!nameLower.endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
      setUploadError('Only CSV (.csv) files are supported.');
      return;
    }
    setModalCsvFilename(file.name);
    setUploadError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      setModalCsvContent(e.target.result);
    };
    reader.readAsText(file);
  };

  const handleModalExcelFile = (file) => {
    if (!file) return;
    const nameLower = (file.name || '').toLowerCase();
    if (!nameLower.endsWith('.xlsx') && !nameLower.endsWith('.xls')) {
      setUploadError('Only Excel spreadsheets (.xlsx, .xls) are supported.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Excel file exceeds 10MB limit.');
      return;
    }
    setModalExcelFilename(file.name);
    setModalExcelSizeKB(Math.round(file.size / 1024));
    setUploadError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target.result;
      const b64 = result.split(',')[1] || '';
      setModalExcelBase64(b64);
    };
    reader.readAsDataURL(file);
  };

  const handleModalUploadSubmit = async () => {
    setUploadError('');
    let payload = {
      input_type: uploadTab,
      category_name: uploadCategory.trim() || 'General Analysis',
      mode: uploadMode,
      output_formats: ['json', 'table', 'nl', 'visualization'],
    };

    if (uploadTab === 'csv') {
      if (!modalCsvContent.trim()) {
        setUploadError('Please select or drop a CSV file, or paste CSV text.');
        return;
      }
      payload.csv_content = modalCsvContent;
      payload.csv_filename = modalCsvFilename || 'uploaded_data.csv';
    } else if (uploadTab === 'excel') {
      if (!modalExcelBase64) {
        setUploadError('Please select or drop an Excel spreadsheet (.xlsx, .xls).');
        return;
      }
      payload.excel_base64 = modalExcelBase64;
      payload.excel_filename = modalExcelFilename || 'spreadsheet.xlsx';
    }

    setUploading(true);
    try {
      const res = await mlApi.predict(payload);
      const newReqId = res.data?.request_id;
      // Reset form
      setModalCsvContent('');
      setModalCsvFilename('');
      setModalExcelBase64('');
      setModalExcelFilename('');
      setShowUploadModal(false);
      // Refresh logs and highlight new item
      await fetchLogs(newReqId);
    } catch (err) {
      console.error('Failed to process and ingest dataset:', err);
      const detail = err.response?.data?.detail;
      setUploadError(
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
          ? detail.map((d) => d.msg || JSON.stringify(d)).join(', ')
          : 'Failed to process dataset. Please verify the file format.'
      );
    } finally {
      setUploading(false);
    }
  };

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
        const diffMs = Math.abs(now.getTime() - logDate.getTime());
        if (dateFilter === 'today') {
          matchesDate = logDate.toDateString() === now.toDateString() || diffMs <= 1000 * 60 * 60 * 24;
        } else if (dateFilter === '7days') {
          matchesDate = diffMs <= 1000 * 60 * 60 * 24 * 7;
        } else if (dateFilter === '30days') {
          matchesDate = diffMs <= 1000 * 60 * 60 * 24 * 30;
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
      downloadBlob(csvContent, `FeedbackExplorer_All_History_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
    } else {
      const jsonContent = JSON.stringify(dataToExport, null, 2);
      downloadBlob(jsonContent, `FeedbackExplorer_All_History_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
    }
  };

  const handleExportFiltered = (format = 'csv') => {
    const dataToExport = selectedSession ? [selectedSession] : filteredLogs;
    if (!dataToExport.length) return;

    const filePrefix = selectedSession ? `FeedbackExplorer_Session_${selectedSession.request_id}` : `FeedbackExplorer_Filtered_History`;

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
        return <FileSpreadsheet className="w-4 h-4 text-violet-500" />;
      case 'image':
        return <ImageIcon className="w-4 h-4 text-sky-500" />;
      case 'structured':
        return <FileCode className="w-4 h-4 text-amber-500" />;
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

  const datasetRows = selectedDetails?.metadata?.dataset || [];
  const datasetHeaders = selectedDetails?.metadata?.headers || (datasetRows[0] ? Object.keys(datasetRows[0]) : []);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Page Header & Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-brand-600 rounded-xl text-white shadow-lg shadow-brand-500/30">
                <History className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                    Feedback Explorer & Historical Usage
                  </h1>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <Lock className="w-2.5 h-2.5 mr-1" /> Private & Isolated
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Inspect multi-modal feedback history, uploaded CSV & Excel spreadsheets, AI predictions, and telemetry
                </p>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS: UPLOAD DATASET, CLEAR HISTORY, EXPORTS */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Direct Upload CSV / Excel Button */}
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setShowUploadModal(true);
                setUploadError('');
              }}
              className="bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-md shadow-brand-500/25"
              title="Upload and ingest a CSV or Excel dataset"
            >
              <Upload className="w-4 h-4 mr-1.5" /> Upload CSV / Excel
            </Button>

            {logs.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClearConfirm(true)}
                className="border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                title="Clear all your inference history records"
              >
                <Trash2 className="w-4 h-4 mr-1.5" /> Clear All
              </Button>
            )}

            {/* Global/All Export */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportAll('csv')}
              disabled={logs.length === 0}
              title="Export all historical sessions for your account"
            >
              <Download className="w-4 h-4 mr-1.5" /> Export All ({logs.length})
            </Button>

            {/* Filtered / Selected Session Export */}
            {isFilteredOrSelected && logs.length > 0 ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleExportFiltered('csv')}
                className="border-brand-300 dark:border-brand-800 text-brand-600 dark:text-brand-300"
                title="Export only the selected session or currently filtered records"
              >
                <Download className="w-4 h-4 mr-1.5" />
                {selectedSession
                  ? `Export (#${selectedSession.request_id})`
                  : `Export Filtered (${filteredLogs.length})`}
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
              placeholder="Search by Request ID, File Name, Category, Output..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border rounded-xl text-xs font-medium text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Input Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border rounded-xl text-xs font-medium text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Input Types</option>
            <option value="csv">CSV Datasets</option>
            <option value="excel">Excel Workbooks</option>
            <option value="text">Text Inputs</option>
            <option value="image">Image Files</option>
            <option value="structured">Structured JSON</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border rounded-xl text-xs font-medium text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-brand-500"
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
            className="px-3 py-2 bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border rounded-xl text-xs font-medium text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
          </select>

          {/* Refresh / Reset Filters */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setTypeFilter('');
              setStatusFilter('');
              setDateFilter('all');
              fetchLogs();
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        {/* Selected Session Banner Info (if active) */}
        {selectedSession && (
          <div className="p-4 bg-brand-500/10 border border-brand-500/30 rounded-2xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="p-2 bg-brand-500 text-white rounded-lg">
                {getTypeIcon(selectedSession.input_type)}
              </span>
              <div>
                <h4 className="text-sm font-bold text-brand-600 dark:text-brand-400">
                  Currently Viewing Session: #{selectedSession.request_id} — {selectedSession.input_summary || selectedSession.category_name}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-1">
                  {selectedSession.output_summary}
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
                Feedback & Pipeline History Records ({filteredLogs.length})
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-gray-100 dark:bg-dark-hover text-gray-500 dark:text-gray-400 rounded-full">
                User Account Isolated
              </span>
            </div>
            <span className="text-xs text-gray-400">Click any session row to inspect dataset records & analysis</span>
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
                        <span>Loading historical feedback records...</span>
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-16 text-center">
                      <div className="max-w-md mx-auto space-y-4">
                        <div className="w-14 h-14 bg-brand-50 dark:bg-brand-950/40 rounded-2xl flex items-center justify-center mx-auto text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
                          <FileSpreadsheet className="w-7 h-7" />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-gray-900 dark:text-white">
                            No Feedback or File History Records Yet
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Upload a CSV or Excel dataset, or run an analysis in the ML Pipeline Studio. All processed records will appear here.
                          </p>
                        </div>
                        <div className="flex items-center justify-center gap-3">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setShowUploadModal(true);
                              setUploadError('');
                            }}
                            className="bg-brand-600 hover:bg-brand-700"
                          >
                            <Upload className="w-4 h-4 mr-1.5" /> Upload CSV / Excel Dataset
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/ml-pipeline')}
                          >
                            <Zap className="w-4 h-4 mr-1.5" /> ML Pipeline Studio
                          </Button>
                        </div>
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
                    const isSpreadsheet = log.input_type === 'csv' || log.input_type === 'excel';

                    return (
                      <tr
                        key={log.request_id || log.id}
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
                          {isSpreadsheet ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 dark:bg-dark-hover text-gray-800 dark:text-gray-200 font-mono text-[11px]">
                              {log.input_summary || `${log.input_type.toUpperCase()} File`}
                            </span>
                          ) : (
                            log.input_summary || log.model_used
                          )}
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
                  <p className="text-xs text-gray-400 font-mono">Request #{selectedSession.request_id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
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

            {/* CSAT and Polarity Metrics (if available) */}
            {(selectedDetails?.metadata?.csat_score != null || selectedDetails?.metadata?.avg_sentiment != null) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Estimated CSAT Rating</span>
                  <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {selectedDetails.metadata.csat_score}/100
                  </p>
                </div>
                <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl">
                  <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase">Mean Sentiment Polarity</span>
                  <p className="text-lg font-extrabold text-brand-600 dark:text-brand-400 mt-0.5 capitalize">
                    {selectedDetails.metadata.avg_sentiment != null ? `${selectedDetails.metadata.avg_sentiment > 0 ? '+' : ''}${selectedDetails.metadata.avg_sentiment}` : ''} ({selectedDetails.metadata.sentiment_label || 'Analyzed'})
                  </p>
                </div>
              </div>
            )}

            {/* SPREADSHEET / DATASET OVERVIEW (For CSV & Excel) */}
            {(selectedSession.input_type === 'csv' || selectedSession.input_type === 'excel' || selectedDetails?.metadata?.filename) && (
              <div className="p-4 bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-2xl space-y-3">
                <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Spreadsheet File & Dataset Overview</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-dark-border">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Filename</span>
                    <p className="font-semibold text-gray-800 dark:text-gray-200 truncate mt-0.5" title={selectedDetails?.metadata?.filename}>
                      {selectedDetails?.metadata?.filename || selectedSession.input_summary}
                    </p>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-dark-border">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Parsed Dimensions</span>
                    <p className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                      {selectedDetails?.metadata?.row_count ?? datasetRows.length} rows × {selectedDetails?.metadata?.column_count ?? datasetHeaders.length} cols
                    </p>
                  </div>
                  {selectedDetails?.metadata?.active_sheet && (
                    <div className="p-2.5 bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-dark-border">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Active Worksheet</span>
                      <p className="font-semibold text-gray-800 dark:text-gray-200 truncate mt-0.5">
                        {selectedDetails.metadata.active_sheet}
                      </p>
                    </div>
                  )}
                </div>

                {selectedDetails?.metadata?.anomalies?.length > 0 && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase flex items-center">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-500" /> Statistical Outliers Flagged ({selectedDetails.metadata.anomalies.length}):
                    </span>
                    <ul className="text-[11px] text-gray-700 dark:text-gray-300 list-disc list-inside space-y-0.5">
                      {selectedDetails.metadata.anomalies.map((ano, idx) => (
                        <li key={idx} className="truncate">{ano}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* TABULAR DATASET RECORDS PREVIEW */}
            {datasetRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Table className="w-3.5 h-3.5 text-brand-500" />
                    <span>Tabular Dataset Records Preview ({datasetRows.length} Rows Shown)</span>
                  </label>
                </div>
                <div className="border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden shadow-sm">
                  <div className="max-h-60 overflow-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-100 dark:bg-dark-hover text-gray-700 dark:text-gray-300 font-bold sticky top-0 border-b border-gray-200 dark:border-dark-border">
                        <tr>
                          <th className="px-3 py-2 text-[10px] uppercase text-gray-400 w-10">#</th>
                          {datasetHeaders.map((h, i) => (
                            <th key={i} className="px-3 py-2 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                        {datasetRows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-gray-50 dark:hover:bg-dark-hover/50 font-mono">
                            <td className="px-3 py-2 text-[10px] text-gray-400 font-bold">{rIdx + 1}</td>
                            {datasetHeaders.map((h, cIdx) => (
                              <td key={cIdx} className="px-3 py-2 max-w-xs truncate text-gray-800 dark:text-gray-200">
                                {typeof row === 'object' && row !== null ? String(row[h] ?? '') : String(row)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Processed Output Summary */}
            <div className="p-4 bg-brand-500/10 border border-brand-500/25 rounded-2xl space-y-2">
              <div className="flex items-center space-x-2 text-brand-600 dark:text-brand-400 font-bold text-sm">
                <FileText className="w-4 h-4" />
                <span>Analysis Content Summary</span>
              </div>
              <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed">
                {selectedSession.output_summary || selectedDetails?.metadata?.content_summary || 'No summary narrative available.'}
              </p>
            </div>

            {/* Prioritized Key Incident Findings (if any) */}
            {selectedDetails?.metadata?.prioritized_findings?.length > 0 && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-500" />
                  Prioritized Incident Findings ({selectedDetails.metadata.prioritized_findings.length})
                </label>
                <div className="space-y-2">
                  {selectedDetails.metadata.prioritized_findings.map((f, i) => (
                    <div
                      key={i}
                      className="p-3 bg-gray-50 dark:bg-dark-hover rounded-xl border border-gray-200 dark:border-dark-border space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                          {f.title}
                        </span>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          {f.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 dark:text-gray-300">{f.summary}</p>
                      {f.recommendation && (
                        <p className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold pt-0.5">
                          💡 Action: {f.recommendation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actionable Recommendations (if any) */}
            {selectedDetails?.metadata?.recommendations?.length > 0 && (
              <div className="p-4 bg-indigo-500/5 dark:bg-indigo-950/20 border border-indigo-500/20 rounded-2xl space-y-2">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center">
                  <Sparkles className="w-3.5 h-3.5 mr-1" /> Actionable Recommendations
                </span>
                <ul className="text-xs text-gray-700 dark:text-gray-300 list-disc list-inside space-y-1">
                  {selectedDetails.metadata.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

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

        {/* ── UPLOAD CSV / EXCEL DATASET MODAL ───────────────────────────────── */}
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-dark-border pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-brand-600 text-white rounded-xl shadow-md shadow-brand-500/30">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      Upload & Ingest Dataset
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Upload CSV or Excel spreadsheets to run AI analysis & save directly to history
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tab Selector: CSV vs Excel */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-dark-hover rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setUploadTab('csv');
                    setUploadError('');
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    uploadTab === 'csv'
                      ? 'bg-white dark:bg-dark-card shadow-sm text-emerald-600 dark:text-emerald-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                  <span>CSV Dataset</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUploadTab('excel');
                    setUploadError('');
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    uploadTab === 'excel'
                      ? 'bg-white dark:bg-dark-card shadow-sm text-violet-600 dark:text-violet-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-violet-500" />
                  <span>Excel Spreadsheet</span>
                </button>
              </div>

              {/* Upload Dropzone Area */}
              {uploadTab === 'csv' ? (
                <div className="space-y-3">
                  <div
                    onClick={() => modalCsvFileRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleModalCsvFile(e.dataTransfer.files[0]);
                    }}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                      modalCsvFilename
                        ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
                        : 'border-gray-300 dark:border-dark-border hover:border-emerald-400 hover:bg-emerald-50/50'
                    }`}
                  >
                    <FileSpreadsheet className="w-9 h-9 text-emerald-500 mx-auto mb-2" />
                    {modalCsvFilename ? (
                      <div>
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          ✓ Selected: {modalCsvFilename}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Click or drop another file to replace</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-bold text-gray-700 dark:text-gray-200">
                          Drop your .csv file here, or click to browse
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1">Supports up to 10MB CSV datasets</p>
                      </div>
                    )}
                    <input
                      ref={modalCsvFileRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => handleModalCsvFile(e.target.files[0])}
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                      Or paste raw CSV text:
                    </span>
                    <textarea
                      rows={3}
                      value={modalCsvContent}
                      onChange={(e) => {
                        setModalCsvContent(e.target.value);
                        if (!modalCsvFilename) setModalCsvFilename('pasted_feedback.csv');
                      }}
                      placeholder="id,feedback,rating&#10;1,Great customer support,5&#10;2,Checkout button unresponsive,1"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border rounded-xl text-xs font-mono text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div
                    onClick={() => modalExcelFileRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleModalExcelFile(e.dataTransfer.files[0]);
                    }}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                      modalExcelBase64
                        ? 'border-violet-400 bg-violet-50 dark:bg-violet-950/20'
                        : 'border-gray-300 dark:border-dark-border hover:border-violet-400 hover:bg-violet-50/50'
                    }`}
                  >
                    <FileSpreadsheet className="w-10 h-10 text-violet-500 mx-auto mb-2" />
                    {modalExcelBase64 ? (
                      <div>
                        <p className="text-xs font-bold text-violet-600 dark:text-violet-400">
                          ✓ Selected: {modalExcelFilename} ({modalExcelSizeKB} KB)
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Click or drop another file to replace</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-bold text-gray-700 dark:text-gray-200">
                          Drop your Excel spreadsheet (.xlsx, .xls) here
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1">Supports workbooks up to 10MB</p>
                      </div>
                    )}
                    <input
                      ref={modalExcelFileRef}
                      type="file"
                      accept=".xlsx, .xls"
                      className="hidden"
                      onChange={(e) => handleModalExcelFile(e.target.files[0])}
                    />
                  </div>
                </div>
              )}

              {/* Category Input */}
              <div className="space-y-1.5 p-3 bg-gray-50 dark:bg-dark-hover/50 rounded-xl border border-gray-200 dark:border-dark-border">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-brand-500" /> Target Category / Tag
                </label>
                <input
                  type="text"
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  placeholder="e.g. Bug Triage, Customer Satisfaction, Q3 Feedback"
                  className="w-full px-3 py-2 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg text-xs text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-brand-500"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {['Customer Experience', 'Bug Triage', 'Feature Request', 'NPS Survey', 'Billing', 'Performance'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setUploadCategory(cat)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                        uploadCategory === cat
                          ? 'bg-brand-500 text-white border-brand-500'
                          : 'bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {uploadError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUploadModal(false)}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  loading={uploading}
                  onClick={handleModalUploadSubmit}
                  className="bg-brand-600 hover:bg-brand-700 text-white"
                >
                  <Zap className="w-4 h-4 mr-1.5" /> Run & Ingest into History
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

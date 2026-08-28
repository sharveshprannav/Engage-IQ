import React, { useRef, useState } from 'react';
import { Upload, Type, Braces, AlertCircle, CheckCircle, Info, FileText, FileSpreadsheet, Tag } from 'lucide-react';

const TAB_CONFIG = [
  { id: 'text', label: 'Text', icon: Type, color: 'indigo' },
  { id: 'csv', label: 'CSV', icon: FileText, color: 'emerald' },
  { id: 'excel', label: 'Excel', icon: FileSpreadsheet, color: 'violet' },
  { id: 'image', label: 'Image', icon: Upload, color: 'sky' },
  { id: 'structured', label: 'Structured', icon: Braces, color: 'amber' },
];

const OUTPUT_FORMATS = [
  { id: 'json', label: 'JSON' },
  { id: 'table', label: 'Table' },
  { id: 'nl', label: 'Natural Language' },
  { id: 'visualization', label: 'Chart' },
];

export function InputPanel({ onSubmit, loading }) {
  const [activeTab, setActiveTab] = useState('text');
  const [categoryName, setCategoryName] = useState('Customer Experience Analysis');
  const [mode, setMode] = useState('realtime');
  const [outputFormats, setOutputFormats] = useState(['json', 'table', 'nl', 'visualization']);

  // Text state
  const [textContent, setTextContent] = useState('');

  // CSV state
  const [csvContent, setCsvContent] = useState('');
  const [csvFilename, setCsvFilename] = useState('');
  const csvFileInputRef = useRef(null);

  // Excel state
  const [excelBase64, setExcelBase64] = useState('');
  const [excelFilename, setExcelFilename] = useState('');
  const [excelSizeKB, setExcelSizeKB] = useState(0);
  const excelFileInputRef = useRef(null);

  // Image state
  const [imageBase64, setImageBase64] = useState('');
  const [imageMime, setImageMime] = useState('');
  const [imageFilename, setImageFilename] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [imageSizeKB, setImageSizeKB] = useState(0);
  const fileInputRef = useRef(null);

  // Structured state
  const [structuredJson, setStructuredJson] = useState('{\n  "query": "Show me top bugs this week",\n  "filters": { "priority": "high" },\n  "limit": 10\n}');
  const [jsonError, setJsonError] = useState('');

  // ── Form validation ───────────────────────────────────────────────────
  const [validationErrors, setValidationErrors] = useState([]);

  const validateAndBuild = () => {
    const errors = [];
    let payload = {
      input_type: activeTab,
      category_name: categoryName.trim() || 'General Analysis',
      mode,
      output_formats: outputFormats,
    };

    if (activeTab === 'text') {
      if (!textContent.trim()) errors.push('Text content is required.');
      else if (textContent.trim().length < 3) errors.push('Text must be at least 3 characters.');
      payload.text_content = textContent.trim();
    } else if (activeTab === 'csv') {
      if (!csvContent.trim()) errors.push('CSV content is empty. Please upload a file or paste data.');
      payload.csv_content = csvContent;
      payload.csv_filename = csvFilename || 'pasted_data.csv';
    } else if (activeTab === 'excel') {
      if (!excelBase64) errors.push('Please upload an Excel spreadsheet.');
      payload.excel_base64 = excelBase64;
      payload.excel_filename = excelFilename || 'data.xlsx';
    } else if (activeTab === 'image') {
      if (!imageBase64) errors.push('Please upload an image.');
      payload.image_base64 = imageBase64;
      payload.image_mime_type = imageMime;
      payload.image_filename = imageFilename;
    } else if (activeTab === 'structured') {
      try {
        const parsed = JSON.parse(structuredJson);
        if (!Object.keys(parsed).length) errors.push('JSON cannot be empty.');
        payload.structured_query = parsed;
        setJsonError('');
      } catch (e) {
        errors.push(`Invalid JSON: ${e.message}`);
        setJsonError(e.message);
      }
    }

    setValidationErrors(errors);
    if (errors.length) return;
    onSubmit(payload);
  };

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleCsvUpload = (file) => {
    if (!file) return;
    const nameLower = (file.name || '').toLowerCase();
    if (!nameLower.endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
      setValidationErrors(['Only CSV files are supported in this tab.']);
      return;
    }
    setCsvFilename(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      setCsvContent(e.target.result);
      setValidationErrors([]);
    };
    reader.readAsText(file);
  };

  const handleExcelUpload = (file) => {
    if (!file) return;
    const nameLower = (file.name || '').toLowerCase();
    if (!nameLower.endsWith('.xlsx') && !nameLower.endsWith('.xls')) {
      setValidationErrors(['Only Excel spreadsheets (.xlsx, .xls) are supported.']);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setValidationErrors(['Excel file exceeds 10MB limit.']);
      return;
    }
    setExcelFilename(file.name);
    setExcelSizeKB(Math.round(file.size / 1024));
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target.result;
      const b64 = result.split(',')[1] || '';
      setExcelBase64(b64);
      setValidationErrors([]);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (file) => {
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setValidationErrors(['Only JPEG, PNG, WEBP, and GIF are supported.']);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setValidationErrors(['Image exceeds 10MB limit.']);
      return;
    }
    setImageFilename(file.name);
    setImageMime(file.type);
    setImageSizeKB(Math.round(file.size / 1024));
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target.result;
      setImagePreview(result);
      const b64 = result.split(',')[1] || '';
      setImageBase64(b64);
      setValidationErrors([]);
    };
    reader.readAsDataURL(file);
  };

  const toggleFormat = (fId) =>
    setOutputFormats(prev =>
      prev.includes(fId) ? prev.filter(f => f !== fId) : [...prev, fId]
    );

  const activeConfig = TAB_CONFIG.find(t => t.id === activeTab);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Input Configuration</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">Select input type, configure payload, choose output formats</p>
      </div>

      {/* ── Input Type Tabs ────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-1 p-1 bg-gray-100 dark:bg-dark-hover rounded-xl">
        {TAB_CONFIG.map(tab => (
          <button
            key={tab.id}
            id={`ml-tab-${tab.id}`}
            onClick={() => { setActiveTab(tab.id); setValidationErrors([]); }}
            className={`flex flex-col items-center py-2 px-0.5 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-white dark:bg-dark-card shadow-sm text-brand-600 dark:text-brand-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5 mb-0.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Input Content ──────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'text' && (
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
              Text Content
            </label>
            <textarea
              id="ml-text-input"
              value={textContent}
              onChange={e => setTextContent(e.target.value)}
              placeholder="Enter customer feedback, a natural language query, or any text for NLP analysis..."
              rows={8}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border rounded-xl text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all font-mono"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>{textContent.length} / 50,000 chars</span>
              {textContent.length > 0 && textContent.length < 20 && (
                <span className="text-amber-500 flex items-center gap-1">
                  <Info className="w-3 h-3" /> Short text — confidence may be lower
                </span>
              )}
            </div>
          </div>
        )}

        {activeTab === 'csv' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                CSV Document (Upload or Paste)
              </label>
              <button
                onClick={() => csvFileInputRef.current?.click()}
                className="text-xs text-brand-500 hover:text-brand-400 font-semibold transition-colors"
              >
                📁 Browse File
              </button>
            </div>
            
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleCsvUpload(e.dataTransfer.files[0]); }}
              className="border border-dashed border-gray-300 dark:border-dark-border rounded-xl p-3 bg-gray-50/50 dark:bg-dark-hover/10 text-center cursor-pointer"
              onClick={() => csvFileInputRef.current?.click()}
            >
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {csvFilename ? `✓ Selected: ${csvFilename}` : 'Drop a .csv file here, or click to upload'}
              </p>
            </div>

            <textarea
              id="ml-csv-input"
              value={csvContent}
              onChange={e => setCsvContent(e.target.value)}
              placeholder="id,feedback,rating&#10;1,Great customer support,5&#10;2,App crashes when loading dashboard,1"
              rows={6}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border rounded-xl text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all font-mono"
            />
            <input
              ref={csvFileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => handleCsvUpload(e.target.files[0])}
            />
          </div>
        )}

        {activeTab === 'excel' && (
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
              Excel Spreadsheet (.xlsx, .xls)
            </label>
            <div
              onClick={() => excelFileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleExcelUpload(e.dataTransfer.files[0]); }}
              className={`relative border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
                excelBase64
                  ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 p-6'
                  : 'border-gray-300 dark:border-dark-border hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/10 p-10'
              }`}
            >
              {excelBase64 ? (
                <>
                  <FileSpreadsheet className="w-10 h-10 text-emerald-500 mb-2" />
                  <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {excelFilename} · {excelSizeKB}KB
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Click to replace spreadsheet</p>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-gray-300 mb-3" />
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Drop Excel spreadsheet or browse</p>
                  <p className="text-xs text-gray-400 mt-1">Excel formats (.xlsx, .xls) · Max 10MB</p>
                </>
              )}
              <input
                ref={excelFileInputRef}
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={e => handleExcelUpload(e.target.files[0])}
              />
            </div>
          </div>
        )}

        {activeTab === 'image' && (
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
              Image Upload
            </label>
            <div
              id="ml-image-dropzone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleImageUpload(e.dataTransfer.files[0]); }}
              className={`relative border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
                imagePreview
                  ? 'border-violet-400 bg-violet-50 dark:bg-violet-950/20 p-2'
                  : 'border-gray-300 dark:border-dark-border hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/10 p-10'
              }`}
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" className="max-h-48 rounded-xl object-contain" />
                  <div className="mt-2 flex items-center gap-2 text-xs text-violet-600 dark:text-violet-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {imageFilename} · {imageSizeKB}KB · {imageMime}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Click to replace</p>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-gray-300 mb-3" />
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Drop an image or click to browse</p>
                  <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WEBP, GIF · Max 10MB</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={e => handleImageUpload(e.target.files[0])}
              />
            </div>
          </div>
        )}

        {activeTab === 'structured' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                JSON Payload
              </label>
              {!jsonError && structuredJson && (
                <span className="text-xs text-emerald-500 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Valid JSON
                </span>
              )}
            </div>
            <textarea
              id="ml-json-input"
              value={structuredJson}
              onChange={e => {
                setStructuredJson(e.target.value);
                try { JSON.parse(e.target.value); setJsonError(''); }
                catch (err) { setJsonError(err.message); }
              }}
              rows={9}
              spellCheck={false}
              className={`w-full px-4 py-3 bg-gray-950 border rounded-xl text-xs text-emerald-300 font-mono resize-none focus:outline-none focus:ring-2 transition-all ${
                jsonError
                  ? 'border-rose-500 focus:ring-rose-500/30'
                  : 'border-gray-700 focus:ring-brand-500/30'
              }`}
            />
            {jsonError && (
              <p className="text-xs text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {jsonError}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Category Name Input ────────────────────────────────────── */}
      <div className="space-y-1.5 p-3 bg-gray-50 dark:bg-dark-hover/60 border border-gray-200 dark:border-dark-border rounded-xl">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-brand-500" />
            <span>Category Name / Target</span>
          </label>
          <span className="text-[10px] text-gray-400 font-medium">Categorization tag</span>
        </div>
        <input
          type="text"
          id="ml-category-name-input"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          placeholder="e.g. Bug Triage, Feature Request, NPS Feedback..."
          className="w-full px-3 py-2 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
        />
        <div className="flex flex-wrap gap-1 pt-1">
          {['Bug Triage', 'Feature Request', 'NPS Survey', 'Onboarding', 'Billing', 'Performance'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryName(cat)}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                categoryName === cat
                  ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                  : 'bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-300 hover:border-brand-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Output Format Selection ────────────────────────────── */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
          Output Formats
        </label>
        <div className="flex flex-wrap gap-2">
          {OUTPUT_FORMATS.map(f => (
            <button
              key={f.id}
              id={`ml-format-${f.id}`}
              onClick={() => toggleFormat(f.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-150 ${
                outputFormats.includes(f.id)
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-300 dark:border-dark-border hover:border-brand-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Processing Mode ────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Mode</span>
        <div className="flex gap-1 p-0.5 bg-gray-100 dark:bg-dark-hover rounded-lg">
          {['realtime', 'batch'].map(m => (
            <button
              key={m}
              id={`ml-mode-${m}`}
              onClick={() => setMode(m)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                mode === m
                  ? 'bg-white dark:bg-dark-card shadow text-brand-600 dark:text-brand-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {m === 'realtime' ? '⚡ Real-time' : '⏱ Batch'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Validation Errors ──────────────────────────────────── */}
      {validationErrors.length > 0 && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl space-y-1">
          {validationErrors.map((e, i) => (
            <p key={i} className="text-xs text-rose-600 dark:text-rose-400 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />{e}
            </p>
          ))}
        </div>
      )}

      {/* ── Submit ─────────────────────────────────────────────── */}
      <button
        id="ml-run-btn"
        onClick={validateAndBuild}
        disabled={loading}
        className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
          loading
            ? 'bg-brand-400 cursor-not-allowed opacity-70'
            : 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 shadow-lg shadow-brand-500/30 active:scale-95'
        } text-white`}
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Analyzing…
          </>
        ) : (
          `▶ Run ${activeConfig.label} Analysis`
        )}
      </button>
    </div>
  );
}

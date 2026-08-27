import React, { useState, useCallback } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { InputPanel } from '../components/ml/InputPanel';
import { PreprocessingVisualizer } from '../components/ml/PreprocessingVisualizer';
import { OutputPanel } from '../components/ml/OutputPanel';
import { LatencyTelemetryBar } from '../components/ml/LatencyTelemetryBar';
import { mlApi } from '../api/mlApi';
import { FlaskConical, Sparkles } from 'lucide-react';

export function MLPipelinePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [currentMode, setCurrentMode] = useState('realtime');
  const [requestCount, setRequestCount] = useState(0);

  // ── Run inference ─────────────────────────────────────────────────────
  const runInference = useCallback(async (payload) => {
    setCurrentMode(payload.mode);
    setLoading(true);
    setRunning(true);

    const startTime = performance.now();

    try {
      const res = await mlApi.predict(payload);
      setResult(res.data);
      setRequestCount((c) => c + 1);
    } catch (err) {
      console.error('ML inference error:', err);
      const errData = err.response?.data;
      setResult({
        request_id: 'err-' + Math.random().toString(36).slice(2, 7),
        input_type: payload.input_type,
        mode: payload.mode,
        status: 'error',
        validation: {
          is_valid: false,
          errors: errData?.detail
            ? [typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail)]
            : ['An unexpected processing error occurred. Check the server.'],
          warnings: [],
          preprocessing_steps: [],
        },
        predictions: [],
        overall_confidence: 0,
        model_used: 'EngageAI Fallback',
        latency: { total_ms: performance.now() - startTime, validation_ms: 0, preprocessing_ms: 0, model_ms: 0, postprocessing_ms: 0 },
        output_formats: { nl: 'Error processing input payload. Please check file format.' },
        metadata: {},
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
      setTimeout(() => setRunning(false), 200);
    }
  }, []);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 max-w-7xl mx-auto">
        {/* ── Page Header ───────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30 text-white">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                ML Pipeline Studio
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Multi-modal AI data processing, deep content insights summary, & interactive visual charts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800 rounded-xl text-xs text-brand-700 dark:text-brand-300 font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Active Inference Engine: VADER + TF-IDF + Priority</span>
          </div>
        </div>

        {/* ── Main 2-column layout ──────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* LEFT: Input + Pipeline Step Visualizer */}
          <div className="xl:col-span-2 flex flex-col gap-5">
            {/* Input Configuration Panel */}
            <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-5 shadow-sm">
              <InputPanel onSubmit={runInference} loading={loading} />
            </div>

            {/* Preprocessing Step Visualizer */}
            <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-5 shadow-sm">
              <PreprocessingVisualizer running={running} result={result} />
            </div>
          </div>

          {/* RIGHT: Output Panel with Textual Summary, Visual Charts, and Session Export */}
          <div className="xl:col-span-3 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-6 shadow-sm min-h-[600px] flex flex-col">
            <OutputPanel result={result} requestId={result?.request_id} />
          </div>
        </div>

        {/* ── Latency Telemetry Ribbon ─────────────────────────────── */}
        <LatencyTelemetryBar
          latency={result?.latency}
          mode={currentMode}
          requestCount={requestCount}
        />
      </div>
    </DashboardLayout>
  );
}


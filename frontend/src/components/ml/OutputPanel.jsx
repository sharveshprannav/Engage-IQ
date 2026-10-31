import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  AlertTriangle,
  Download,
  CheckCircle2,
  XCircle,
  Zap,
  BarChart3,
  Copy,
  Check,
  Sparkles,
  History,
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  Tag,
  ShieldAlert,
  Info,
  ListChecks,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '../common/Button';

// ── Helpers ───────────────────────────────────────────────────────────────────

function SeverityBadge({ severity }) {
  const map = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    high:     'bg-orange-500/20 text-orange-400 border-orange-500/30',
    medium:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low:      'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  };
  const cls = map[(severity || 'medium').toLowerCase()] || map.medium;
  return (
    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${cls}`}>
      {severity}
    </span>
  );
}

function SentimentArrow({ polarity }) {
  if (polarity == null) return null;
  if (polarity > 0.1) return <TrendingUp className="w-4 h-4 text-emerald-400" />;
  if (polarity < -0.1) return <TrendingDown className="w-4 h-4 text-rose-400" />;
  return <Minus className="w-4 h-4 text-gray-400" />;
}

function ConfidenceBar({ value, color = 'brand' }) {
  const pct = Math.round((value || 0) * 100);
  const colorMap = {
    brand:   'from-brand-600 via-indigo-500 to-emerald-400',
    rose:    'from-rose-600 to-orange-400',
    emerald: 'from-emerald-600 to-teal-400',
    amber:   'from-amber-500 to-yellow-400',
  };
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-mono font-bold">
        <span className="text-gray-500">Confidence</span>
        <span className="text-brand-500">{pct}%</span>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-dark-hover rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${colorMap[color]} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, iconColor = 'text-brand-500', children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 dark:border-dark-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-dark-hover/60 hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
      >
        <div className={`flex items-center space-x-2 font-bold text-sm text-gray-900 dark:text-white`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <span>{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 text-center space-y-4">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500/20 to-indigo-500/20 flex items-center justify-center">
        <Sparkles className="w-10 h-10 text-brand-500 animate-pulse" />
      </div>
      <div>
        <h3 className="font-bold text-gray-800 dark:text-gray-200 text-base">Ready for Model Processing</h3>
        <p className="text-xs text-gray-400 mt-1 max-w-sm">
          Select an input type, configure your payload, and run the pipeline to see detailed AI analysis results here.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-2 w-full max-w-sm text-left">
        {[
          { icon: Brain, label: 'Sentiment Analysis', desc: 'Polarity score + label' },
          { icon: Tag, label: 'Intent Classification', desc: 'Category + confidence' },
          { icon: ShieldAlert, label: 'Priority Scoring', desc: 'Urgency + SLA risk' },
          { icon: Lightbulb, label: 'Recommendations', desc: 'Actionable next steps' },
        ].map(({ icon: I, label, desc }) => (
          <div key={label} className="flex items-start space-x-2 p-3 bg-gray-50 dark:bg-dark-hover/40 rounded-xl border border-gray-100 dark:border-dark-border">
            <I className="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{label}</p>
              <p className="text-[10px] text-gray-400">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function OutputPanel({ result, requestId }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  if (!result) return <EmptyState />;

  // ── Export handlers ────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const rows = [
      ['Session Request ID', result.request_id || requestId],
      ['Execution Status', result.status],
      ['Model Used', result.model_used],
      ['Overall Confidence', `${Math.round((result.overall_confidence || 0) * 100)}%`],
      ['Total Latency (ms)', result.latency?.total_ms || 0],
      ['Summary', (result.metadata?.content_summary || result.output_formats?.nl || '').replace(/"/g, '""')],
    ];
    if (result.predictions?.length) {
      rows.push(['--- PREDICTIONS ---', '']);
      result.predictions.forEach((p, i) =>
        rows.push([`Prediction #${i + 1}`, `${p.task}: ${p.label} (${Math.round(p.confidence * 100)}%) — ${p.explanation || ''}`])
      );
    }
    if (result.metadata?.prioritized_findings?.length) {
      rows.push(['--- FINDINGS ---', '']);
      result.metadata.prioritized_findings.forEach((f, i) =>
        rows.push([`Finding #${i + 1}`, `[${f.severity}] ${f.title}: ${f.summary} | Action: ${f.recommendation || 'N/A'}`])
      );
    }
    const csv = rows.map(r => `"${r[0]}","${(r[1] || '').toString().replace(/"/g, '""')}"`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Pipeline_${result.request_id || 'session'}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const handleExportJSON = () => {
    const data = JSON.stringify({ request_id: result.request_id, status: result.status, model_used: result.model_used, confidence: result.overall_confidence, latency: result.latency, summary: result.metadata?.content_summary || result.output_formats?.nl, findings: result.metadata?.prioritized_findings || [], recommendations: result.metadata?.recommendations || [], predictions: result.predictions || [], metadata: result.metadata || {}, timestamp: new Date().toISOString() }, null, 2);
    const a = document.createElement('a');
    a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(data);
    a.download = `Pipeline_${result.request_id || 'session'}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const copySummary = () => {
    navigator.clipboard.writeText(result.metadata?.content_summary || result.output_formats?.nl || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Data preparation ───────────────────────────────────────────────────────
  const sentiment = result.metadata?.sentiment_polarity ?? null;
  const sentimentLabel = result.metadata?.sentiment_label || (sentiment > 0.1 ? 'Positive' : sentiment < -0.1 ? 'Negative' : 'Neutral');
  const csatScore = result.metadata?.csat_score ?? null;
  const confidence = result.overall_confidence ?? 0;
  const topics = result.metadata?.topics || [];
  const recommendations = result.metadata?.recommendations || [];
  const findings = result.metadata?.prioritized_findings || [];
  const predictions = result.predictions || [];
  const summary = result.metadata?.content_summary || result.output_formats?.nl || '';
  const isError = result.status === 'error';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full space-y-4 overflow-y-auto">

      {/* ── Session Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50 dark:bg-dark-hover/60 border border-gray-200 dark:border-dark-border rounded-2xl flex-shrink-0">
        <div className="flex items-center space-x-3">
          <span className={`p-2 rounded-xl ${isError ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-500'}`}>
            {isError ? <XCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          </span>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                {isError ? 'Processing Error' : 'Analysis Complete'}
              </h3>
              <span className={`px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full border ${
                isError
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
              }`}>
                {result.status}
              </span>
            </div>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Req: #{result.request_id || requestId} · {result.model_used}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => navigate('/explorer')} title="View full history in Explorer">
            <History className="w-3.5 h-3.5 mr-1" /> Explorer
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-3.5 h-3.5 mr-1" /> CSV
          </Button>
          <Button variant="primary" size="sm" onClick={handleExportJSON}>
            <Download className="w-3.5 h-3.5 mr-1" /> JSON
          </Button>
        </div>
      </div>

      {/* ── Top Metrics Strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-shrink-0">
        {/* Sentiment */}
        <div className="p-3 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Sentiment</span>
          <div className="flex items-center space-x-1">
            <SentimentArrow polarity={sentiment} />
            <p className={`text-sm font-extrabold ${
              sentiment > 0.1 ? 'text-emerald-500' : sentiment < -0.1 ? 'text-rose-400' : 'text-gray-500'
            }`}>
              {sentimentLabel}
            </p>
          </div>
          {sentiment !== null && (
            <p className="text-[10px] text-gray-400 font-mono">{sentiment > 0 ? '+' : ''}{sentiment.toFixed(3)} polarity</p>
          )}
        </div>

        {/* CSAT */}
        <div className="p-3 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Est. CSAT</span>
          <p className="text-sm font-extrabold text-emerald-500">
            {csatScore != null ? `${csatScore}/100` : 'N/A'}
          </p>
          <p className="text-[10px] text-gray-400">Customer satisfaction index</p>
        </div>

        {/* Confidence */}
        <div className="p-3 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Confidence</span>
          <p className="text-sm font-extrabold text-indigo-500">{Math.round(confidence * 100)}%</p>
          <div className="w-full h-1.5 bg-gray-100 dark:bg-dark-hover rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-indigo-500 transition-all duration-700" style={{ width: `${Math.round(confidence * 100)}%` }} />
          </div>
        </div>

        {/* Latency */}
        <div className="p-3 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Latency</span>
          <p className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center">
            <Zap className="w-3.5 h-3.5 mr-1 text-amber-500" />
            {result.latency?.total_ms ? result.latency.total_ms.toFixed(1) : '—'} ms
          </p>
          <p className="text-[10px] text-gray-400">End-to-end pipeline</p>
        </div>
      </div>

      {/* ── 1. DETAILED SUMMARY ────────────────────────────────────────── */}
      <Section title="Executive Analysis Summary" icon={FileText} iconColor="text-brand-500">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed flex-1">
            {summary || 'The input payload has been analyzed across sentiment polarity, intent classification, and priority scoring.'}
          </p>
          <button onClick={copySummary} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex items-center space-x-1 text-xs flex-shrink-0 mt-0.5">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* What was detected */}
        {predictions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-dark-border">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">What the model detected:</p>
            <ul className="space-y-1.5">
              {predictions.map((p, i) => (
                <li key={i} className="flex items-start space-x-2 text-xs text-gray-700 dark:text-gray-300">
                  <span className="mt-0.5 w-4 h-4 rounded-full bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center text-[10px] font-extrabold flex-shrink-0">{i + 1}</span>
                  <span>
                    <strong className="capitalize">{p.task}:</strong>{' '}
                    <span className="font-semibold text-brand-600 dark:text-brand-400">{p.label}</span>
                    {' '}({Math.round(p.confidence * 100)}% confidence)
                    {p.explanation && <span className="text-gray-500"> — {p.explanation}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {/* ── 2. PREDICTION BREAKDOWN ────────────────────────────────────── */}
      {predictions.length > 0 && (
        <Section title="Prediction Breakdown" icon={Brain} iconColor="text-purple-500">
          <div className="space-y-4">
            {predictions.map((p, i) => {
              const pct = Math.round(p.confidence * 100);
              const colorMap = { positive: 'emerald', negative: 'rose', neutral: 'amber' };
              const barColor = colorMap[p.label?.toLowerCase()] || 'brand';
              return (
                <div key={i} className="p-3 bg-gray-50 dark:bg-dark-hover/40 rounded-xl space-y-2 border border-gray-100 dark:border-dark-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 bg-brand-500/10 text-brand-600 dark:text-brand-400 text-[10px] font-extrabold uppercase rounded border border-brand-500/20">
                        {p.task}
                      </span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white capitalize">{p.label}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-brand-500">{pct}%</span>
                  </div>
                  <ConfidenceBar value={p.confidence} color={barColor} />
                  {p.explanation && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 flex items-start space-x-1.5">
                      <Info className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                      <span><strong>Why:</strong> {p.explanation}</span>
                    </p>
                  )}
                  {p.alternatives?.length > 0 && (
                    <div className="pt-1 border-t border-gray-200 dark:border-dark-border">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Alternative interpretations:</p>
                      <div className="flex flex-wrap gap-1">
                        {p.alternatives.map((alt, ai) => (
                          <span key={ai} className="text-[10px] px-2 py-0.5 rounded bg-gray-200 dark:bg-dark-card text-gray-600 dark:text-gray-400 font-mono">
                            {alt.label} ({Math.round((alt.confidence || 0) * 100)}%)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── 3. PRIORITIZED FINDINGS ────────────────────────────────────── */}
      {findings.length > 0 && (
        <Section title="Prioritized Key Findings" icon={ShieldAlert} iconColor="text-rose-500">
          <div className="space-y-3">
            {findings.map((f, i) => (
              <div key={i} className="p-4 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl space-y-2 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{f.title}</p>
                  <SeverityBadge severity={f.severity} />
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{f.summary}</p>
                {f.recommendation && (
                  <div className="flex items-start space-x-2 pt-2 border-t border-gray-100 dark:border-dark-border">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                      <strong>Recommended action:</strong> {f.recommendation}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── 4. ACTIONABLE RECOMMENDATIONS ─────────────────────────────── */}
      {recommendations.length > 0 && (
        <Section title="Actionable Recommendations" icon={ListChecks} iconColor="text-emerald-500">
          <ol className="space-y-2">
            {recommendations.map((rec, i) => (
              <li key={i} className="flex items-start space-x-3">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-extrabold flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{rec}</p>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* ── 5. CONFIDENCE CHART ────────────────────────────────────────── */}
      {predictions.length > 0 && (
        <Section title="Model Confidence Visualization" icon={BarChart3} iconColor="text-indigo-500">
          <div className="space-y-3">
            {predictions.map((p, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-xs text-gray-700 dark:text-gray-300 font-medium">
                  <span className="capitalize">{p.task}: <strong>{p.label}</strong></span>
                  <span className="font-mono font-bold text-brand-500">{Math.round(p.confidence * 100)}%</span>
                </div>
                <div className="w-full h-3.5 bg-gray-100 dark:bg-dark-hover rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-600 via-indigo-500 to-emerald-400 transition-all duration-700"
                    style={{ width: `${Math.round(p.confidence * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Latency Breakdown */}
          {result.latency && (
            <div className="pt-3 border-t border-gray-100 dark:border-dark-border">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Latency Breakdown:</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Validation', val: result.latency.validation_ms },
                  { label: 'Model Inference', val: result.latency.model_ms },
                  { label: 'Post-processing', val: result.latency.postprocessing_ms },
                  { label: 'Total End-to-End', val: result.latency.total_ms },
                ].map(({ label, val }) => (
                  <div key={label} className="p-2 bg-gray-50 dark:bg-dark-hover/40 rounded-lg">
                    <p className="text-[10px] text-gray-400">{label}</p>
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200 font-mono">
                      {val != null ? `${val.toFixed(2)} ms` : '—'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* ── 6. EXTRACTED TOPICS ────────────────────────────────────────── */}
      {topics.length > 0 && (
        <Section title="Extracted Thematic Topics" icon={Tag} iconColor="text-violet-500">
          <div className="flex flex-wrap gap-2">
            {topics.map((t, i) => (
              <span
                key={i}
                className="px-3 py-1 text-xs rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-semibold"
              >
                #{t}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            These topics were automatically extracted from the input using TF-IDF keyword analysis and NLP topic detection.
          </p>
        </Section>
      )}

      {/* ── 7. PIPELINE EXPLANATION ────────────────────────────────────── */}
      <Section title="How This Analysis Works" icon={Info} iconColor="text-sky-500" defaultOpen={false}>
        <div className="space-y-3 text-xs text-gray-600 dark:text-gray-400">
          <div className="p-3 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 rounded-xl">
            <p className="font-bold text-sky-700 dark:text-sky-300 mb-1">🔬 Model Used: {result.model_used}</p>
            <p>This result was produced by EngageAI's local ML pipeline — no external API required.</p>
          </div>
          <div className="space-y-2">
            {[
              { step: '1. Input Validation', desc: 'The payload is validated for type, length, encoding, and format correctness before any model runs.' },
              { step: '2. Sentiment Analysis (VADER)', desc: 'VADER (Valence Aware Dictionary and sEntiment Reasoner) scores the text polarity from -1.0 (very negative) to +1.0 (very positive). It handles social media language, emojis, and slang natively.' },
              { step: '3. Intent Classification (TF-IDF)', desc: 'Term Frequency–Inverse Document Frequency extracts the most important keywords and classifies the input into categories like Bug Report, Feature Request, Billing Issue, etc.' },
              { step: '4. Priority Scoring (Weighted Engine)', desc: 'A weighted scoring engine combines sentiment polarity (30%), category weight (25%), customer tier (25%), and keyword severity (20%) to assign a final priority: Critical, High, Medium, or Low.' },
              { step: '5. Confidence Score', desc: 'The confidence score reflects how certain the model is about its predictions based on text length, keyword clarity, and consistency across sub-models. Scores above 70% are considered reliable.' },
              { step: '6. Output Assembly', desc: 'All results are merged into a structured output with a natural language summary, prioritized findings, recommendations, and chart data — then persisted to your inference log history.' },
            ].map(({ step, desc }) => (
              <div key={step} className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0 mt-1.5" />
                <div>
                  <p className="font-bold text-gray-700 dark:text-gray-200">{step}</p>
                  <p className="text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

    </div>
  );
}

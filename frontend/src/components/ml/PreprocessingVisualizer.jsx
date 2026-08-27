import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, Loader, ChevronRight } from 'lucide-react';

const PIPELINE_STEPS = [
  { id: 'receive', label: 'Receive Input', description: 'Payload arrives at the API gateway' },
  { id: 'validate', label: 'Validate Schema', description: 'Pydantic v2 checks type, bounds, encoding' },
  { id: 'normalize', label: 'Normalize & Clean', description: 'Strip whitespace, decode base64, coerce types' },
  { id: 'extract', label: 'Feature Extraction', description: 'NLP tokenization, embedding, statistical features' },
  { id: 'dispatch', label: 'Model Dispatch', description: 'Route to appropriate AI service(s)' },
  { id: 'postprocess', label: 'Post-process Output', description: 'Assemble multi-format response, compute confidence' },
];

const STATUS_CONFIG = {
  idle: {
    icon: Clock,
    className: 'text-gray-400 dark:text-gray-600',
    dot: 'bg-gray-300 dark:bg-gray-700',
    label: 'Idle',
  },
  running: {
    icon: Loader,
    className: 'text-brand-500 animate-spin',
    dot: 'bg-brand-500 animate-pulse',
    label: 'Running',
  },
  success: {
    icon: CheckCircle,
    className: 'text-emerald-500',
    dot: 'bg-emerald-500',
    label: 'Done',
  },
  error: {
    icon: XCircle,
    className: 'text-rose-500',
    dot: 'bg-rose-500',
    label: 'Error',
  },
};

/**
 * Animates the pipeline steps in sequence when `running` is true.
 * Marks each step success/error based on the `result` prop.
 */
export function PreprocessingVisualizer({ running, result }) {
  const [stepStatuses, setStepStatuses] = useState(() =>
    Object.fromEntries(PIPELINE_STEPS.map(s => [s.id, 'idle']))
  );
  const [activeIndex, setActiveIndex] = useState(-1);

  // Reset on new run
  useEffect(() => {
    if (running) {
      setStepStatuses(Object.fromEntries(PIPELINE_STEPS.map(s => [s.id, 'idle'])));
      setActiveIndex(-1);
      animateSteps(result);
    }
  }, [running]);

  // When result arrives, mark remaining steps done/error
  useEffect(() => {
    if (result && !running) {
      const hasError = result.status === 'error';
      setStepStatuses(prev => {
        const updated = { ...prev };
        // Mark any idle/running steps as success or error at end
        PIPELINE_STEPS.forEach(s => {
          if (updated[s.id] === 'idle' || updated[s.id] === 'running') {
            updated[s.id] = hasError ? 'error' : 'success';
          }
        });
        return updated;
      });
    }
  }, [result, running]);

  const animateSteps = async (res) => {
    const stepLatencies = res
      ? [
          20,
          res.latency?.validation_ms || 30,
          40,
          80,
          res.latency?.model_ms || 150,
          res.latency?.postprocessing_ms || 30,
        ]
      : [20, 30, 40, 80, 150, 30];

    for (let i = 0; i < PIPELINE_STEPS.length; i++) {
      const step = PIPELINE_STEPS[i];
      setActiveIndex(i);
      setStepStatuses(prev => ({ ...prev, [step.id]: 'running' }));

      const delay = Math.max(200, Math.min(stepLatencies[i] * 2, 900));
      await new Promise(r => setTimeout(r, delay));

      setStepStatuses(prev => ({ ...prev, [step.id]: 'success' }));
    }
    setActiveIndex(-1);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
          Pipeline Stages
        </h3>
        {running && (
          <span className="text-xs text-brand-500 font-semibold animate-pulse flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-brand-500 rounded-full inline-block animate-ping" />
            Processing…
          </span>
        )}
        {result && !running && (
          <span className={`text-xs font-semibold flex items-center gap-1 ${
            result.status === 'error' ? 'text-rose-500' : 'text-emerald-500'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${result.status === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
            {result.status === 'error' ? 'Failed' : `Completed in ${result.latency?.total_ms?.toFixed(0) || '—'}ms`}
          </span>
        )}
      </div>

      {/* Step list */}
      <div className="relative">
        {/* Vertical connector line */}
        <div className="absolute left-3.5 top-4 bottom-4 w-px bg-gray-200 dark:bg-dark-border" />

        <div className="space-y-1">
          {PIPELINE_STEPS.map((step, idx) => {
            const status = stepStatuses[step.id];
            const cfg = STATUS_CONFIG[status];
            const Icon = cfg.icon;
            const isActive = idx === activeIndex;
            const latency = result?.latency;

            // Map step to latency field
            const latencyMap = {
              validate: latency?.validation_ms,
              extract: latency?.preprocessing_ms,
              dispatch: latency?.model_ms,
              postprocess: latency?.postprocessing_ms,
            };
            const stepMs = latencyMap[step.id];

            return (
              <div
                key={step.id}
                className={`relative flex items-start gap-3 pl-1 pr-2 py-2 rounded-xl transition-all duration-300 ${
                  isActive ? 'bg-brand-50 dark:bg-brand-950/30' : 'hover:bg-gray-50 dark:hover:bg-dark-hover'
                }`}
              >
                {/* Status dot */}
                <div className={`relative z-10 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  status === 'idle' ? 'bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border' :
                  status === 'running' ? 'bg-brand-500 border-brand-500' :
                  status === 'success' ? 'bg-emerald-500 border-emerald-500' :
                  'bg-rose-500 border-rose-500'
                }`}>
                  <Icon className={`w-3 h-3 ${status === 'idle' ? 'text-gray-300' : 'text-white'} ${status === 'running' ? 'animate-spin' : ''}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-semibold transition-colors ${
                      isActive ? 'text-brand-600 dark:text-brand-400' :
                      status === 'success' ? 'text-gray-700 dark:text-gray-200' :
                      'text-gray-500 dark:text-gray-500'
                    }`}>
                      {step.label}
                    </span>
                    {stepMs != null && status === 'success' && (
                      <span className="text-xs text-gray-400 font-mono">{stepMs.toFixed(1)}ms</span>
                    )}
                  </div>
                  {isActive && (
                    <p className="text-xs text-brand-500 mt-0.5 animate-pulse">{step.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Validation details */}
      {result?.validation && (
        <div className={`mt-3 p-3 rounded-xl text-xs space-y-1.5 ${
          result.validation.is_valid
            ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800'
            : 'bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800'
        }`}>
          <p className={`font-bold ${result.validation.is_valid ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
            {result.validation.is_valid ? '✓ Validation Passed' : '✗ Validation Failed'}
          </p>
          {result.validation.errors.map((e, i) => (
            <p key={i} className="text-rose-600 dark:text-rose-400 flex items-start gap-1">
              <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />{e}
            </p>
          ))}
          {result.validation.warnings.map((w, i) => (
            <p key={i} className="text-amber-600 dark:text-amber-400 flex items-start gap-1">
              ⚠ {w}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

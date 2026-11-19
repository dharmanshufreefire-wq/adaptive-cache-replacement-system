import { Play, Pause, RotateCcw, SkipForward, Zap } from 'lucide-react';
import type {
  AlgorithmName,
  SelectionMode,
  WorkloadAnalysis,
  WorkloadPresetId,
} from '../engine/types';
import {
  MAX_CACHE_CAPACITY,
  MIN_CACHE_CAPACITY,
  WORKLOAD_PRESETS,
} from '../engine/workloadAnalyzer';

interface ConfigPanelProps {
  capacity: number;
  capacityInput: string;
  capacityError: string | null;
  onCapacityChange: (nextVal: string) => void;
  sequenceText: string;
  sequenceError: string | null;
  onSequenceTextChange: (val: string) => void;
  activePreset: WorkloadPresetId;
  onSelectPreset: (presetId: Exclude<WorkloadPresetId, 'custom'>) => void;
  selectionMode: SelectionMode;
  onSelectionModeChange: (mode: SelectionMode) => void;
  speedMs: number;
  onSpeedChange: (ms: number) => void;
  analysis: WorkloadAnalysis;
  // Simulation playback state
  isRunning: boolean;
  isPaused: boolean;
  isComplete: boolean;
  hasStarted: boolean;
  currentStep: number;
  totalSteps: number;
  hasValidationError: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onNext: () => void;
  onReset: () => void;
  onRunFull: () => void;
}

const SELECTION_OPTIONS: Array<{ value: SelectionMode; label: string }> = [
  { value: 'AUTO', label: 'AUTO' },
  { value: 'FIFO', label: 'FIFO' },
  { value: 'LRU', label: 'LRU' },
  { value: 'LFU', label: 'LFU' },
  { value: 'ARC', label: 'ARC' },
];

export function ConfigPanel({
  capacity,
  capacityInput,
  capacityError,
  onCapacityChange,
  sequenceText,
  sequenceError,
  onSequenceTextChange,
  activePreset,
  onSelectPreset,
  selectionMode,
  onSelectionModeChange,
  speedMs,
  onSpeedChange,
  analysis,
  isRunning,
  isPaused,
  isComplete,
  hasStarted,
  currentStep,
  totalSteps,
  hasValidationError,
  onStart,
  onPause,
  onResume,
  onNext,
  onReset,
  onRunFull,
}: ConfigPanelProps) {
  const effectiveAlgorithm: AlgorithmName =
    selectionMode === 'AUTO' ? analysis.selectedAlgorithm : selectionMode;

  return (
    <section aria-label="Cache configuration and simulation controls" className="glass-panel rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/75 pb-3">
        <div>
          <h2 className="text-base font-semibold text-white">Cache Configuration & Controls</h2>
          <p className="text-xs text-slate-400">
            Configure cache size, workload sequence, policy mode, and playback speed.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-300 font-mono tabular-nums">
          <span>
            Request {currentStep} / {totalSteps}
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>
            Policy: <strong className="text-blue-300">{effectiveAlgorithm}</strong>
            {selectionMode === 'AUTO' ? ' (Auto)' : ' (Manual)'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left column: Capacity, Speed, Algorithm Selector */}
        <div className="space-y-4 lg:col-span-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="cache-capacity-range" className="text-xs font-medium text-slate-300">
                Cache Capacity ({MIN_CACHE_CAPACITY}–{MAX_CACHE_CAPACITY} blocks)
              </label>
              <input
                id="cache-capacity-number"
                type="number"
                min={MIN_CACHE_CAPACITY}
                max={MAX_CACHE_CAPACITY}
                value={capacityInput}
                onChange={(e) => onCapacityChange(e.target.value)}
                aria-label="Cache capacity value"
                className="w-16 rounded-lg border border-slate-700/80 bg-slate-900/90 px-2.5 py-1 text-right font-mono text-xs text-white focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
              />
            </div>
            <input
              id="cache-capacity-range"
              type="range"
              min={MIN_CACHE_CAPACITY}
              max={MAX_CACHE_CAPACITY}
              value={capacity}
              onChange={(e) => onCapacityChange(e.target.value)}
              className="w-full accent-blue-500 cursor-pointer"
            />
            {capacityError && (
              <p role="alert" className="mt-1.5 text-xs text-orange-400">
                {capacityError}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="sim-speed-range" className="text-xs font-medium text-slate-300">
                Simulation Speed
              </label>
              <span className="font-mono text-xs text-slate-300 tabular-nums">
                {speedMs} ms / step
              </span>
            </div>
            <input
              id="sim-speed-range"
              type="range"
              min={150}
              max={1500}
              step={50}
              value={speedMs}
              onChange={(e) => onSpeedChange(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <div className="mt-1 flex justify-between text-[11px] text-slate-500">
              <span>Fast (150ms)</span>
              <span>Balanced (750ms)</span>
              <span>Slow (1500ms)</span>
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-300 mb-2">
              Replacement Algorithm
            </span>
            <div
              role="group"
              aria-label="Replacement algorithm mode"
              className="grid grid-cols-5 gap-1.5 rounded-xl bg-slate-900/80 p-1 border border-slate-800/80"
            >
              {SELECTION_OPTIONS.map((opt) => {
                const active = selectionMode === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onSelectionModeChange(opt.value)}
                    aria-pressed={active}
                    className={`rounded-lg px-2 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                      active
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column: Workload Presets + Sequence Input */}
        <div className="space-y-4 lg:col-span-7">
          <div>
            <span className="block text-xs font-medium text-slate-300 mb-2">
              Workload Presets
            </span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {WORKLOAD_PRESETS.map((preset) => {
                const active = activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onSelectPreset(preset.id)}
                    aria-pressed={active}
                    className={`rounded-xl px-3 py-2 text-left transition-all border ${
                      active
                        ? 'border-blue-400/50 bg-blue-500/15 text-white'
                        : 'border-slate-800/80 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-semibold">{preset.name}</div>
                    <div className="mt-0.5 truncate font-mono text-[11px] text-slate-400">
                      {preset.sequence}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="access-sequence-input" className="text-xs font-medium text-slate-300">
                Data Access Sequence (comma or space separated)
              </label>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                {totalSteps} requests
              </span>
            </div>
            <textarea
              id="access-sequence-input"
              rows={2}
              value={sequenceText}
              onChange={(e) => onSequenceTextChange(e.target.value)}
              placeholder="e.g. A,B,C,A,B,C,D,A,B"
              className="w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2.5 font-mono text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            />
            {sequenceError && (
              <p role="alert" className="mt-1.5 text-xs text-orange-400">
                {sequenceError}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Simulation Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/75 pt-4">
        <div className="flex flex-wrap items-center gap-2.5">
          {!isRunning && !isPaused && (
            <button
              type="button"
              onClick={onStart}
              disabled={hasValidationError || totalSteps === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-950/40 transition-all hover:from-blue-500 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap"
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Start Simulation</span>
            </button>
          )}

          {isRunning && (
            <button
              type="button"
              onClick={onPause}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500/20 border border-amber-400/40 px-4 py-2 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-500/30 whitespace-nowrap"
            >
              <Pause className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Pause</span>
            </button>
          )}

          {!isRunning && isPaused && !isComplete && (
            <button
              type="button"
              onClick={onResume}
              disabled={hasValidationError}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:from-blue-500 hover:to-purple-500 whitespace-nowrap"
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Resume</span>
            </button>
          )}

          <button
            type="button"
            onClick={onNext}
            disabled={hasValidationError || isRunning || isComplete || totalSteps === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-800/70 px-3.5 py-2 text-xs font-medium text-slate-100 transition-colors hover:bg-slate-700/80 disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap"
          >
            <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Next Request</span>
          </button>

          <button
            type="button"
            onClick={onRunFull}
            disabled={hasValidationError || isRunning || totalSteps === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-3.5 py-2 text-xs font-semibold text-indigo-200 transition-colors hover:bg-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap"
          >
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Run Full Simulation</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            disabled={!hasStarted && currentStep === 0 && !isPaused}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/70 px-3.5 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reset</span>
          </button>
        </div>

        <div className="text-xs text-slate-400">
          {isRunning && 'Running step-by-step playback...'}
          {!isRunning && isPaused && !isComplete && 'Simulation paused — state preserved'}
          {isComplete && currentStep > 0 && 'Simulation complete'}
          {!isRunning && !isPaused && currentStep === 0 && 'Ready to simulate'}
        </div>
      </div>
    </section>
  );
}

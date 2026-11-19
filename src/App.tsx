import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Menu } from 'lucide-react';
import {
  compareAllAlgorithms,
  createInitialState,
  runFullSimulation,
  stepSimulation,
} from './engine/cacheEngine';
import {
  buildComparisonCsv,
  buildHistoryCsv,
  buildSummaryReportText,
  triggerBrowserDownload,
} from './engine/exportUtils';
import type {
  AlgorithmName,
  NavigationSection,
  SelectionMode,
  SimulationEngineState,
  WorkloadPresetId,
} from './engine/types';
import {
  WORKLOAD_PRESETS,
  analyzeWorkload,
  parseSequence,
  validateCapacity,
} from './engine/workloadAnalyzer';
import { AboutView } from './components/AboutView';
import { AnalyticsView } from './components/AnalyticsView';
import { ComparisonView } from './components/ComparisonView';
import { ConfigPanel } from './components/ConfigPanel';
import { LiveCacheVisualizer } from './components/LiveCacheVisualizer';
import { MetricsBar } from './components/MetricsBar';
import { Sidebar } from './components/Sidebar';
import { WorkloadAnalyzerView } from './components/WorkloadAnalyzerView';

const DEFAULT_PRESET = WORKLOAD_PRESETS[2]; // Locality preset

export default function App() {
  const [activeSection, setActiveSection] = useState<NavigationSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Configuration state
  const [capacity, setCapacity] = useState<number>(3);
  const [capacityInput, setCapacityInput] = useState<string>('3');
  const [capacityError, setCapacityError] = useState<string | null>(null);

  const [activePreset, setActivePreset] = useState<WorkloadPresetId>(DEFAULT_PRESET.id);
  const [sequenceText, setSequenceText] = useState<string>(DEFAULT_PRESET.sequence);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('AUTO');
  const [speedMs, setSpeedMs] = useState<number>(650);

  // Parse sequence with validation
  const parsedSequence = useMemo(() => parseSequence(sequenceText), [sequenceText]);
  const sequence = parsedSequence.items;
  const sequenceError = parsedSequence.error;
  const hasValidationError = Boolean(capacityError || sequenceError || sequence.length === 0);

  // Rule-based workload analysis
  const analysis = useMemo(
    () => analyzeWorkload(sequence, capacity),
    [sequence, capacity],
  );

  const effectiveAlgorithm: AlgorithmName =
    selectionMode === 'AUTO' ? analysis.selectedAlgorithm : selectionMode;

  // Simulation runtime state
  const [simState, setSimState] = useState<SimulationEngineState>(() =>
    createInitialState(effectiveAlgorithm, capacity, sequence),
  );
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const timerRef = useRef<number | null>(null);

  const clearPlaybackTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Reset simulation cleanly whenever configuration (algorithm, capacity, sequence) changes
  const resetSimulation = useCallback(
    (nextAlgo: AlgorithmName, nextCap: number, nextSeq: string[]) => {
      clearPlaybackTimer();
      setIsRunning(false);
      setIsPaused(false);
      setHasStarted(false);
      setSimState(createInitialState(nextAlgo, nextCap, nextSeq));
    },
    [clearPlaybackTimer],
  );

  const handleCapacityChange = (rawVal: string) => {
    setCapacityInput(rawVal);
    if (rawVal.trim() === '') {
      setCapacityError('Enter a cache capacity between 2 and 20.');
      return;
    }
    const num = Number(rawVal);
    const check = validateCapacity(num);
    if (!check.valid) {
      setCapacityError(check.error);
      return;
    }
    setCapacityError(null);
    setCapacity(num);
    const nextAnalysis = analyzeWorkload(sequence, num);
    const nextAlgo = selectionMode === 'AUTO' ? nextAnalysis.selectedAlgorithm : selectionMode;
    resetSimulation(nextAlgo, num, sequence);
  };

  const handleSequenceTextChange = (rawText: string) => {
    setSequenceText(rawText);
    setActivePreset('custom');
    const parsed = parseSequence(rawText);
    if (!parsed.error && parsed.items.length > 0) {
      const nextAnalysis = analyzeWorkload(parsed.items, capacity);
      const nextAlgo = selectionMode === 'AUTO' ? nextAnalysis.selectedAlgorithm : selectionMode;
      resetSimulation(nextAlgo, capacity, parsed.items);
    } else {
      clearPlaybackTimer();
      setIsRunning(false);
      setIsPaused(false);
      setHasStarted(false);
      setSimState(createInitialState(effectiveAlgorithm, capacity, []));
    }
  };

  const handleSelectPreset = (presetId: Exclude<WorkloadPresetId, 'custom'>) => {
    const found = WORKLOAD_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setActivePreset(presetId);
    setSequenceText(found.sequence);
    const parsed = parseSequence(found.sequence);
    const nextAnalysis = analyzeWorkload(parsed.items, capacity);
    const nextAlgo = selectionMode === 'AUTO' ? nextAnalysis.selectedAlgorithm : selectionMode;
    resetSimulation(nextAlgo, capacity, parsed.items);
  };

  const handleSelectionModeChange = (mode: SelectionMode) => {
    setSelectionMode(mode);
    const nextAlgo = mode === 'AUTO' ? analysis.selectedAlgorithm : mode;
    resetSimulation(nextAlgo, capacity, sequence);
  };

  // Playback loop effect when running
  useEffect(() => {
    if (!isRunning) {
      clearPlaybackTimer();
      return;
    }

    timerRef.current = window.setInterval(() => {
      setSimState((prev) => {
        if (prev.isComplete) {
          setIsRunning(false);
          setIsPaused(false);
          return prev;
        }
        const next = stepSimulation(prev);
        if (next.isComplete) {
          setIsRunning(false);
          setIsPaused(false);
        }
        return next;
      });
    }, speedMs);

    return () => {
      clearPlaybackTimer();
    };
  }, [isRunning, speedMs, clearPlaybackTimer]);

  const handleStart = () => {
    if (hasValidationError) return;
    if (simState.isComplete) {
      // Restart from step 0 if already finished
      setSimState(createInitialState(effectiveAlgorithm, capacity, sequence));
    }
    setHasStarted(true);
    setIsPaused(false);
    setIsRunning(true);
  };

  const handlePause = () => {
    clearPlaybackTimer();
    setIsRunning(false);
    setIsPaused(true);
  };

  const handleResume = () => {
    if (hasValidationError || simState.isComplete) return;
    setIsPaused(false);
    setIsRunning(true);
  };

  const handleNext = () => {
    if (hasValidationError || isRunning || simState.isComplete) return;
    setHasStarted(true);
    setIsPaused(true);
    setSimState((prev) => {
      const next = stepSimulation(prev);
      if (next.isComplete) {
        setIsPaused(false);
      }
      return next;
    });
  };

  const handleReset = () => {
    resetSimulation(effectiveAlgorithm, capacity, sequence);
  };

  const handleRunFull = () => {
    if (hasValidationError || isRunning) return;
    clearPlaybackTimer();
    setIsRunning(false);
    setIsPaused(false);
    setHasStarted(true);
    setSimState(runFullSimulation(effectiveAlgorithm, capacity, sequence));
  };

  // Multi-algorithm comparison computed dynamically on identical workload & capacity
  const comparison = useMemo(() => {
    if (hasValidationError) return [];
    return compareAllAlgorithms(capacity, sequence, analysis.selectedAlgorithm);
  }, [hasValidationError, capacity, sequence, analysis.selectedAlgorithm]);

  // Export handlers
  const handleExportComparisonCsv = () => {
    const csv = buildComparisonCsv(comparison);
    triggerBrowserDownload('acrs-algorithm-comparison.csv', csv, 'text/csv;charset=utf-8;');
  };

  const handleExportHistoryCsv = () => {
    const csv = buildHistoryCsv(simState);
    triggerBrowserDownload('acrs-execution-history.csv', csv, 'text/csv;charset=utf-8;');
  };

  const handleExportSummaryReport = () => {
    const txt = buildSummaryReportText({
      state: simState,
      analysis,
      comparison,
      selectionMode: selectionMode === 'AUTO' ? `AUTO (${analysis.selectedAlgorithm})` : selectionMode,
    });
    triggerBrowserDownload('acrs-summary-report.txt', txt, 'text/plain;charset=utf-8;');
  };

  const configProps = {
    capacity,
    capacityInput,
    capacityError,
    onCapacityChange: handleCapacityChange,
    sequenceText,
    sequenceError,
    onSequenceTextChange: handleSequenceTextChange,
    activePreset,
    onSelectPreset: handleSelectPreset,
    selectionMode,
    onSelectionModeChange: handleSelectionModeChange,
    speedMs,
    onSpeedChange: setSpeedMs,
    analysis,
    isRunning,
    isPaused,
    isComplete: simState.isComplete,
    hasStarted,
    currentStep: simState.stepIndex,
    totalSteps: sequence.length,
    hasValidationError,
    onStart: handleStart,
    onPause: handlePause,
    onResume: handleResume,
    onNext: handleNext,
    onReset: handleReset,
    onRunFull: handleRunFull,
  };

  return (
    <div className="flex min-h-screen bg-[#060a16] text-slate-100">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        activeAlgorithm={effectiveAlgorithm}
        selectionMode={selectionMode}
        capacity={capacity}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 border-b border-slate-800/75 bg-[#060a16]/85 px-4 py-4 backdrop-blur-xl sm:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open navigation menu"
                className="rounded-lg border border-slate-800 bg-slate-900/70 p-2 text-slate-300 hover:text-white lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-base font-bold leading-tight tracking-tight text-white sm:text-2xl">
                  Adaptive Cache Replacement System
                </h1>
                <p className="text-xs leading-snug text-slate-400 sm:text-sm">
                  Intelligent Memory Management and Dynamic Workload Optimization
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-4 text-xs text-slate-400 shrink-0 font-mono">
              <span>
                Active: <strong className="text-blue-300">{effectiveAlgorithm}</strong>
              </span>
              <span aria-hidden="true" className="text-slate-700">·</span>
              <span>
                Capacity: <strong className="text-slate-200">{capacity}</strong>
              </span>
            </div>
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-8">
          {activeSection === 'dashboard' && (
            <>
              <MetricsBar metrics={simState.metrics} />
              <ConfigPanel {...configProps} />
              <LiveCacheVisualizer state={simState} />
              <WorkloadAnalyzerView analysis={analysis} capacity={capacity} compact />
            </>
          )}

          {activeSection === 'simulator' && (
            <>
              <MetricsBar metrics={simState.metrics} />
              <ConfigPanel {...configProps} />
              <LiveCacheVisualizer state={simState} />
            </>
          )}

          {activeSection === 'comparison' && (
            <ComparisonView
              comparison={comparison}
              analysis={analysis}
              capacity={capacity}
              sequenceLength={sequence.length}
              onExportComparisonCsv={handleExportComparisonCsv}
              onExportSummaryReport={handleExportSummaryReport}
            />
          )}

          {activeSection === 'analyzer' && (
            <WorkloadAnalyzerView analysis={analysis} capacity={capacity} />
          )}

          {activeSection === 'analytics' && (
            <AnalyticsView
              state={simState}
              comparison={comparison}
              analysis={analysis}
              onRunFull={handleRunFull}
              onExportComparisonCsv={handleExportComparisonCsv}
              onExportHistoryCsv={handleExportHistoryCsv}
              onExportSummaryReport={handleExportSummaryReport}
            />
          )}

          {activeSection === 'about' && <AboutView />}
        </main>
      </div>
    </div>
  );
}

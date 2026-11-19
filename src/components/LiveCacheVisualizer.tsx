import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react';
import type { SimulationEngineState } from '../engine/types';

interface LiveCacheVisualizerProps {
  state: SimulationEngineState;
}

export function LiveCacheVisualizer({ state }: LiveCacheVisualizerProps) {
  const { blocks, capacity, lastStep, sequence, stepIndex, algorithm } = state;
  const emptySlots = Math.max(0, capacity - blocks.length);

  return (
    <section aria-label="Live cache memory visualization" className="glass-panel rounded-2xl p-5 sm:p-6 space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/75 pb-4">
        <div>
          <h2 className="text-base font-semibold text-white">Live Cache Memory Blocks</h2>
          <p className="text-xs text-slate-400">
            Animated block residency, access frequency, recency metadata, and eviction tracking.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-300 font-mono tabular-nums">
          <span>
            Occupancy: <strong className="text-white">{blocks.length}</strong> / {capacity}
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>
            Utilization: <strong className="text-blue-300">{state.metrics.utilizationPercent.toFixed(0)}%</strong>
          </span>
        </div>
      </div>

      {/* Request stream ribbon */}
      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
          <span>Access Sequence Stream</span>
          <span className="font-mono tabular-nums">
            {stepIndex} of {sequence.length} processed
          </span>
        </div>
        {sequence.length === 0 ? (
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 px-4 py-3 text-xs text-slate-400">
            Enter a valid access sequence above to visualize requests.
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5" role="list" aria-label="Request sequence items">
            {sequence.map((item, idx) => {
              const stepRec = state.history[idx];
              const isCurrent = idx === stepIndex - 1;
              const isNext = idx === stepIndex;
              let itemStyle =
                'border-slate-800/90 bg-slate-900/60 text-slate-400';

              if (stepRec) {
                if (isCurrent) {
                  itemStyle =
                    stepRec.outcome === 'HIT'
                      ? 'border-emerald-400 bg-emerald-500/25 text-emerald-200 ring-2 ring-emerald-400/40'
                      : 'border-orange-400 bg-orange-500/25 text-orange-200 ring-2 ring-orange-400/40';
                } else {
                  itemStyle =
                    stepRec.outcome === 'HIT'
                      ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
                      : 'border-orange-500/35 bg-orange-500/10 text-orange-300';
                }
              } else if (isNext) {
                itemStyle = 'border-blue-400/60 bg-blue-500/15 text-blue-200';
              }

              return (
                <div
                  key={`${idx}-${item}`}
                  role="listitem"
                  title={`Step ${idx + 1}: ${item}${stepRec ? ` (${stepRec.outcome})` : isNext ? ' (Next)' : ''}`}
                  className={`flex h-8 min-w-[2.1rem] items-center justify-center rounded-lg border px-2 font-mono text-xs font-semibold transition-all duration-150 ${itemStyle}`}
                >
                  {item}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Latest Step Outcome & Eviction Banner */}
      {lastStep ? (
        <div
          className={`flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between transition-colors duration-200 ${
            lastStep.outcome === 'HIT'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
              : 'border-orange-500/40 bg-orange-500/10 text-orange-100'
          }`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            {lastStep.outcome === 'HIT' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" aria-hidden="true" />
            )}
            <div className="text-xs leading-relaxed">
              <span className="font-mono font-bold mr-2">
                Step {lastStep.stepNumber} · {lastStep.outcome} ({lastStep.requestId})
              </span>
              <span className="text-slate-200">{lastStep.actionSummary}</span>
            </div>
          </div>

          {lastStep.evictedId && (
            <div className="flex items-center gap-2 rounded-lg border border-orange-400/35 bg-slate-950/50 px-3 py-1.5 text-xs text-orange-200 shrink-0">
              <Trash2 className="h-3.5 w-3.5 text-orange-400" aria-hidden="true" />
              <span className="font-mono font-semibold">Evicted: {lastStep.evictedId}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 px-4 py-3 text-xs text-slate-400">
          Cache is currently empty. Press <strong className="text-slate-200">Start Simulation</strong>,{' '}
          <strong className="text-slate-200">Next Request</strong>, or{' '}
          <strong className="text-slate-200">Run Full Simulation</strong> to begin.
        </div>
      )}

      {/* Animated Cache Blocks Grid */}
      <div
        data-testid="cache-blocks-grid"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5"
      >
        <AnimatePresence mode="popLayout">
          {blocks.map((block) => {
            const isActiveTarget = lastStep?.requestId === block.id;
            const isHit = isActiveTarget && lastStep?.outcome === 'HIT';
            const isMissInsert = isActiveTarget && lastStep?.outcome === 'MISS';

            let borderAndBg = 'border-slate-700/60 bg-slate-900/75';
            let statusText = '';
            let statusColor = 'text-slate-400';

            if (isHit) {
              borderAndBg =
                'border-emerald-400/80 bg-emerald-950/45 shadow-lg shadow-emerald-950/40';
              statusText = 'HIT';
              statusColor = 'text-emerald-300';
            } else if (isMissInsert) {
              borderAndBg =
                'border-orange-400/80 bg-orange-950/40 shadow-lg shadow-orange-950/40';
              statusText = 'MISS · INSERTED';
              statusColor = 'text-orange-300';
            }

            return (
              <motion.div
                key={block.id}
                layout
                initial={{ opacity: 0, scale: 0.86, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.82, y: 12 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className={`rounded-xl border p-3.5 transition-colors ${borderAndBg}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                    Slot {block.position}
                  </span>
                  {statusText ? (
                    <span className={`font-mono text-[11px] font-bold ${statusColor}`}>
                      {statusText}
                    </span>
                  ) : (
                    <span className="font-mono text-[11px] text-slate-400">
                      {block.segment}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-baseline justify-between">
                  <span className="font-mono text-2xl font-bold text-white">{block.id}</span>
                  <span className="font-mono text-xs text-blue-300 tabular-nums">
                    Freq: {block.frequency}
                  </span>
                </div>

                <div className="mt-2.5 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[11px] text-slate-400 font-mono tabular-nums">
                  <span>In: #{block.insertedStep}</span>
                  <span>Last: #{block.lastAccessStep}</span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty free slots */}
        {Array.from({ length: emptySlots }).map((_, idx) => (
          <div
            key={`empty-${idx}`}
            className="flex min-h-[112px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-800/90 bg-slate-950/35 p-3 text-center"
          >
            <span className="font-mono text-[11px] text-slate-500">
              Slot {blocks.length + idx + 1}
            </span>
            <span className="mt-1 text-xs text-slate-600">Empty</span>
          </div>
        ))}
      </div>

      {/* Evicted Block Callout */}
      <AnimatePresence>
        {lastStep?.evictedId && (
          <motion.div
            key={`evict-${lastStep.stepNumber}-${lastStep.evictedId}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-orange-500/30 bg-slate-900/70 px-4 py-3 text-xs"
          >
            <span className="font-mono font-semibold text-orange-300">
              Removed Block: {lastStep.evictedId}
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            <span className="text-slate-300">{lastStep.evictionReason}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ARC Ghost Lists & Adaptive Parameter p */}
      {algorithm === 'ARC' && (
        <div className="border-t border-slate-800/75 pt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-slate-200">
              ARC Internal Lists & Adaptive Parameter (p)
            </h3>
            <div className="font-mono text-xs text-purple-300 tabular-nums">
              Target p = {state.internal.p} / {capacity} (T1 target size)
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="glass-subsurface rounded-xl p-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-blue-300">T1 (Recent Resident)</span>
                <span className="font-mono text-slate-400 tabular-nums">
                  {state.internal.t1.length}
                </span>
              </div>
              <div className="font-mono text-xs text-slate-200">
                {state.internal.t1.length > 0 ? state.internal.t1.join(' → ') : 'Empty'}
              </div>
            </div>

            <div className="glass-subsurface rounded-xl p-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-purple-300">T2 (Frequent Resident)</span>
                <span className="font-mono text-slate-400 tabular-nums">
                  {state.internal.t2.length}
                </span>
              </div>
              <div className="font-mono text-xs text-slate-200">
                {state.internal.t2.length > 0 ? state.internal.t2.join(' → ') : 'Empty'}
              </div>
            </div>

            <div className="glass-subsurface rounded-xl p-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-300">B1 (Recent Ghost)</span>
                <span className="font-mono text-slate-400 tabular-nums">
                  {state.internal.b1.length}
                </span>
              </div>
              <div className="font-mono text-xs text-slate-400">
                {state.internal.b1.length > 0 ? state.internal.b1.join(' → ') : 'Empty'}
              </div>
            </div>

            <div className="glass-subsurface rounded-xl p-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-300">B2 (Frequent Ghost)</span>
                <span className="font-mono text-slate-400 tabular-nums">
                  {state.internal.b2.length}
                </span>
              </div>
              <div className="font-mono text-xs text-slate-400">
                {state.internal.b2.length > 0 ? state.internal.b2.join(' → ') : 'Empty'}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, Sparkles } from 'lucide-react';
import type { AlgorithmComparisonRow, WorkloadAnalysis } from '../engine/types';

interface ComparisonViewProps {
  comparison: AlgorithmComparisonRow[];
  analysis: WorkloadAnalysis;
  capacity: number;
  sequenceLength: number;
  onExportComparisonCsv: () => void;
  onExportSummaryReport: () => void;
}

export function ComparisonView({
  comparison,
  analysis,
  capacity,
  sequenceLength,
  onExportComparisonCsv,
  onExportSummaryReport,
}: ComparisonViewProps) {
  const bestHitRatio = Math.max(...comparison.map((c) => c.hitRatio), 0);

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/75 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Algorithm Performance Comparison</h2>
            <p className="text-xs text-slate-400">
              Identical workload ({sequenceLength} requests) and cache capacity ({capacity} blocks) executed across FIFO, LRU, LFU, and ARC.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onExportComparisonCsv}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-800/70 px-3.5 py-2 text-xs font-medium text-slate-100 hover:bg-slate-700/80 transition-colors whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Download Comparison CSV</span>
            </button>
            <button
              type="button"
              onClick={onExportSummaryReport}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-3.5 py-2 text-xs font-semibold text-white hover:from-blue-500 hover:to-purple-500 transition-all whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Summary Report</span>
            </button>
          </div>
        </div>

        {/* Auto Selection Callout */}
        <div className="flex flex-col gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" aria-hidden="true" />
            <div className="text-xs leading-relaxed text-slate-200">
              <strong className="text-white">AUTO Workload Selection: {analysis.selectedAlgorithm}</strong>
              <span className="mx-2 text-slate-500">·</span>
              <span>Detected: {analysis.detectedWorkloadType}</span>
              <p className="mt-0.5 text-slate-300">{analysis.reason}</p>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400">
                <th className="py-3 pr-4">Algorithm</th>
                <th className="py-3 px-3 text-right">Cache Hits</th>
                <th className="py-3 px-3 text-right">Cache Misses</th>
                <th className="py-3 px-3 text-right">Hit Ratio</th>
                <th className="py-3 px-3 text-right">Miss Ratio</th>
                <th className="py-3 px-3 text-right">Evictions</th>
                <th className="py-3 pl-3 text-right">Execution Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-sm">
              {comparison.map((row) => {
                const isTopHit = row.hitRatio === bestHitRatio && bestHitRatio > 0;
                return (
                  <tr
                    key={row.algorithm}
                    className={`transition-colors hover:bg-slate-800/35 ${
                      row.isAutoSelected ? 'bg-blue-500/10' : ''
                    }`}
                  >
                    <td className="py-3 pr-4 font-mono font-semibold text-white">
                      <span>{row.algorithm}</span>
                      {row.isAutoSelected && (
                        <span className="ml-2 text-xs font-sans font-medium text-blue-300">
                          · Auto Selected
                        </span>
                      )}
                      {isTopHit && (
                        <span className="ml-2 text-xs font-sans font-medium text-emerald-300">
                          · Best Hit Ratio
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-300">
                      {row.hits}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-orange-300">
                      {row.misses}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-blue-300">
                      {row.hitRatio.toFixed(2)}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-purple-300">
                      {row.missRatio.toFixed(2)}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-200">
                      {row.evictions}
                    </td>
                    <td className="py-3 pl-3 text-right font-mono tabular-nums text-slate-300">
                      {row.executionTimeMs.toFixed(3)} ms
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Comparison Charts */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="glass-panel rounded-2xl p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-white mb-1">Hits vs. Misses by Algorithm</h3>
          <p className="text-xs text-slate-400 mb-4">
            Direct count comparison across all four cache replacement policies.
          </p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparison} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="algorithm" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} width={44} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0b1224',
                    borderColor: 'rgba(148,163,184,0.25)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#f1f5f9',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="hits" name="Cache Hits" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="misses" name="Cache Misses" fill="#f97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="glass-panel rounded-2xl p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-white mb-1">Hit Ratio & Miss Ratio (%)</h3>
          <p className="text-xs text-slate-400 mb-4">
            Percentage efficiency computed from actual simulation outcomes.
          </p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparison} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="algorithm" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} width={52} domain={[0, 100]} unit="%" />
                <Tooltip
                  formatter={(value) => `${Number(value ?? 0).toFixed(2)}%`}
                  contentStyle={{
                    backgroundColor: '#0b1224',
                    borderColor: 'rgba(148,163,184,0.25)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#f1f5f9',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="hitRatio" name="Hit Ratio (%)" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="missRatio" name="Miss Ratio (%)" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="glass-panel rounded-2xl p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-white mb-1">Execution Time Benchmark (ms)</h3>
        <p className="text-xs text-slate-400 mb-4">
          Measured browser execution duration per algorithm for the active request stream.
        </p>
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparison} margin={{ top: 10, right: 16, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
              <XAxis dataKey="algorithm" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} width={76} unit=" ms" />
              <Tooltip
                formatter={(value) => `${Number(value ?? 0).toFixed(4)} ms`}
                contentStyle={{
                  backgroundColor: '#0b1224',
                  borderColor: 'rgba(148,163,184,0.25)',
                  borderRadius: '10px',
                  fontSize: '12px',
                  color: '#f1f5f9',
                }}
              />
              <Bar dataKey="executionTimeMs" name="Execution Time (ms)" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

import { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, Zap } from 'lucide-react';
import type {
  AlgorithmComparisonRow,
  SimulationEngineState,
  WorkloadAnalysis,
} from '../engine/types';

interface AnalyticsViewProps {
  state: SimulationEngineState;
  comparison: AlgorithmComparisonRow[];
  analysis: WorkloadAnalysis;
  onRunFull: () => void;
  onExportComparisonCsv: () => void;
  onExportHistoryCsv: () => void;
  onExportSummaryReport: () => void;
}

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];

export function AnalyticsView({
  state,
  comparison,
  analysis,
  onRunFull,
  onExportComparisonCsv,
  onExportHistoryCsv,
  onExportSummaryReport,
}: AnalyticsViewProps) {
  const [outcomeFilter, setOutcomeFilter] = useState<'ALL' | 'HIT' | 'MISS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHistory = state.history.filter((step) => {
    if (outcomeFilter !== 'ALL' && step.outcome !== outcomeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toUpperCase();
      return (
        step.requestId.toUpperCase().includes(q) ||
        (step.evictedId && step.evictedId.toUpperCase().includes(q))
      );
    }
    return true;
  });

  const utilizationPct = state.metrics.utilizationPercent;

  return (
    <div className="space-y-6">
      {/* Header & Export Toolbar */}
      <section className="glass-panel rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Performance Analytics & Export</h2>
            <p className="text-xs text-slate-400">
              Detailed hit/miss efficiency, cache utilization, workload distribution, and step-by-step telemetry.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onExportComparisonCsv}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-800/70 px-3.5 py-2 text-xs font-medium text-slate-100 hover:bg-slate-700/80 transition-colors whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>CSV Comparison</span>
            </button>
            <button
              type="button"
              onClick={onExportHistoryCsv}
              disabled={state.history.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-800/70 px-3.5 py-2 text-xs font-medium text-slate-100 hover:bg-slate-700/80 disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>CSV Execution History</span>
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
      </section>

      {/* Cache Utilization Indicator */}
      <section className="glass-panel rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Cache Utilization Indicator</h3>
            <p className="text-xs text-slate-400">
              Active memory slots occupied ({state.blocks.length} of {state.capacity} blocks) for {state.algorithm}.
            </p>
          </div>
          <div className="font-mono text-2xl font-bold text-blue-300 tabular-nums">
            {utilizationPct.toFixed(1)}%
          </div>
        </div>

        <div className="h-3.5 w-full overflow-hidden rounded-full bg-slate-800/90 border border-slate-700/60">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, utilizationPct))}%` }}
          />
        </div>

        {state.history.length > 0 && (
          <div className="h-48 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={state.history}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="hitRatioGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="utilGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="stepNumber" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} unit="%" />
                <Tooltip
                  formatter={(value) => `${Number(value ?? 0).toFixed(1)}%`}
                  contentStyle={{
                    backgroundColor: '#0b1224',
                    borderColor: 'rgba(148,163,184,0.25)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#f1f5f9',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area
                  type="monotone"
                  dataKey="runningHitRatio"
                  name="Cumulative Hit Ratio (%)"
                  stroke="#3b82f6"
                  fill="url(#hitRatioGrad)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="cacheUtilization"
                  name="Cache Utilization (%)"
                  stroke="#8b5cf6"
                  fill="url(#utilGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Hit Ratio Bar Chart, Miss Ratio Comparison Chart, Workload Distribution Chart */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="glass-panel rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Hit Ratio Comparison</h3>
          <p className="text-xs text-slate-400 mb-4">Hit percentage across algorithms</p>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparison} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="algorithm" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} unit="%" />
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
                <Bar dataKey="hitRatio" name="Hit Ratio (%)" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="glass-panel rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Miss Ratio Comparison</h3>
          <p className="text-xs text-slate-400 mb-4">Miss percentage across algorithms</p>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparison} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="algorithm" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} unit="%" />
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
                <Bar dataKey="missRatio" name="Miss Ratio (%)" fill="#f97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="glass-panel rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Workload Distribution</h3>
          <p className="text-xs text-slate-400 mb-4">Request share by data identifier</p>
          <div className="h-60 w-full">
            {analysis.statistics.itemFrequencies.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analysis.statistics.itemFrequencies}
                    dataKey="count"
                    nameKey="id"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={78}
                    paddingAngle={3}
                  >
                    {analysis.statistics.itemFrequencies.map((entry, index) => (
                      <Cell key={entry.id} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value ?? 0} accesses`, `Key ${String(name ?? '')}`]}
                    contentStyle={{
                      backgroundColor: '#0b1224',
                      borderColor: 'rgba(148,163,184,0.25)',
                      borderRadius: '10px',
                      fontSize: '12px',
                      color: '#f1f5f9',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-500">
                No workload requests loaded
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Request-by-Request History Table */}
      <section className="glass-panel rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/75 pb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Request-by-Request Execution History</h3>
            <p className="text-xs text-slate-400">
              Complete audit log of every cache lookup, eviction decision, and running hit ratio.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter key (e.g. A)"
              aria-label="Filter execution history by data identifier"
              className="w-36 rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />
            <div className="flex items-center gap-1 rounded-lg bg-slate-900/80 p-1 border border-slate-800">
              {(['ALL', 'HIT', 'MISS'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setOutcomeFilter(f)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    outcomeFilter === f
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {state.history.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-800/80 bg-slate-900/40 py-10 text-center">
            <p className="text-sm text-slate-300">
              No simulation steps recorded yet for the active run.
            </p>
            <button
              type="button"
              onClick={onRunFull}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-xs font-semibold text-white hover:from-blue-500 hover:to-purple-500"
            >
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Run Full Simulation Now</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0b1328] z-10">
                <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400">
                  <th className="py-2.5 pr-3">Step</th>
                  <th className="py-2.5 px-3">Request</th>
                  <th className="py-2.5 px-3">Outcome</th>
                  <th className="py-2.5 px-3">Evicted</th>
                  <th className="py-2.5 px-3">Resident Cache</th>
                  <th className="py-2.5 px-3 text-right">Hit Ratio</th>
                  <th className="py-2.5 pl-3 text-right">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredHistory.map((step) => (
                  <tr key={step.stepNumber} className="hover:bg-slate-800/35">
                    <td className="py-2.5 pr-3 font-mono tabular-nums text-slate-400">
                      #{step.stepNumber}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-white">
                      {step.requestId}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold">
                      <span
                        className={
                          step.outcome === 'HIT' ? 'text-emerald-400' : 'text-orange-400'
                        }
                      >
                        {step.outcome}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      {step.evictedId ? (
                        <span className="text-orange-300" title={step.evictionReason ?? ''}>
                          {step.evictedId}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      {step.blocksSnapshot.map((b) => b.id).join(', ')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-blue-300">
                      {step.runningHitRatio.toFixed(1)}%
                    </td>
                    <td className="py-2.5 pl-3 text-right font-mono tabular-nums text-purple-300">
                      {step.cacheUtilization.toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

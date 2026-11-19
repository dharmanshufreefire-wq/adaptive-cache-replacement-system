import { CheckCircle2, Circle, Cpu } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { WorkloadAnalysis } from '../engine/types';

interface WorkloadAnalyzerViewProps {
  analysis: WorkloadAnalysis;
  capacity: number;
  compact?: boolean;
}

export function WorkloadAnalyzerView({
  analysis,
  capacity,
  compact = false,
}: WorkloadAnalyzerViewProps) {
  const { statistics } = analysis;

  const metricBars = [
    {
      label: 'Unique Data Ratio',
      value: statistics.uniqueDataRatio * 100,
      detail: `${statistics.uniqueItems} unique / ${statistics.totalRequests} requests`,
      color: 'from-blue-500 to-cyan-400',
    },
    {
      label: 'Repeated Access Frequency',
      value: statistics.repeatedAccessFrequency * 100,
      detail: 'Share of repeat accesses in stream',
      color: 'from-indigo-500 to-blue-400',
    },
    {
      label: 'Temporal Locality',
      value: statistics.temporalLocality * 100,
      detail: `Reuse closeness relative to capacity (${capacity})`,
      color: 'from-purple-500 to-indigo-400',
    },
    {
      label: 'Frequency Concentration',
      value: statistics.frequencyConcentration * 100,
      detail: 'Hot-key dominance share',
      color: 'from-violet-500 to-purple-400',
    },
    {
      label: 'Sequential Access Pattern',
      value: statistics.sequentialPatternScore * 100,
      detail: 'Linear / non-repeating transition rate',
      color: 'from-sky-500 to-blue-500',
    },
  ];

  return (
    <div className="space-y-6">
      <section aria-label="Rule-based workload analysis" className="glass-panel rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/75 pb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Workload Analyzer & Auto Selection</h2>
            <p className="text-xs text-slate-400">
              Transparent rule-based classification computed directly from the active access sequence.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-blue-400/35 bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-3.5 py-2">
              <Cpu className="h-4 w-4 text-blue-300" aria-hidden="true" />
              <div className="text-xs">
                <span className="text-slate-400 mr-1.5">Selected:</span>
                <strong className="font-mono text-sm text-white">{analysis.selectedAlgorithm}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Banner */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="glass-subsurface rounded-xl p-4">
            <div className="text-xs text-slate-400">Detected Workload Type</div>
            <div className="mt-1 text-base font-semibold text-white">
              {analysis.detectedWorkloadType}
            </div>
          </div>
          <div className="glass-subsurface rounded-xl p-4">
            <div className="text-xs text-slate-400">Selected Algorithm</div>
            <div className="mt-1 font-mono text-base font-bold text-blue-300">
              {analysis.selectedAlgorithm}
            </div>
          </div>
          <div className="glass-subsurface rounded-xl p-4 md:col-span-1">
            <div className="text-xs text-slate-400">Sequence Size</div>
            <div className="mt-1 font-mono text-base font-semibold text-slate-100 tabular-nums">
              {statistics.totalRequests} requests · {statistics.uniqueItems} unique
            </div>
          </div>
        </div>

        <div className="glass-subsurface rounded-xl p-4">
          <div className="text-xs font-medium text-slate-400 mb-1">Selection Reasoning</div>
          <p className="text-sm leading-relaxed text-slate-200">{analysis.reason}</p>
        </div>

        {/* 5 Monitored Metrics */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {metricBars.map((metric) => (
            <div key={metric.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-200">{metric.label}</span>
                <span className="font-mono font-semibold text-slate-100 tabular-nums">
                  {metric.value.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800/90">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${metric.color} transition-all duration-300`}
                  style={{ width: `${Math.min(100, Math.max(0, metric.value))}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-400">{metric.detail}</div>
            </div>
          ))}
        </div>

        {/* Transparent Rule Evaluation Matrix */}
        {!compact && (
          <div className="border-t border-slate-800/75 pt-4">
            <h3 className="text-sm font-semibold text-white mb-3">
              Rule-Based Decision Engine Evaluation
            </h3>
            <div className="divide-y divide-slate-800/70 rounded-xl border border-slate-800/80 bg-slate-900/45">
              {analysis.evaluatedRules.map((rule) => (
                <div
                  key={rule.ruleName}
                  className={`flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                    rule.matched ? 'bg-blue-500/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {rule.matched ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-400" aria-hidden="true" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-slate-600" aria-hidden="true" />
                    )}
                    <span
                      className={`text-xs font-semibold ${
                        rule.matched ? 'text-white' : 'text-slate-400'
                      }`}
                    >
                      {rule.ruleName}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">
                    {rule.thresholdDescription}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {!compact && statistics.itemFrequencies.length > 0 && (
        <section className="glass-panel rounded-2xl p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-white mb-1">Request Identifier Frequency</h3>
          <p className="text-xs text-slate-400 mb-4">
            Distribution of access counts per unique data identifier in the current workload.
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={statistics.itemFrequencies}
                margin={{ top: 10, right: 16, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="id" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0b1224',
                    borderColor: 'rgba(148,163,184,0.25)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#f1f5f9',
                  }}
                />
                <Bar dataKey="count" name="Access Count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
}

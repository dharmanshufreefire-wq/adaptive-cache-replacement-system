import type { SimulationMetrics } from '../engine/types';

interface MetricsBarProps {
  metrics: SimulationMetrics;
}

export function MetricsBar({ metrics }: MetricsBarProps) {
  const items = [
    {
      label: 'Total Requests',
      value: `${metrics.completedRequests} / ${metrics.totalRequests}`,
      sub: 'Processed / Total',
      accent: 'text-slate-100',
    },
    {
      label: 'Cache Hits',
      value: String(metrics.hits),
      sub: 'Served from cache',
      accent: 'text-emerald-400',
    },
    {
      label: 'Cache Misses',
      value: String(metrics.misses),
      sub: 'Loaded from backing store',
      accent: 'text-orange-400',
    },
    {
      label: 'Hit Ratio',
      value: `${metrics.hitRatio.toFixed(1)}%`,
      sub: 'Hits / Total x 100',
      accent: 'text-blue-400',
    },
    {
      label: 'Miss Ratio',
      value: `${metrics.missRatio.toFixed(1)}%`,
      sub: 'Misses / Total x 100',
      accent: 'text-purple-400',
    },
    {
      label: 'Eviction Count',
      value: String(metrics.evictions),
      sub: 'Blocks replaced',
      accent: 'text-slate-100',
    },
    {
      label: 'Execution Time',
      value: `${metrics.executionTimeMs.toFixed(3)} ms`,
      sub: 'Browser compute',
      accent: 'text-indigo-300',
    },
  ];

  return (
    <section aria-label="Live performance metrics" className="glass-panel rounded-2xl p-4 sm:p-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex flex-col justify-between border-b border-slate-800/70 pb-2.5 xl:border-b-0 xl:border-r xl:pb-0 xl:pr-4 last:border-0 last:pb-0 last:pr-0"
          >
            <span className="text-xs font-medium text-slate-400">{item.label}</span>
            <span className={`mt-1 font-mono text-lg sm:text-xl font-bold tabular-nums ${item.accent}`}>
              {item.value}
            </span>
            <span className="mt-0.5 text-[11px] text-slate-500">{item.sub}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

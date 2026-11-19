import type {
  AlgorithmComparisonRow,
  SimulationEngineState,
  WorkloadAnalysis,
} from './types';

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildComparisonCsv(rows: AlgorithmComparisonRow[]): string {
  const headers = [
    'Algorithm',
    'Auto Selected',
    'Cache Hits',
    'Cache Misses',
    'Hit Ratio (%)',
    'Miss Ratio (%)',
    'Evictions',
    'Execution Time (ms)',
  ];
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(
      [
        row.algorithm,
        row.isAutoSelected ? 'Yes' : 'No',
        row.hits,
        row.misses,
        row.hitRatio.toFixed(2),
        row.missRatio.toFixed(2),
        row.evictions,
        row.executionTimeMs.toFixed(4),
      ]
        .map(escapeCsvCell)
        .join(','),
    );
  }
  return lines.join('\n');
}

export function buildHistoryCsv(state: SimulationEngineState): string {
  const headers = [
    'Step',
    'Request',
    'Outcome',
    'Evicted Block',
    'Eviction Reason',
    'Occupied Slots',
    'Capacity',
    'Cache Utilization (%)',
    'Running Hit Ratio (%)',
    'Running Miss Ratio (%)',
    'Step Execution Time (ms)',
  ];
  const lines = [headers.join(',')];
  for (const step of state.history) {
    lines.push(
      [
        step.stepNumber,
        step.requestId,
        step.outcome,
        step.evictedId ?? '',
        step.evictionReason ?? '',
        step.occupiedSlots,
        step.capacity,
        step.cacheUtilization.toFixed(2),
        step.runningHitRatio.toFixed(2),
        step.runningMissRatio.toFixed(2),
        step.stepExecutionMs.toFixed(4),
      ]
        .map(escapeCsvCell)
        .join(','),
    );
  }
  return lines.join('\n');
}

export function buildSummaryReportText(params: {
  state: SimulationEngineState;
  analysis: WorkloadAnalysis;
  comparison: AlgorithmComparisonRow[];
  selectionMode: string;
}): string {
  const { state, analysis, comparison, selectionMode } = params;
  const lines: string[] = [
    'ADAPTIVE CACHE REPLACEMENT SYSTEM (ACRS) - SIMULATION SUMMARY REPORT',
    '====================================================================',
    `Generated: ${new Date().toISOString()}`,
    '',
    '1. CONFIGURATION',
    `   Selection Mode: ${selectionMode}`,
    `   Active Algorithm: ${state.algorithm}`,
    `   Cache Capacity: ${state.capacity} blocks`,
    `   Access Sequence (${state.sequence.length} requests): ${state.sequence.join(', ')}`,
    '',
    '2. WORKLOAD ANALYSIS',
    `   Detected Workload Type: ${analysis.detectedWorkloadType}`,
    `   Recommended Algorithm: ${analysis.selectedAlgorithm}`,
    `   Reasoning: ${analysis.reason}`,
    `   Unique Data Ratio: ${(analysis.statistics.uniqueDataRatio * 100).toFixed(2)}%`,
    `   Repeated Access Frequency: ${(analysis.statistics.repeatedAccessFrequency * 100).toFixed(2)}%`,
    `   Temporal Locality Score: ${(analysis.statistics.temporalLocality * 100).toFixed(2)}%`,
    `   Frequency Concentration: ${(analysis.statistics.frequencyConcentration * 100).toFixed(2)}%`,
    `   Sequential Pattern Score: ${(analysis.statistics.sequentialPatternScore * 100).toFixed(2)}%`,
    '',
    '3. ACTIVE SIMULATION METRICS',
    `   Completed Requests: ${state.metrics.completedRequests} / ${state.metrics.totalRequests}`,
    `   Cache Hits: ${state.metrics.hits}`,
    `   Cache Misses: ${state.metrics.misses}`,
    `   Hit Ratio: ${state.metrics.hitRatio.toFixed(2)}%`,
    `   Miss Ratio: ${state.metrics.missRatio.toFixed(2)}%`,
    `   Eviction Count: ${state.metrics.evictions}`,
    `   Execution Time: ${state.metrics.executionTimeMs.toFixed(4)} ms`,
    '',
    '4. ALGORITHM COMPARISON BENCHMARK (SAME WORKLOAD & CAPACITY)',
    '   Algorithm | Hits | Misses | Hit Ratio | Miss Ratio | Evictions | Exec Time (ms)',
  ];

  for (const row of comparison) {
    lines.push(
      `   ${row.algorithm.padEnd(9)} | ${String(row.hits).padEnd(4)} | ${String(row.misses).padEnd(6)} | ${row.hitRatio.toFixed(2).padStart(7)}% | ${row.missRatio.toFixed(2).padStart(8)}% | ${String(row.evictions).padEnd(9)} | ${row.executionTimeMs.toFixed(4)}${row.isAutoSelected ? ' [AUTO]' : ''}`,
    );
  }

  return lines.join('\n');
}

export function triggerBrowserDownload(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

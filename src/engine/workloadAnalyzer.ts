import type {
  AlgorithmName,
  WorkloadAnalysis,
  WorkloadDecisionRule,
  WorkloadPreset,
  WorkloadStatistics,
} from './types';

export const WORKLOAD_PRESETS: WorkloadPreset[] = [
  {
    id: 'sequential',
    name: 'Sequential',
    sequence: 'A,B,C,D,E,F,G,H,I,J',
    description: 'Linear single-pass streaming scan with zero item reuse.',
  },
  {
    id: 'repeated',
    name: 'Repeated',
    sequence: 'A,B,A,B,A,B,C,A,B,A,B,C',
    description: 'High-frequency cyclic repetition concentrated on hot keys.',
  },
  {
    id: 'locality',
    name: 'Locality',
    sequence: 'A,B,C,A,B,C,A,B,C,D,A,B,C',
    description: 'Tight active working set with strong temporal locality and a brief outlier.',
  },
  {
    id: 'mixed',
    name: 'Mixed',
    sequence: 'A,B,C,D,A,E,F,B,G,C,A,D',
    description: 'Blended workload mixing fresh scans with irregular long-distance revisits.',
  },
];

export const MIN_CACHE_CAPACITY = 2;
export const MAX_CACHE_CAPACITY = 20;

export function parseSequence(raw: string): { items: string[]; error: string | null } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      items: [],
      error: 'Enter at least one data access identifier (e.g. A,B,C,A,B,D).',
    };
  }

  const tokens = trimmed
    .split(/[\s,;]+/)
    .map((t) => t.trim().toUpperCase())
    .filter((t) => t.length > 0);

  if (tokens.length === 0) {
    return {
      items: [],
      error: 'Sequence contains no valid data identifiers.',
    };
  }

  if (tokens.length > 500) {
    return {
      items: [],
      error: 'Sequence exceeds the 500-request interactive limit.',
    };
  }

  return { items: tokens, error: null };
}

export function validateCapacity(capacity: number): { valid: boolean; error: string | null } {
  if (!Number.isFinite(capacity) || !Number.isInteger(capacity)) {
    return { valid: false, error: 'Cache capacity must be a whole number.' };
  }
  if (capacity < MIN_CACHE_CAPACITY || capacity > MAX_CACHE_CAPACITY) {
    return {
      valid: false,
      error: `Cache capacity must be between ${MIN_CACHE_CAPACITY} and ${MAX_CACHE_CAPACITY}.`,
    };
  }
  return { valid: true, error: null };
}

export function computeWorkloadStatistics(sequence: string[], capacity: number): WorkloadStatistics {
  const totalRequests = sequence.length;
  if (totalRequests === 0) {
    return {
      totalRequests: 0,
      uniqueItems: 0,
      uniqueDataRatio: 0,
      repeatedAccessFrequency: 0,
      temporalLocality: 0,
      frequencyConcentration: 0,
      sequentialPatternScore: 0,
      itemFrequencies: [],
    };
  }

  const freqMap = new Map<string, number>();
  for (const item of sequence) {
    freqMap.set(item, (freqMap.get(item) ?? 0) + 1);
  }

  const uniqueItems = freqMap.size;
  const uniqueDataRatio = uniqueItems / totalRequests;

  // Repeated access frequency: proportion of requests that are repeat accesses (total - unique) / total
  // Note: 0 when all items are unique, approaches 1 as items repeat heavily.
  const repeatedAccessFrequency =
    totalRequests > 1 ? (totalRequests - uniqueItems) / (totalRequests - 1) : 0;

  // Temporal locality: for each repeat access, measure how close its previous occurrence was.
  // A reuse distance <= capacity gets high locality score (decaying smoothly beyond capacity).
  const lastSeen = new Map<string, number>();
  let localitySum = 0;
  let repeatCount = 0;

  for (let i = 0; i < totalRequests; i++) {
    const item = sequence[i];
    const prevIdx = lastSeen.get(item);
    if (prevIdx !== undefined) {
      repeatCount++;
      const distance = i - prevIdx; // >= 1
      // Normalized closeness: 1.0 when distance <= capacity, decaying smoothly as distance grows
      const closeness = distance <= capacity ? 1 - (distance - 1) / (capacity * 2.2) : Math.max(0, capacity / (distance * 1.4));
      localitySum += Math.max(0, Math.min(1, closeness));
    }
    lastSeen.set(item, i);
  }

  const temporalLocality = repeatCount > 0 ? localitySum / totalRequests : 0;

  // Frequency concentration: share of total accesses held by the top ceil(unique * 0.35) or top 2 hottest keys
  const sortedCounts = Array.from(freqMap.entries())
    .map(([id, count]) => ({ id, count, share: count / totalRequests }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));

  const topK = Math.max(1, Math.min(2, Math.ceil(uniqueItems * 0.35)));
  const topSum = sortedCounts.slice(0, topK).reduce((acc, entry) => acc + entry.count, 0);
  // Adjust concentration so purely unique streams don't artificially score high
  const rawTopShare = topSum / totalRequests;
  const frequencyConcentration =
    uniqueItems === totalRequests ? 0 : Math.min(1, rawTopShare * (1 - uniqueDataRatio * 0.35));

  // Sequential access pattern: ratio of transitions moving forward without immediate repetition
  // Combines novel-transition ratio and monotonic step progression (e.g. A->B->C or 1->2->3)
  let sequentialTransitions = 0;
  const seenWindow = new Set<string>();
  for (let i = 0; i < totalRequests; i++) {
    const curr = sequence[i];
    if (i > 0) {
      const prev = sequence[i - 1];
      const isAlphaStep =
        curr.length === 1 &&
        prev.length === 1 &&
        curr.charCodeAt(0) === prev.charCodeAt(0) + 1;
      const numCurr = Number(curr);
      const numPrev = Number(prev);
      const isNumericStep =
        !Number.isNaN(numCurr) && !Number.isNaN(numPrev) && numCurr === numPrev + 1;

      if (isAlphaStep || isNumericStep) {
        sequentialTransitions += 1;
      } else if (curr !== prev && !seenWindow.has(curr)) {
        sequentialTransitions += 0.85;
      }
    }
    seenWindow.add(curr);
    if (seenWindow.size > Math.max(capacity, 4)) {
      // keep recent window bounded
      const first = seenWindow.values().next().value;
      if (first !== undefined) seenWindow.delete(first);
    }
  }
  const sequentialPatternScore =
    totalRequests > 1 ? Math.min(1, sequentialTransitions / (totalRequests - 1)) : 0;

  return {
    totalRequests,
    uniqueItems,
    uniqueDataRatio,
    repeatedAccessFrequency,
    temporalLocality,
    frequencyConcentration,
    sequentialPatternScore,
    itemFrequencies: sortedCounts,
  };
}

export function analyzeWorkload(sequence: string[], capacity: number): WorkloadAnalysis {
  const stats = computeWorkloadStatistics(sequence, capacity);

  if (sequence.length === 0) {
    return {
      detectedWorkloadType: 'Empty Workload',
      selectedAlgorithm: 'ARC',
      reason: 'No requests provided yet. Defaulting to ARC until a valid sequence is supplied.',
      statistics: stats,
      evaluatedRules: [],
    };
  }

  const ruleSequential = stats.uniqueDataRatio >= 0.72 && stats.sequentialPatternScore >= 0.65;
  const ruleFrequency =
    !ruleSequential &&
    stats.frequencyConcentration >= 0.62 &&
    stats.repeatedAccessFrequency >= 0.70;
  const ruleLocality =
    !ruleSequential &&
    !ruleFrequency &&
    stats.temporalLocality >= 0.45 &&
    stats.uniqueDataRatio < 0.72;
  const ruleMixed = !ruleSequential && !ruleFrequency && !ruleLocality;

  const evaluatedRules: WorkloadDecisionRule[] = [
    {
      ruleName: 'Sequential Scan Rule -> FIFO',
      thresholdDescription: 'Unique Ratio >= 72% AND Sequential Pattern >= 65%',
      matched: ruleSequential,
    },
    {
      ruleName: 'Concentrated Frequency Rule -> LFU',
      thresholdDescription: 'Frequency Concentration >= 62% AND Repeated Access >= 70%',
      matched: ruleFrequency,
    },
    {
      ruleName: 'Temporal Working-Set Rule -> LRU',
      thresholdDescription: 'Temporal Locality >= 45% AND Unique Ratio < 72%',
      matched: ruleLocality,
    },
    {
      ruleName: 'Adaptive Hybrid Fallback -> ARC',
      thresholdDescription: 'Mixed reuse distances or shifting recency/frequency patterns',
      matched: ruleMixed,
    },
  ];

  let selectedAlgorithm: AlgorithmName = 'ARC';
  let detectedWorkloadType = 'Mixed / Shifting Pattern';
  let reason = '';

  if (ruleSequential) {
    selectedAlgorithm = 'FIFO';
    detectedWorkloadType = 'Sequential Streaming';
    reason = `Unique data ratio is ${(stats.uniqueDataRatio * 100).toFixed(1)}% with a ${(stats.sequentialPatternScore * 100).toFixed(1)}% sequential transition score and minimal reuse. FIFO provides predictable linear eviction without wasted recency or frequency tracking.`;
  } else if (ruleFrequency) {
    selectedAlgorithm = 'LFU';
    detectedWorkloadType = 'Frequency-Concentrated Repetition';
    reason = `Repeated access frequency reaches ${(stats.repeatedAccessFrequency * 100).toFixed(1)}% and top keys account for ${(stats.frequencyConcentration * 100).toFixed(1)}% concentration. LFU protects heavily accessed hot blocks from occasional outlier requests.`;
  } else if (ruleLocality) {
    selectedAlgorithm = 'LRU';
    detectedWorkloadType = 'High Temporal Locality';
    reason = `Temporal locality is ${(stats.temporalLocality * 100).toFixed(1)}% with a compact working set (${stats.uniqueItems} unique items across ${stats.totalRequests} requests). LRU keeps recently active blocks resident while aging out stale entries.`;
  } else {
    selectedAlgorithm = 'ARC';
    detectedWorkloadType = 'Mixed / Irregular Reuse';
    reason = `Workload combines moderate uniqueness (${(stats.uniqueDataRatio * 100).toFixed(1)}%) with irregular reuse distances (locality ${(stats.temporalLocality * 100).toFixed(1)}%, sequential ${(stats.sequentialPatternScore * 100).toFixed(1)}%). ARC dynamically balances recent (T1) and frequent (T2) lists using ghost history.`;
  }

  return {
    detectedWorkloadType,
    selectedAlgorithm,
    reason,
    statistics: stats,
    evaluatedRules,
  };
}

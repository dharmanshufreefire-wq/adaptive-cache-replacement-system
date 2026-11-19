export type AlgorithmName = 'FIFO' | 'LRU' | 'LFU' | 'ARC';

export type SelectionMode = 'AUTO' | AlgorithmName;

export type NavigationSection =
  | 'dashboard'
  | 'simulator'
  | 'comparison'
  | 'analyzer'
  | 'analytics'
  | 'about';

export type WorkloadPresetId = 'sequential' | 'repeated' | 'locality' | 'mixed' | 'custom';

export interface WorkloadPreset {
  id: Exclude<WorkloadPresetId, 'custom'>;
  name: string;
  sequence: string;
  description: string;
}

export interface CacheBlock {
  id: string;
  frequency: number;
  insertedStep: number;
  lastAccessStep: number;
  position: number;
  segment: 'FIFO' | 'LRU' | 'LFU' | 'T1' | 'T2';
}

export interface ArcSnapshot {
  p: number;
  t1: string[];
  t2: string[];
  b1: string[];
  b2: string[];
}

export interface SimulationStepRecord {
  stepNumber: number;
  requestId: string;
  outcome: 'HIT' | 'MISS';
  evictedId: string | null;
  evictionReason: string | null;
  actionSummary: string;
  cacheUtilization: number;
  occupiedSlots: number;
  capacity: number;
  runningHitRatio: number;
  runningMissRatio: number;
  stepExecutionMs: number;
  blocksSnapshot: CacheBlock[];
  arcSnapshot?: ArcSnapshot;
}

export interface SimulationMetrics {
  totalRequests: number;
  completedRequests: number;
  hits: number;
  misses: number;
  hitRatio: number;
  missRatio: number;
  evictions: number;
  executionTimeMs: number;
  utilizationPercent: number;
}

export interface SimulationEngineState {
  algorithm: AlgorithmName;
  capacity: number;
  sequence: string[];
  stepIndex: number;
  isComplete: boolean;
  blocks: CacheBlock[];
  lastStep: SimulationStepRecord | null;
  history: SimulationStepRecord[];
  metrics: SimulationMetrics;
  // Internal structures for exact deterministic algorithm execution
  internal: {
    // FIFO / LRU / LFU metadata keyed by item ID
    frequencyMap: Record<string, number>;
    // ARC structures (index 0 = LRU, last = MRU)
    t1: string[];
    t2: string[];
    b1: string[];
    b2: string[];
    p: number;
    // Persistent total frequency across lifetime for LFU/ARC block display
    itemMeta: Record<string, { frequency: number; insertedStep: number; lastAccessStep: number }>;
  };
}

export interface WorkloadStatistics {
  totalRequests: number;
  uniqueItems: number;
  uniqueDataRatio: number;
  repeatedAccessFrequency: number;
  temporalLocality: number;
  frequencyConcentration: number;
  sequentialPatternScore: number;
  itemFrequencies: Array<{ id: string; count: number; share: number }>;
}

export interface WorkloadDecisionRule {
  ruleName: string;
  thresholdDescription: string;
  matched: boolean;
}

export interface WorkloadAnalysis {
  detectedWorkloadType: string;
  selectedAlgorithm: AlgorithmName;
  reason: string;
  statistics: WorkloadStatistics;
  evaluatedRules: WorkloadDecisionRule[];
}

export interface AlgorithmComparisonRow {
  algorithm: AlgorithmName;
  hits: number;
  misses: number;
  hitRatio: number;
  missRatio: number;
  evictions: number;
  executionTimeMs: number;
  isAutoSelected: boolean;
  finalBlocks: CacheBlock[];
}

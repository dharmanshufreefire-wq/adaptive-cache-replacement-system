import type {
  AlgorithmComparisonRow,
  AlgorithmName,
  CacheBlock,
  SimulationEngineState,
  SimulationStepRecord,
} from './types';

function nowMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

export function createInitialState(
  algorithm: AlgorithmName,
  capacity: number,
  sequence: string[],
): SimulationEngineState {
  return {
    algorithm,
    capacity,
    sequence: [...sequence],
    stepIndex: 0,
    isComplete: sequence.length === 0,
    blocks: [],
    lastStep: null,
    history: [],
    metrics: {
      totalRequests: sequence.length,
      completedRequests: 0,
      hits: 0,
      misses: 0,
      hitRatio: 0,
      missRatio: 0,
      evictions: 0,
      executionTimeMs: 0,
      utilizationPercent: 0,
    },
    internal: {
      frequencyMap: {},
      t1: [],
      t2: [],
      b1: [],
      b2: [],
      p: 0,
      itemMeta: {},
    },
  };
}

function buildArcBlocks(state: SimulationEngineState): CacheBlock[] {
  const { t1, t2, itemMeta } = state.internal;
  const blocks: CacheBlock[] = [];
  let pos = 1;
  for (const id of t1) {
    const meta = itemMeta[id] ?? { frequency: 1, insertedStep: 1, lastAccessStep: 1 };
    blocks.push({
      id,
      frequency: meta.frequency,
      insertedStep: meta.insertedStep,
      lastAccessStep: meta.lastAccessStep,
      position: pos++,
      segment: 'T1',
    });
  }
  for (const id of t2) {
    const meta = itemMeta[id] ?? { frequency: 1, insertedStep: 1, lastAccessStep: 1 };
    blocks.push({
      id,
      frequency: meta.frequency,
      insertedStep: meta.insertedStep,
      lastAccessStep: meta.lastAccessStep,
      position: pos++,
      segment: 'T2',
    });
  }
  return blocks;
}

function renumberBlocks(blocks: CacheBlock[]): CacheBlock[] {
  return blocks.map((b, idx) => ({ ...b, position: idx + 1 }));
}

export function stepSimulation(prevState: SimulationEngineState): SimulationEngineState {
  if (prevState.isComplete || prevState.stepIndex >= prevState.sequence.length) {
    return { ...prevState, isComplete: true };
  }

  const tStart = nowMs();
  const stepNumber = prevState.stepIndex + 1;
  const requestId = prevState.sequence[prevState.stepIndex];
  const capacity = prevState.capacity;

  // Clone mutable structures cleanly
  let blocks = prevState.blocks.map((b) => ({ ...b }));
  const frequencyMap = { ...prevState.internal.frequencyMap };
  const t1 = [...prevState.internal.t1];
  const t2 = [...prevState.internal.t2];
  const b1 = [...prevState.internal.b1];
  const b2 = [...prevState.internal.b2];
  let p = prevState.internal.p;
  const itemMeta: Record<string, { frequency: number; insertedStep: number; lastAccessStep: number }> =
    {};
  for (const [k, v] of Object.entries(prevState.internal.itemMeta)) {
    itemMeta[k] = { ...v };
  }

  let outcome: 'HIT' | 'MISS' = 'MISS';
  let evictedId: string | null = null;
  let evictionReason: string | null = null;
  let actionSummary = '';

  if (prevState.algorithm === 'FIFO') {
    const existingIdx = blocks.findIndex((b) => b.id === requestId);
    if (existingIdx !== -1) {
      outcome = 'HIT';
      blocks[existingIdx].frequency += 1;
      blocks[existingIdx].lastAccessStep = stepNumber;
      actionSummary = `Cache HIT on '${requestId}' at slot ${blocks[existingIdx].position} (FIFO order unchanged).`;
    } else {
      outcome = 'MISS';
      if (blocks.length >= capacity) {
        const evicted = blocks.shift()!;
        evictedId = evicted.id;
        evictionReason = `Evicted '${evicted.id}' (oldest inserted block from step ${evicted.insertedStep}).`;
      }
      blocks.push({
        id: requestId,
        frequency: 1,
        insertedStep: stepNumber,
        lastAccessStep: stepNumber,
        position: blocks.length + 1,
        segment: 'FIFO',
      });
      actionSummary = evictedId
        ? `Cache MISS on '${requestId}'. ${evictionReason} Inserted '${requestId}' at tail.`
        : `Cache MISS on '${requestId}'. Inserted into free slot ${blocks.length}.`;
    }
    blocks = renumberBlocks(blocks);
  } else if (prevState.algorithm === 'LRU') {
    const existingIdx = blocks.findIndex((b) => b.id === requestId);
    if (existingIdx !== -1) {
      outcome = 'HIT';
      const [hitBlock] = blocks.splice(existingIdx, 1);
      hitBlock.frequency += 1;
      hitBlock.lastAccessStep = stepNumber;
      blocks.push(hitBlock); // MRU at tail
      blocks = renumberBlocks(blocks);
      actionSummary = `Cache HIT on '${requestId}'. Promoted to MRU position (slot ${blocks.length}).`;
    } else {
      outcome = 'MISS';
      if (blocks.length >= capacity) {
        const evicted = blocks.shift()!; // LRU at head
        evictedId = evicted.id;
        evictionReason = `Evicted '${evicted.id}' (least recently accessed at step ${evicted.lastAccessStep}).`;
      }
      blocks.push({
        id: requestId,
        frequency: 1,
        insertedStep: stepNumber,
        lastAccessStep: stepNumber,
        position: blocks.length + 1,
        segment: 'LRU',
      });
      blocks = renumberBlocks(blocks);
      actionSummary = evictedId
        ? `Cache MISS on '${requestId}'. ${evictionReason} Placed '${requestId}' at MRU position.`
        : `Cache MISS on '${requestId}'. Loaded into slot ${blocks.length} as MRU.`;
    }
  } else if (prevState.algorithm === 'LFU') {
    const existingIdx = blocks.findIndex((b) => b.id === requestId);
    if (existingIdx !== -1) {
      outcome = 'HIT';
      blocks[existingIdx].frequency += 1;
      blocks[existingIdx].lastAccessStep = stepNumber;
      // Sort blocks cleanly by frequency asc, then lastAccessStep asc for deterministic position view
      blocks.sort((a, b) => a.frequency - b.frequency || a.lastAccessStep - b.lastAccessStep);
      blocks = renumberBlocks(blocks);
      const updated = blocks.find((b) => b.id === requestId)!;
      actionSummary = `Cache HIT on '${requestId}' (frequency increased to ${updated.frequency}).`;
    } else {
      outcome = 'MISS';
      if (blocks.length >= capacity) {
        // Evict lowest frequency; resolve ties using least recent access (smallest lastAccessStep)
        let victimIdx = 0;
        for (let i = 1; i < blocks.length; i++) {
          const cand = blocks[i];
          const curr = blocks[victimIdx];
          if (
            cand.frequency < curr.frequency ||
            (cand.frequency === curr.frequency && cand.lastAccessStep < curr.lastAccessStep)
          ) {
            victimIdx = i;
          }
        }
        const [evicted] = blocks.splice(victimIdx, 1);
        evictedId = evicted.id;
        evictionReason = `Evicted '${evicted.id}' (lowest frequency: ${evicted.frequency}, last accessed at step ${evicted.lastAccessStep}).`;
      }
      blocks.push({
        id: requestId,
        frequency: 1,
        insertedStep: stepNumber,
        lastAccessStep: stepNumber,
        position: blocks.length + 1,
        segment: 'LFU',
      });
      blocks.sort((a, b) => a.frequency - b.frequency || a.lastAccessStep - b.lastAccessStep);
      blocks = renumberBlocks(blocks);
      actionSummary = evictedId
        ? `Cache MISS on '${requestId}'. ${evictionReason} Inserted '${requestId}' with frequency 1.`
        : `Cache MISS on '${requestId}'. Loaded with initial frequency 1.`;
    }
  } else {
    // ARC: Adaptive Replacement Cache (Megiddo & Modha 2003)
    const replaceArc = (x: string) => {
      if (t1.length >= 1 && ((b2.includes(x) && t1.length === p) || t1.length > p)) {
        const victim = t1.shift()!;
        b1.push(victim);
        evictedId = victim;
        evictionReason = `Evicted '${victim}' from T1 (|T1| >= target p=${p}); recorded in ghost list B1.`;
      } else if (t2.length >= 1) {
        const victim = t2.shift()!;
        b2.push(victim);
        evictedId = victim;
        evictionReason = `Evicted '${victim}' from T2 (|T1| <= target p=${p}); recorded in ghost list B2.`;
      }
    };

    const inT1Idx = t1.indexOf(requestId);
    const inT2Idx = t2.indexOf(requestId);

    if (inT1Idx !== -1 || inT2Idx !== -1) {
      // Case I: Resident Hit in T1 or T2 -> Move to MRU of T2
      outcome = 'HIT';
      if (inT1Idx !== -1) {
        t1.splice(inT1Idx, 1);
        t2.push(requestId);
        actionSummary = `Cache HIT on '${requestId}' in T1. Promoted from T1 (recency) to MRU of T2 (frequency).`;
      } else {
        t2.splice(inT2Idx, 1);
        t2.push(requestId);
        actionSummary = `Cache HIT on '${requestId}' in T2. Refreshed to MRU of T2.`;
      }
      const prevMeta = itemMeta[requestId] ?? {
        frequency: 0,
        insertedStep: stepNumber,
        lastAccessStep: stepNumber,
      };
      itemMeta[requestId] = {
        frequency: prevMeta.frequency + 1,
        insertedStep: prevMeta.insertedStep,
        lastAccessStep: stepNumber,
      };
    } else if (b1.includes(requestId)) {
      // Case II: Ghost Hit in B1 -> Adapt p upward toward recency
      outcome = 'MISS';
      const delta = b1.length >= b2.length ? 1 : Math.max(1, Math.floor(b2.length / b1.length));
      p = Math.min(capacity, p + delta);
      if (t1.length + t2.length >= capacity) {
        replaceArc(requestId);
      }
      const b1Idx = b1.indexOf(requestId);
      b1.splice(b1Idx, 1);
      t2.push(requestId);
      const prevMeta = itemMeta[requestId];
      itemMeta[requestId] = {
        frequency: (prevMeta?.frequency ?? 0) + 1,
        insertedStep: stepNumber,
        lastAccessStep: stepNumber,
      };
      actionSummary = `Cache MISS (B1 ghost hit) on '${requestId}'. Increased p to ${p}. ${evictionReason ?? ''} Restored to T2.`;
    } else if (b2.includes(requestId)) {
      // Case III: Ghost Hit in B2 -> Adapt p downward toward frequency
      outcome = 'MISS';
      const delta = b2.length >= b1.length ? 1 : Math.max(1, Math.floor(b1.length / b2.length));
      p = Math.max(0, p - delta);
      if (t1.length + t2.length >= capacity) {
        replaceArc(requestId);
      }
      const b2Idx = b2.indexOf(requestId);
      b2.splice(b2Idx, 1);
      t2.push(requestId);
      const prevMeta = itemMeta[requestId];
      itemMeta[requestId] = {
        frequency: (prevMeta?.frequency ?? 0) + 1,
        insertedStep: stepNumber,
        lastAccessStep: stepNumber,
      };
      actionSummary = `Cache MISS (B2 ghost hit) on '${requestId}'. Decreased p to ${p}. ${evictionReason ?? ''} Restored to T2.`;
    } else {
      // Case IV: Cold Miss (not in T1, T2, B1, B2)
      outcome = 'MISS';
      const l1 = t1.length + b1.length;
      if (l1 === capacity) {
        if (t1.length < capacity) {
          b1.shift();
          if (t1.length + t2.length >= capacity) {
            replaceArc(requestId);
          }
        } else {
          // |T1| === capacity, B1 is empty
          const victim = t1.shift()!;
          evictedId = victim;
          evictionReason = `Evicted '${victim}' directly from T1 (|T1| reached full cache capacity ${capacity}).`;
        }
      } else {
        const totalSize = t1.length + t2.length + b1.length + b2.length;
        if (totalSize >= capacity) {
          if (totalSize === 2 * capacity && b2.length > 0) {
            b2.shift();
          }
          if (t1.length + t2.length >= capacity) {
            replaceArc(requestId);
          }
        }
      }
      t1.push(requestId);
      itemMeta[requestId] = {
        frequency: 1,
        insertedStep: stepNumber,
        lastAccessStep: stepNumber,
      };
      actionSummary = evictedId
        ? `Cache MISS on '${requestId}'. ${evictionReason} Inserted '${requestId}' into T1.`
        : `Cache MISS on '${requestId}'. Loaded into T1 (${t1.length + t2.length}/${capacity} resident).`;
    }
  }

  const nextInternal = {
    frequencyMap,
    t1,
    t2,
    b1,
    b2,
    p,
    itemMeta,
  };

  if (prevState.algorithm === 'ARC') {
    const tempState: SimulationEngineState = {
      ...prevState,
      internal: nextInternal,
    };
    blocks = buildArcBlocks(tempState);
  }

  const hits = prevState.metrics.hits + (outcome === 'HIT' ? 1 : 0);
  const misses = prevState.metrics.misses + (outcome === 'MISS' ? 1 : 0);
  const evictions = prevState.metrics.evictions + (evictedId ? 1 : 0);
  const completedRequests = stepNumber;
  const hitRatio = completedRequests > 0 ? (hits / completedRequests) * 100 : 0;
  const missRatio = completedRequests > 0 ? (misses / completedRequests) * 100 : 0;
  const utilizationPercent = capacity > 0 ? (blocks.length / capacity) * 100 : 0;

  const tEnd = nowMs();
  const stepExecutionMs = Math.max(0.001, tEnd - tStart);
  const executionTimeMs = prevState.metrics.executionTimeMs + stepExecutionMs;

  const stepRecord: SimulationStepRecord = {
    stepNumber,
    requestId,
    outcome,
    evictedId,
    evictionReason,
    actionSummary,
    cacheUtilization: utilizationPercent,
    occupiedSlots: blocks.length,
    capacity,
    runningHitRatio: hitRatio,
    runningMissRatio: missRatio,
    stepExecutionMs,
    blocksSnapshot: blocks.map((b) => ({ ...b })),
    arcSnapshot:
      prevState.algorithm === 'ARC'
        ? {
            p,
            t1: [...t1],
            t2: [...t2],
            b1: [...b1],
            b2: [...b2],
          }
        : undefined,
  };

  const nextStepIndex = prevState.stepIndex + 1;
  const isComplete = nextStepIndex >= prevState.sequence.length;

  return {
    ...prevState,
    stepIndex: nextStepIndex,
    isComplete,
    blocks,
    lastStep: stepRecord,
    history: [...prevState.history, stepRecord],
    metrics: {
      totalRequests: prevState.sequence.length,
      completedRequests,
      hits,
      misses,
      hitRatio,
      missRatio,
      evictions,
      executionTimeMs,
      utilizationPercent,
    },
    internal: nextInternal,
  };
}

export function runFullSimulation(
  algorithm: AlgorithmName,
  capacity: number,
  sequence: string[],
): SimulationEngineState {
  const tStart = nowMs();
  let state = createInitialState(algorithm, capacity, sequence);
  while (!state.isComplete) {
    state = stepSimulation(state);
  }
  const tEnd = nowMs();
  // Measure actual full pass execution time cleanly while keeping step sum accurate if tiny
  const wallMs = Math.max(0.005, tEnd - tStart);
  return {
    ...state,
    metrics: {
      ...state.metrics,
      executionTimeMs: wallMs,
    },
  };
}

export function compareAllAlgorithms(
  capacity: number,
  sequence: string[],
  autoSelectedAlgorithm: AlgorithmName,
): AlgorithmComparisonRow[] {
  const algorithms: AlgorithmName[] = ['FIFO', 'LRU', 'LFU', 'ARC'];
  return algorithms.map((algorithm) => {
    const result = runFullSimulation(algorithm, capacity, sequence);
    return {
      algorithm,
      hits: result.metrics.hits,
      misses: result.metrics.misses,
      hitRatio: result.metrics.hitRatio,
      missRatio: result.metrics.missRatio,
      evictions: result.metrics.evictions,
      executionTimeMs: result.metrics.executionTimeMs,
      isAutoSelected: algorithm === autoSelectedAlgorithm,
      finalBlocks: result.blocks,
    };
  });
}

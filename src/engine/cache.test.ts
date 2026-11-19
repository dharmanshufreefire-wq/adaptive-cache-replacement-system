import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareAllAlgorithms,
  createInitialState,
  runFullSimulation,
  stepSimulation,
} from './cacheEngine';
import {
  WORKLOAD_PRESETS,
  analyzeWorkload,
  parseSequence,
  validateCapacity,
} from './workloadAnalyzer';
import { buildComparisonCsv, buildHistoryCsv, buildSummaryReportText } from './exportUtils';

test('sequence parser and capacity validator reject invalid inputs', () => {
  assert.equal(parseSequence('').items.length, 0);
  assert.ok(parseSequence('').error);
  assert.equal(parseSequence(' , ; ').items.length, 0);
  assert.deepEqual(parseSequence('a, b; c\nd').items, ['A', 'B', 'C', 'D']);

  assert.equal(validateCapacity(1).valid, false);
  assert.equal(validateCapacity(21).valid, false);
  assert.equal(validateCapacity(3.5).valid, false);
  assert.equal(validateCapacity(2).valid, true);
  assert.equal(validateCapacity(20).valid, true);
});

test('FIFO evicts oldest inserted item regardless of recent hits', () => {
  // Capacity 3: A, B, C, A (hit, stays oldest!), D (evicts A!)
  const seq = ['A', 'B', 'C', 'A', 'D'];
  const res = runFullSimulation('FIFO', 3, seq);

  assert.equal(res.metrics.hits, 1);
  assert.equal(res.metrics.misses, 4);
  assert.equal(res.metrics.evictions, 1);
  assert.equal(res.history[4].evictedId, 'A');
  assert.deepEqual(
    res.blocks.map((b) => b.id),
    ['B', 'C', 'D'],
  );
  assert.equal(res.metrics.hitRatio, 20);
  assert.equal(res.metrics.missRatio, 80);
});

test('LRU evicts least recently accessed item and promotes on hit', () => {
  // Capacity 3: A, B, C, A (hit -> A becomes MRU; B is now LRU), D (evicts B!)
  const seq = ['A', 'B', 'C', 'A', 'D'];
  const res = runFullSimulation('LRU', 3, seq);

  assert.equal(res.metrics.hits, 1);
  assert.equal(res.metrics.misses, 4);
  assert.equal(res.metrics.evictions, 1);
  assert.equal(res.history[4].evictedId, 'B');
  assert.deepEqual(
    res.blocks.map((b) => b.id),
    ['C', 'A', 'D'],
  );
});

test('LFU evicts least frequently accessed item and breaks ties via least recent access', () => {
  // Capacity 3:
  // 1: A (freq 1, last 1)
  // 2: B (freq 1, last 2)
  // 3: A (hit, freq 2, last 3)
  // 4: C (freq 1, last 4) -> cache has A(2,3), B(1,2), C(1,4)
  // 5: D (miss) -> tie between B(1,2) and C(1,4): B has older lastAccessStep (2 < 4) so B is evicted!
  const seq = ['A', 'B', 'A', 'C', 'D'];
  const res = runFullSimulation('LFU', 3, seq);

  assert.equal(res.metrics.hits, 1);
  assert.equal(res.metrics.misses, 4);
  assert.equal(res.metrics.evictions, 1);
  assert.equal(res.history[4].evictedId, 'B');
  assert.ok(res.blocks.some((b) => b.id === 'A' && b.frequency === 2));
  assert.ok(res.blocks.some((b) => b.id === 'C'));
  assert.ok(res.blocks.some((b) => b.id === 'D'));
});

test('ARC maintains T1, T2, B1, B2 invariants and adapts parameter p', () => {
  const capacity = 3;
  // Trigger T2 promotion (A,A), T1 fill (B,C), eviction of B to B1 on D, then B1 ghost hit on B (increases p)
  const seq = ['A', 'A', 'B', 'C', 'D', 'B', 'E', 'A', 'D', 'C'];
  let state = createInitialState('ARC', capacity, seq);
  let sawB1OrB2NonEmpty = false;
  let sawPChange = false;

  while (!state.isComplete) {
    state = stepSimulation(state);
    const snap = state.lastStep?.arcSnapshot;
    assert.ok(snap);
    assert.ok(snap.t1.length + snap.t2.length <= capacity);
    assert.ok(snap.t1.length + snap.t2.length + snap.b1.length + snap.b2.length <= 2 * capacity);
    assert.ok(snap.p >= 0 && snap.p <= capacity);
    if (snap.b1.length > 0 || snap.b2.length > 0) sawB1OrB2NonEmpty = true;
    if (snap.p !== 0) sawPChange = true;
  }

  assert.equal(sawB1OrB2NonEmpty, true);
  assert.equal(sawPChange, true);
  assert.equal(state.metrics.hits + state.metrics.misses, seq.length);
});

test('step-by-step and full simulation produce identical results for all algorithms', () => {
  const seq = ['A', 'B', 'C', 'D', 'A', 'E', 'F', 'B', 'G', 'C', 'A', 'D'];
  const capacity = 4;
  for (const algo of ['FIFO', 'LRU', 'LFU', 'ARC'] as const) {
    const full = runFullSimulation(algo, capacity, seq);
    let stepped = createInitialState(algo, capacity, seq);
    while (!stepped.isComplete) {
      stepped = stepSimulation(stepped);
    }
    assert.equal(stepped.metrics.hits, full.metrics.hits);
    assert.equal(stepped.metrics.misses, full.metrics.misses);
    assert.equal(stepped.metrics.evictions, full.metrics.evictions);
    assert.equal(stepped.metrics.hitRatio, full.metrics.hitRatio);
    assert.deepEqual(
      stepped.blocks.map((b) => b.id),
      full.blocks.map((b) => b.id),
    );
  }
});

test('workload analyzer selects expected algorithms for all 4 presets', () => {
  const byId = Object.fromEntries(WORKLOAD_PRESETS.map((p) => [p.id, parseSequence(p.sequence).items]));

  const seqAnalysis = analyzeWorkload(byId.sequential, 4);
  assert.equal(seqAnalysis.selectedAlgorithm, 'FIFO');

  const repAnalysis = analyzeWorkload(byId.repeated, 4);
  assert.equal(repAnalysis.selectedAlgorithm, 'LFU');

  const locAnalysis = analyzeWorkload(byId.locality, 4);
  assert.equal(locAnalysis.selectedAlgorithm, 'LRU');

  const mixAnalysis = analyzeWorkload(byId.mixed, 4);
  assert.equal(mixAnalysis.selectedAlgorithm, 'ARC');
});

test('comparison and export builders produce valid output', () => {
  const seq = parseSequence('A,B,C,A,B,C,A,B,C,D,A,B,C').items;
  const analysis = analyzeWorkload(seq, 3);
  const comparison = compareAllAlgorithms(3, seq, analysis.selectedAlgorithm);
  assert.equal(comparison.length, 4);

  const compCsv = buildComparisonCsv(comparison);
  assert.ok(compCsv.includes('FIFO'));
  assert.ok(compCsv.includes('ARC'));

  const simState = runFullSimulation(analysis.selectedAlgorithm, 3, seq);
  const histCsv = buildHistoryCsv(simState);
  assert.equal(histCsv.split('\n').length, seq.length + 1);

  const report = buildSummaryReportText({
    state: simState,
    analysis,
    comparison,
    selectionMode: 'AUTO',
  });
  assert.ok(report.includes('ADAPTIVE CACHE REPLACEMENT SYSTEM'));
});

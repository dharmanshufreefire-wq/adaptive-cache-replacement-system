export function AboutView() {
  const sections = [
    {
      title: '01. Project Introduction',
      body: 'The Adaptive Cache Replacement System (ACRS) is an interactive educational memory-management simulator designed to bridge theoretical operating systems concepts with observable runtime behavior. It implements FIFO, LRU, LFU, and Adaptive Replacement Cache (ARC) policies in pure browser-based TypeScript and pairs them with a transparent rule-based workload analyzer.',
    },
    {
      title: '02. Problem Statement',
      body: 'Static cache replacement policies struggle when memory access patterns shift over time. LRU excels under tight temporal locality but suffers severe cache pollution during sequential scans; LFU protects frequent items yet retains stale hot entries long after a phase change; FIFO ignores recency and frequency altogether. Selecting a single fixed policy across diverse workloads leads to avoidable cache misses and elevated backing-store latency.',
    },
    {
      title: '03. Existing System',
      body: 'Conventional educational tools and legacy caches typically simulate only one static policy in isolation or rely on hardcoded textbook traces without live step-by-step inspection. Users rarely get side-by-side multi-algorithm benchmarks on identical request sequences, nor can they inspect internal ghost-list state transitions in adaptive policies like ARC.',
    },
    {
      title: '04. Proposed System',
      body: 'ACRS introduces an integrated simulation workbench featuring deterministic step-by-step and full-pass execution engines, animated cache-slot inspection, real-time hit/miss/eviction telemetry, and an automatic rule-based Workload Analyzer. By measuring unique data ratio, repeated access frequency, temporal locality, frequency concentration, and sequential transition patterns, ACRS transparently recommends and applies the most appropriate algorithm in AUTO mode.',
    },
  ];

  const objectives = [
    'Implement faithful, deterministic browser-side execution for FIFO, LRU, LFU, and ARC (including T1, T2, B1, B2, and adaptive parameter p).',
    'Provide animated visual feedback for cache hits, misses, insertions, and evictions with clear natural-language eviction reasoning.',
    'Analyze incoming access sequences using transparent quantitative metrics to guide automatic policy selection.',
    'Benchmark all four policies simultaneously on identical capacities and sequences with exportable CSV and text reports.',
  ];

  const algorithms = [
    {
      name: 'FIFO (First-In, First-Out)',
      summary:
        'Maintains insertion order in a queue and evicts the oldest loaded block regardless of subsequent hits. Ideal for single-pass sequential scans with minimal metadata overhead.',
    },
    {
      name: 'LRU (Least Recently Used)',
      summary:
        'Promotes blocks on every hit and evicts the block with the oldest last-access timestamp. Highly effective when active working sets exhibit strong temporal locality.',
    },
    {
      name: 'LFU (Least Frequently Used)',
      summary:
        'Tracks cumulative access counts per resident block and evicts the block with the lowest frequency, resolving frequency ties using least recent access.',
    },
    {
      name: 'ARC (Adaptive Replacement Cache)',
      summary:
        'Balances recency (T1) and frequency (T2) resident lists alongside ghost eviction histories (B1, B2), continuously tuning target parameter p in response to ghost hits.',
    },
  ];

  const advantages = [
    'Zero external backend or paid API dependency — every cache lookup and metric runs deterministically in the browser.',
    'Identical algorithm core drives both interactive step-by-step debugging and instant full-sequence benchmarking.',
    'Transparent rule-based selection explains exact metric thresholds instead of opaque black-box claims.',
    'Exportable CSV comparison tables, step execution logs, and formatted summary reports for academic or engineering review.',
  ];

  const applications = [
    'Operating systems and computer architecture coursework demonstrating page and CPU cache replacement.',
    'Database buffer-pool and storage-engine tuning for mixed OLTP and analytical scan workloads.',
    'Content Delivery Network (CDN) edge caching and in-memory key-value store policy evaluation.',
    'Embedded memory-constrained systems requiring predictable eviction behavior.',
  ];

  const futureScope = [
    'Support for trace-file ingestion (CSV/JSON memory address traces) up to multi-thousand-request benchmarks.',
    'Addition of Clock / Second-Chance, 2Q, and LIRS replacement policies for broader academic comparison.',
    'Multi-level cache hierarchy modeling (L1/L2 inclusive vs. exclusive residency) and Belady MIN optimal baseline overlay.',
  ];

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 space-y-2">
        <h2 className="text-xl font-bold text-white">About the Adaptive Cache Replacement System</h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          Comprehensive architectural overview, algorithmic foundations, and educational scope of ACRS.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {sections.map((sec) => (
          <section key={sec.title} className="glass-panel rounded-2xl p-6 space-y-2.5">
            <h3 className="text-base font-semibold text-white">{sec.title}</h3>
            <p className="text-sm leading-relaxed text-slate-300">{sec.body}</p>
          </section>
        ))}
      </div>

      <section className="glass-panel rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-semibold text-white">05. Objectives</h3>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 text-sm text-slate-300">
          {objectives.map((obj) => (
            <li key={obj} className="glass-subsurface rounded-xl p-4 leading-relaxed">
              {obj}
            </li>
          ))}
        </ul>
      </section>

      <section className="glass-panel rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-semibold text-white">06. Algorithms Used</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {algorithms.map((algo) => (
            <div key={algo.name} className="glass-subsurface rounded-xl p-4 space-y-1.5">
              <div className="font-mono text-sm font-semibold text-blue-300">{algo.name}</div>
              <p className="text-xs leading-relaxed text-slate-300">{algo.summary}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="glass-panel rounded-2xl p-6 space-y-3">
          <h3 className="text-base font-semibold text-white">07. Advantages</h3>
          <ul className="space-y-2 text-xs leading-relaxed text-slate-300 list-disc pl-4">
            {advantages.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="glass-panel rounded-2xl p-6 space-y-3">
          <h3 className="text-base font-semibold text-white">08. Applications</h3>
          <ul className="space-y-2 text-xs leading-relaxed text-slate-300 list-disc pl-4">
            {applications.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="glass-panel rounded-2xl p-6 space-y-3">
          <h3 className="text-base font-semibold text-white">09. Future Scope</h3>
          <ul className="space-y-2 text-xs leading-relaxed text-slate-300 list-disc pl-4">
            {futureScope.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

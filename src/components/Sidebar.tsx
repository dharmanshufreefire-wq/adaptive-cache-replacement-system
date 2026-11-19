import {
  Activity,
  BarChart3,
  BookOpen,
  Cpu,
  GitCompare,
  LayoutDashboard,
  X,
} from 'lucide-react';
import type { NavigationSection } from '../engine/types';

interface SidebarProps {
  activeSection: NavigationSection;
  onSelectSection: (section: NavigationSection) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  activeAlgorithm: string;
  selectionMode: string;
  capacity: number;
}

const NAV_ITEMS: Array<{
  id: NavigationSection;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'simulator', label: 'Cache Simulator', icon: Cpu },
  { id: 'comparison', label: 'Algorithm Comparison', icon: GitCompare },
  { id: 'analyzer', label: 'Workload Analyzer', icon: Activity },
  { id: 'analytics', label: 'Performance Analytics', icon: BarChart3 },
  { id: 'about', label: 'About Project', icon: BookOpen },
];

export function Sidebar({
  activeSection,
  onSelectSection,
  mobileOpen,
  onCloseMobile,
  activeAlgorithm,
  selectionMode,
  capacity,
}: SidebarProps) {
  const handleSelect = (id: NavigationSection) => {
    onSelectSection(id);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex h-full flex-col justify-between p-5">
      <div>
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-md shadow-blue-950/50">
              <Cpu className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white">ACRS Engine</div>
              <div className="text-xs text-slate-400">Memory Simulator</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800/70 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav aria-label="Primary navigation" className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-all duration-150 whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600/25 via-indigo-600/20 to-purple-600/20 text-white border border-blue-400/30 shadow-sm'
                    : 'text-slate-300 border border-transparent hover:bg-slate-800/45 hover:text-white'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-800/80 pt-4 text-xs text-slate-400 space-y-2">
        <div className="flex items-center justify-between">
          <span>Active Policy</span>
          <span className="font-mono font-semibold text-slate-200">{activeAlgorithm}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Selection Mode</span>
          <span className="font-mono text-slate-300">{selectionMode}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Cache Capacity</span>
          <span className="font-mono text-slate-300">{capacity} blocks</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop persistent sidebar */}
      <aside className="hidden lg:block lg:w-64 lg:shrink-0 border-r border-slate-800/75 bg-[#070C1B]/85 backdrop-blur-xl">
        <div className="sticky top-0 h-screen">{navContent}</div>
      </aside>

      {/* Mobile slide-over drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-72 max-w-[85vw] bg-[#080E20] border-r border-slate-800/80">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}

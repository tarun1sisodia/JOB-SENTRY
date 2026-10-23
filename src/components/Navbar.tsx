import React from 'react';
import { ShieldAlert, Server, Sparkles } from 'lucide-react';

interface NavbarProps {
  useHeuristics: boolean;
  setUseHeuristics: (val: boolean) => void;
  simulateBackendDown: boolean;
  setSimulateBackendDown: (val: boolean) => void;
  historyCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  useHeuristics,
  setUseHeuristics,
  simulateBackendDown,
  setSimulateBackendDown,
  historyCount,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white">JobSentry</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono border border-slate-700">
                FakeJobScanner
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Pre-application employment risk & fraud verification
            </p>
          </div>
        </div>

        {/* Controls & Badges */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* History Counter */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Saved Checks: <strong className="text-white font-mono">{historyCount}</strong></span>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setUseHeuristics(false)}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                !useHeuristics
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Frozen contract: exactly returns High (0.78) dummy output as specified in README"
            >
              Frozen MVP
            </button>
            <button
              type="button"
              onClick={() => setUseHeuristics(true)}
              className={`px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1 ${
                useHeuristics
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Smart Heuristics: inspects emails, telegrams, deposit keywords, and salary"
            >
              <Sparkles className="w-3 h-3" />
              <span>Smart Heuristics</span>
            </button>
          </div>

          {/* Simulate Backend Down Toggle */}
          <button
            type="button"
            onClick={() => setSimulateBackendDown(!simulateBackendDown)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              simulateBackendDown
                ? 'bg-rose-500/10 text-rose-300 border-rose-500/40'
                : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
            }`}
            title="Toggle to test backend down / network error message handling"
          >
            <Server className={`w-3.5 h-3.5 ${simulateBackendDown ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`} />
            <span className="hidden lg:inline">{simulateBackendDown ? 'Simulated Offline (503)' : 'Backend: Online'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

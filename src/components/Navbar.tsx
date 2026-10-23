import React from 'react';
import { Sun, Moon, Server } from 'lucide-react';
import { AppStage } from '../shared/contracts';

interface NavbarProps {
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
  stage: AppStage;
  setStage: (s: AppStage) => void;
  simulateOffline: boolean;
  setSimulateOffline: (val: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  theme,
  setTheme,
  stage,
  setStage,
  simulateOffline,
  setSimulateOffline,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
        {/* Zone 1: Wordmark in single element */}
        <a
          href="/"
          className="text-base font-bold tracking-tight text-zinc-950 dark:text-zinc-50 whitespace-nowrap shrink-0 hover:opacity-80 transition-opacity"
        >
          JobSentry
        </a>

        {/* Zone 2: 4-5 Single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          <a href="#scanner" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0">
            Scanner
          </a>
          <a href="#how-it-works" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0">
            Workflow
          </a>
          <a href="#common-scams" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0">
            Patterns
          </a>
          <a href="#helpline" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0">
            Helpline 1930
          </a>
          <a href="#history" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0">
            Audit Log
          </a>
        </nav>

        {/* Zone 3: Actions & Controls */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Stage Switcher */}
          <div className="flex items-center p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setStage('production')}
              className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
                stage === 'production'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
              }`}
            >
              Prod
            </button>
            <button
              type="button"
              onClick={() => setStage('staging')}
              className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
                stage === 'staging'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
              }`}
            >
              Staging
            </button>
          </div>

          {/* Simulate Offline (503) */}
          <button
            type="button"
            onClick={() => setSimulateOffline(!simulateOffline)}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              simulateOffline
                ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950'
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
            }`}
            title="Toggle offline failure test (503)"
          >
            <Server className="w-3.5 h-3.5" />
          </button>

          {/* Light / Dark Mode Toggle */}
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-100 transition-colors"
            title="Toggle color theme"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {/* Primary CTA button */}
          <a
            href="#scanner"
            className="hidden sm:inline-block px-3 py-1.5 rounded-lg bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-semibold hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
          >
            Scan Job
          </a>
        </div>
      </div>
    </header>
  );
};

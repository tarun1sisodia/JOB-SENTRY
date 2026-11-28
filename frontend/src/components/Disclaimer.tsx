import React from 'react';

export const Disclaimer: React.FC = () => {
  return (
    <footer className="py-12 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 text-zinc-500 text-xs">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              Legal & Advisory Notice
            </h4>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              &ldquo;This is an advisory risk indicator, not proof of fraud.&rdquo;
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              JobSentry is a locally run prototype that combines a text-only classifier with rule-based checks of posting details. Its result is advisory, not proof of fraud or legitimacy. Verify job offers independently with the named employer.
            </p>
            <div className="pt-3 text-[11px] font-mono text-zinc-400 dark:text-zinc-600 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 dark:border-zinc-800">
              <span>JobSentry Advisory Prototype</span>
              <span>Helpline: 1930 · cybercrime.gov.in</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

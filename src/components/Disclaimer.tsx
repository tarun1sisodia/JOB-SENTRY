import React from 'react';
import { AlertCircle } from 'lucide-react';

export const Disclaimer: React.FC = () => {
  return (
    <footer className="py-12 bg-slate-950 border-t border-slate-800 text-slate-400">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5 text-amber-400" />
          </div>

          <div className="space-y-2 text-xs">
            <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Legal & Verification Disclaimer
            </h4>
            <p className="text-slate-300 font-medium text-sm leading-relaxed">
              &ldquo;This is an advisory risk indicator, not proof of fraud.&rdquo;
            </p>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              JobSentry is an informational, heuristic risk assessment tool intended to alert job applicants to common scam patterns, phishing indicators, and communication anomalies prior to sharing private credentials or financial assets. A high score indicates statistical and structural warning signals, while a low score does not guarantee immunity from sophisticated social engineering. Always independently verify offers through official registered corporate portals and accredited industry directories.
            </p>
            <div className="pt-2 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80">
              <span>JobSentry (FakeJobScanner) Advisory System</span>
              <span>National Cyber Crime Emergency: 1930 | cybercrime.gov.in</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

import React, { useState } from 'react';
import { Copy, Check, Clock } from 'lucide-react';
import { JobCheckOutput, JobAuditRecord } from '../shared/contracts';

interface ResultCardProps {
  result: JobCheckOutput | null;
  lastRecord: JobAuditRecord | null;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result, lastRecord }) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!result) return null;

  const scorePercentage = Math.round(result.score * 100);

  const handleCopyReport = () => {
    const reportText = `JobSentry Risk Analysis Report
Risk Level: ${result.riskLevel} (Score: ${result.score})
Evaluated At: ${result.evaluatedAt}
Environment: ${result.stage}

Red Flags:
${result.redFlags.map((rf) => `- ${rf}`).join('\n')}

Advice:
${result.advice.map((adv) => `- ${adv}`).join('\n')}

Note: This is an advisory risk indicator, not proof of fraud.`;

    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section id="result-section" className="py-10 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 animate-fade-in">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 sm:p-8 shadow-sm">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono mb-1">
                <span>Evaluation Result</span>
                <span>·</span>
                <span className="capitalize">{result.stage}</span>
                {lastRecord && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(result.evaluatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-zinc-50">
                Risk Assessment Summary
              </h2>
            </div>

            <div className="flex items-center gap-3">
              {/* High Contrast Risk Label (No Candy Pills) */}
              <div className="px-3 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-xs font-bold text-zinc-950 dark:text-zinc-50">
                Risk Level: {result.riskLevel}
              </div>

              {/* Copy Report */}
              <button
                type="button"
                onClick={handleCopyReport}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-300 transition-colors"
                title="Copy assessment report"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Metadata String */}
          {lastRecord && (lastRecord.company || lastRecord.email || lastRecord.salary) && (
            <div className="py-2.5 px-3 my-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 flex flex-wrap items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400 font-mono">
              {lastRecord.company && (
                <span>Company: <strong className="text-zinc-900 dark:text-zinc-100">{lastRecord.company}</strong></span>
              )}
              {lastRecord.email && (
                <span>Email: <strong className="text-zinc-900 dark:text-zinc-100">{lastRecord.email}</strong></span>
              )}
              {lastRecord.salary && (
                <span>Salary: <strong className="text-zinc-900 dark:text-zinc-100">${lastRecord.salary}</strong></span>
              )}
            </div>
          )}

          {/* Score as Progress Bar */}
          <div className="my-6">
            <div className="flex items-center justify-between mb-2 text-xs">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                Risk Score:{' '}
                <strong className="text-zinc-950 dark:text-zinc-50 font-mono text-sm">
                  {result.score}
                </strong>{' '}
                <span className="text-zinc-500 font-normal">({scorePercentage}%)</span>
              </span>
              <span className="text-[11px] font-mono text-zinc-500">
                Scale: 0.00 (Safe) → 1.00 (Critical)
              </span>
            </div>

            <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden border border-zinc-200 dark:border-zinc-800">
              <div
                className="h-full bg-zinc-950 dark:bg-zinc-100 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(5, scorePercentage))}%` }}
              />
            </div>
          </div>

          {/* Red Flags & Advice Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            {/* Red Flags */}
            <div className="bg-zinc-50 dark:bg-zinc-900/40 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 mb-3">
                Detected Red Flags ({result.redFlags.length})
              </h3>
              <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
                {result.redFlags.map((flag, idx) => (
                  <li key={idx} className="flex items-start gap-2 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-950 dark:bg-zinc-100 mt-1.5 shrink-0" />
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Advice */}
            <div className="bg-zinc-50 dark:bg-zinc-900/40 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 mb-3">
                Recommended Verification Steps ({result.advice.length})
              </h3>
              <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
                {result.advice.map((adv, idx) => (
                  <li key={idx} className="flex items-start gap-2 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 mt-1.5 shrink-0" />
                    <span>{adv}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Staging Factor Breakdown if present */}
          {result.factors && result.factors.length > 0 && (
            <div className="mt-5 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/20 text-xs">
              <div className="font-mono text-[11px] font-bold text-zinc-500 uppercase mb-2">
                Staging Diagnostic Telemetry (Triggered Rule Factors)
              </div>
              <div className="space-y-1.5 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                {result.factors.map((factor, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{factor.id}</span>
                    <span>[{factor.severity}]</span>
                    <span>·</span>
                    <span className="text-zinc-500">{factor.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

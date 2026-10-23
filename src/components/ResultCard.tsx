import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Clock,
  Building,
  Mail,
  DollarSign,
} from 'lucide-react';
import { AnalyzeResponse, JobCheckRecord } from '../types';

interface ResultCardProps {
  result: AnalyzeResponse | null;
  lastRecord: JobCheckRecord | null;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result, lastRecord }) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!result) return null;

  const scorePercentage = Math.round(result.score * 100);

  // Badge and theme styles based on risk level
  const badgeConfig = {
    Low: {
      label: 'Low Risk',
      badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      barClass: 'bg-emerald-500',
      barTrackClass: 'bg-emerald-950/60',
      icon: ShieldCheck,
      description: 'Few or no fraudulent signals detected in the provided job posting.',
    },
    Medium: {
      label: 'Medium Risk',
      badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      barClass: 'bg-amber-500',
      barTrackClass: 'bg-amber-950/60',
      icon: AlertTriangle,
      description: 'Potentially questionable patterns found. Exercise vigilance before proceeding.',
    },
    High: {
      label: 'High Risk',
      badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      barClass: 'bg-rose-500',
      barTrackClass: 'bg-rose-950/60',
      icon: ShieldAlert,
      description: 'Multiple high-confidence scam markers detected. Strong caution advised.',
    },
  }[result.risk_level];

  const RiskIcon = badgeConfig.icon;

  const handleCopyReport = () => {
    const reportText = `JobSentry Risk Analysis Report
Risk Level: ${result.risk_level} (Score: ${result.score})
Company: ${lastRecord?.company || 'Not specified'}
Recruiter Email: ${lastRecord?.email || 'Not specified'}

Red Flags:
${result.red_flags.map((rf) => `- ${rf}`).join('\n')}

Recommended Advice:
${result.advice.map((adv) => `- ${adv}`).join('\n')}

Advisory Note: This is an advisory risk indicator, not proof of fraud.`;

    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="result-section" className="py-10 border-b border-slate-800/80 bg-slate-900/40">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-6 sm:p-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
          {/* Subtle top indicator bar */}
          <div className={`absolute top-0 left-0 right-0 h-1.5 ${badgeConfig.barClass}`} />

          {/* Result Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-700/80">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs uppercase font-bold tracking-widest text-slate-400">
                  Analysis Outcome
                </span>
                {lastRecord && (
                  <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {new Date(lastRecord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-extrabold text-white flex items-center gap-3">
                <span>Job Risk Assessment</span>
              </h2>
            </div>

            <div className="flex items-center gap-3">
              {/* Colour-coded Risk Badge */}
              <div
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-bold tracking-wide shadow-sm ${badgeConfig.badgeClass}`}
              >
                <RiskIcon className="w-4 h-4" />
                <span>{badgeConfig.label}</span>
              </div>

              {/* Copy Report */}
              <button
                type="button"
                onClick={handleCopyReport}
                className="p-2 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-300 border border-slate-600/60 transition-colors"
                title="Copy full advisory report"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submission metadata summary if provided */}
          {lastRecord && (lastRecord.company || lastRecord.email || lastRecord.salary) && (
            <div className="py-3 px-4 my-4 rounded-xl bg-slate-900/60 border border-slate-700/60 flex flex-wrap items-center gap-4 text-xs text-slate-300">
              {lastRecord.company && (
                <div className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-400">Company:</span>
                  <span className="font-semibold text-slate-200">{lastRecord.company}</span>
                </div>
              )}
              {lastRecord.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-400">Email:</span>
                  <span className="font-mono text-slate-200">{lastRecord.email}</span>
                </div>
              )}
              {lastRecord.salary && (
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-400">Salary:</span>
                  <span className="font-mono text-slate-200">${lastRecord.salary}</span>
                </div>
              )}
            </div>
          )}

          {/* Score as Progress Bar */}
          <div className="my-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">
                Calculated Risk Score: <strong className="text-white font-mono text-sm">{result.score}</strong>{' '}
                <span className="text-slate-400 font-normal">({scorePercentage}%)</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Scale: 0.00 (Safe) → 1.00 (Critical)
              </span>
            </div>

            {/* Bar Track */}
            <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden border border-slate-700/80 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${badgeConfig.barClass}`}
                style={{ width: `${Math.min(100, Math.max(5, scorePercentage))}%` }}
              />
            </div>

            <p className="mt-2 text-xs text-slate-400">{badgeConfig.description}</p>
          </div>

          {/* Grid: Red Flags & Advice */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-700/60">
            {/* Red Flags List */}
            <div className="bg-slate-900/60 rounded-xl p-5 border border-slate-700/60">
              <div className="flex items-center gap-2 mb-3 text-rose-400 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Identified Red Flags ({result.red_flags.length})</span>
              </div>
              <ul className="space-y-2.5">
                {result.red_flags.map((flag, idx) => (
                  <li key={idx} className="text-xs text-slate-200 flex items-start gap-2.5 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Advice List */}
            <div className="bg-slate-900/60 rounded-xl p-5 border border-slate-700/60">
              <div className="flex items-center gap-2 mb-3 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Recommended Verification Steps ({result.advice.length})</span>
              </div>
              <ul className="space-y-2.5">
                {result.advice.map((adv, idx) => (
                  <li key={idx} className="text-xs text-slate-200 flex items-start gap-2.5 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    <span>{adv}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

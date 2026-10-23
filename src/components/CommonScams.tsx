import React from 'react';
import { CreditCard, FileCheck2, MessageSquare, UserX, AlertOctagon } from 'lucide-react';

export const CommonScams: React.FC = () => {
  const scams = [
    {
      title: 'Upfront Registration & Training Fees',
      category: 'Financial Extortion',
      icon: CreditCard,
      summary:
        'Scammers ask applicants to pay for mandatory "documentation", "laptop insurance", or "background screening" before starting work.',
      warningSign: 'Legitimate employers never charge candidates to apply or receive equipment.',
    },
    {
      title: 'Fake Cheque & Home Office Equipment Fraud',
      category: 'Banking / Money Mule',
      icon: FileCheck2,
      summary:
        'Applicant receives an electronic cheque to deposit, then instructed to wire money to a specific "certified equipment vendor" before the cheque bounces.',
      warningSign: 'Never deposit cheques from unknown entities or wire money to third-party vendors.',
    },
    {
      title: 'Telegram & WhatsApp "Task Rating" Schemes',
      category: 'Crypto / Pig Butchering',
      icon: MessageSquare,
      summary:
        'Recruiters offer high daily pay ($300–$800) for trivial tasks like reviewing Google Maps places or liking YouTube videos, then require crypto top-ups.',
      warningSign: 'Official recruitment does not happen solely through private Telegram channels.',
    },
    {
      title: 'Brand Impersonation & Phishing',
      category: 'Identity Theft',
      icon: UserX,
      summary:
        'Criminals pose as HR representatives from Microsoft, Amazon, or TCS using fake domains (@microsoft-hiring.site) or free Gmail addresses.',
      warningSign: 'Always check if the open role exists on the company’s official careers page.',
    },
  ];

  return (
    <section className="py-14 border-b border-slate-800/80 bg-slate-900/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold mb-2 border border-amber-500/20">
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Fraud Awareness Guide</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Common Employment & Job Scams
          </h2>
          <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto">
            Recognize the standard operating procedures cybercriminals use to trap job seekers.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {scams.map((scam, idx) => {
            const Icon = scam.icon;
            return (
              <div
                key={idx}
                className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-5 hover:border-slate-600 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400/90 bg-amber-400/10 px-2 py-0.5 rounded-md">
                      {scam.category}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-slate-700/60 flex items-center justify-center text-slate-300">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{scam.title}</h3>
                  <p className="text-xs text-slate-300 mb-4 leading-relaxed">{scam.summary}</p>
                </div>

                <div className="pt-3 border-t border-slate-700/60 flex items-start gap-2 text-xs text-rose-300 font-medium">
                  <span className="font-bold text-rose-400 uppercase text-[10px] tracking-wider shrink-0 mt-0.5">
                    Rule:
                  </span>
                  <span>{scam.warningSign}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

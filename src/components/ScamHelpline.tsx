import React from 'react';
import { PhoneCall, Globe, ShieldAlert, CheckSquare, FileText, Ban } from 'lucide-react';

export const ScamHelpline: React.FC = () => {
  return (
    <section className="py-14 border-b border-slate-800/80">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="rounded-2xl border-2 border-rose-500/40 bg-gradient-to-b from-rose-950/30 via-slate-900 to-slate-900 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              Incident Response & Support
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
            What to Do If You’ve Been Scammed
          </h2>
          <p className="text-sm text-slate-300 max-w-2xl mb-8">
            If you have transferred funds or shared confidential financial/identity documents, act immediately to prevent further loss and initiate account freezes.
          </p>

          {/* Primary Action Helplines Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {/* National Helpline 1930 */}
            <div className="rounded-xl bg-slate-800/90 border border-rose-500/30 p-5 flex items-start gap-4 shadow-lg">
              <div className="w-12 h-12 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
                <PhoneCall className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-rose-400">
                  National Cyber Crime Helpline
                </span>
                <div className="text-3xl font-black text-white font-mono my-1 tracking-tight">
                  1930
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Call <strong>1930</strong> immediately within the initial "Golden Hour" of fraudulent money transfer to prompt beneficiary bank account freezing.
                </p>
              </div>
            </div>

            {/* Official Portal cybercrime.gov.in */}
            <div className="rounded-xl bg-slate-800/90 border border-indigo-500/30 p-5 flex items-start gap-4 shadow-lg">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shrink-0">
                <Globe className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-indigo-400">
                  Official Reporting Portal
                </span>
                <div className="text-lg font-bold text-white font-mono my-1 tracking-tight">
                  <a
                    href="https://cybercrime.gov.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline text-indigo-300 inline-flex items-center gap-1.5"
                  >
                    cybercrime.gov.in
                  </a>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Register a formal cyber fraud complaint on <strong>cybercrime.gov.in</strong> with evidence, UPI IDs, bank statement entries, and suspect details.
                </p>
              </div>
            </div>
          </div>

          {/* Immediate Step-by-Step Checklist */}
          <div className="pt-6 border-t border-slate-800">
            <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-emerald-400" />
              <span>Immediate 4-Step Damage Control Checklist</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <Ban className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Freeze Bank Cards / NetBanking:</strong> Contact your bank’s 24/7 fraud desk to block net banking, UPI, and compromised payment cards.
                </span>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <FileText className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Preserve Evidence:</strong> Take screenshots of all WhatsApp/Telegram chats, emails, payment receipts, UTR numbers, and phone numbers.
                </span>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <Globe className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Report on cybercrime.gov.in:</strong> Submit the full incident narrative and attach the transaction IDs to generate an official acknowledgment.
                </span>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Identity Theft Protection:</strong> If you sent Aadhaar, PAN, or Passport scans, report potential document misuse to local law enforcement.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

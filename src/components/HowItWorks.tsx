import React from 'react';
import { ClipboardCheck, Cpu, ShieldAlert } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      num: '01',
      icon: ClipboardCheck,
      title: 'Submit Posting Details',
      desc: 'Paste the raw text of the job description, recruiter contact email, company name, and stated compensation.',
    },
    {
      num: '02',
      icon: Cpu,
      title: 'Structural Risk Inspection',
      desc: 'The scanner analyzes domain legitimacy, upfront money/deposit demands, untraceable chat apps, and salary inconsistencies.',
    },
    {
      num: '03',
      icon: ShieldAlert,
      title: 'Advisory Risk Score & Guidance',
      desc: 'Get an immediate Low/Medium/High risk evaluation, flagged warning indicators, and concrete safety verification steps.',
    },
  ];

  return (
    <section className="py-14 border-b border-slate-800/80">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            Transparent Process
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            How It Works in 3 Steps
          </h2>
          <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto">
            A fast, structured pre-check that surfaces high-risk signals before you expose sensitive personal details or funds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 relative hover:border-slate-600 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-2xl font-black font-mono text-slate-700">
                      {step.num}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

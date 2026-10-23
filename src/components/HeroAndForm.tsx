import React, { useState } from 'react';
import {
  ClipboardPaste,
  Sparkles,
  RotateCcw,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { JobCheckInput } from '../shared/contracts';
import { EXAMPLE_JOBS } from '../data/examples';

interface HeroAndFormProps {
  formData: JobCheckInput;
  setFormData: React.Dispatch<React.SetStateAction<JobCheckInput>>;
  onAnalyze: () => void;
  isLoading: boolean;
  errorMessage: string | null;
  fieldErrors: { [key: string]: string };
  onClear: () => void;
}

export const HeroAndForm: React.FC<HeroAndFormProps> = ({
  formData,
  setFormData,
  onAnalyze,
  isLoading,
  errorMessage,
  fieldErrors,
  onClear,
}) => {
  const [showExampleMenu, setShowExampleMenu] = useState<boolean>(false);
  const [pasteSuccess, setPasteSuccess] = useState<boolean>(false);

  const handleInputChange = (field: keyof JobCheckInput, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleApplyExample = (index: number) => {
    const ex = EXAMPLE_JOBS[index];
    setFormData({
      jobText: ex.data.job_text,
      email: ex.data.email,
      company: ex.data.company,
      salary: ex.data.salary,
      stage: formData.stage,
    });
    setShowExampleMenu(false);
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setFormData((prev) => ({
          ...prev,
          jobText: text,
        }));
        setPasteSuccess(true);
        setTimeout(() => setPasteSuccess(false), 1500);
      }
    } catch {
      // Clipboard access denied
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAnalyze();
  };

  return (
    <section id="scanner" className="relative pt-12 pb-14 border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Editorial Hero */}
        <div className="text-center space-y-3 mb-10 animate-text-reveal">
          <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest flex items-center justify-center gap-2">
            <span>Pre-Application Advisory Engine</span>
            <span>·</span>
            <span>Zero Fallback Invariants</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 leading-tight [text-wrap:balance]">
            Inspect any job posting before you apply.
          </h1>

          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto font-normal">
            Detect suspicious recruiter email domains, upfront fee demands, and unmonitored chat channels in seconds.
          </p>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl border border-zinc-900 bg-zinc-950 text-white dark:border-zinc-200 dark:bg-zinc-100 dark:text-zinc-950 flex items-start gap-3 animate-fade-in text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block mb-0.5">Validation Requirement:</strong>
              {errorMessage}
            </div>
          </div>
        )}

        {/* Main Analysis Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-7 shadow-sm transition-colors"
        >
          {/* Header & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">Job Description / Posting</span>
              <span className="text-zinc-400">·</span>
              <span className="text-zinc-500 text-[11px]">Required text</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Paste Button */}
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="text-xs px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 transition-colors"
              >
                {pasteSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
                    <span>Pasted</span>
                  </>
                ) : (
                  <>
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span>Paste</span>
                  </>
                )}
              </button>

              {/* Try Example */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowExampleMenu(!showExampleMenu)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Try Example</span>
                </button>

                {showExampleMenu && (
                  <div className="absolute right-0 top-full mt-2 w-72 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl z-50 p-2 space-y-1">
                    <div className="px-2 py-1 text-[11px] font-mono uppercase text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                      Sample Scenarios
                    </div>
                    {EXAMPLE_JOBS.map((ex, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyExample(idx)}
                        className="w-full text-left p-2 rounded-lg text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex flex-col"
                      >
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{ex.title}</span>
                        <span className="text-[11px] text-zinc-500">{ex.subtitle}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reset */}
              {(formData.jobText || formData.email || formData.company || formData.salary) && (
                <button
                  type="button"
                  onClick={onClear}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                  title="Clear all fields"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Text Area */}
          <div className="mb-4">
            <textarea
              id="jobText"
              name="jobText"
              rows={6}
              value={formData.jobText || ''}
              onChange={(e) => handleInputChange('jobText', e.target.value)}
              placeholder="Paste full job posting, recruiter email body, LinkedIn message, or Telegram offer..."
              className={`w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 text-xs sm:text-sm transition-all resize-y ${
                fieldErrors.jobText
                  ? 'border-zinc-900 dark:border-zinc-100 focus:ring-zinc-900'
                  : 'border-zinc-200 dark:border-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-600 focus:ring-zinc-400'
              }`}
            />
            {fieldErrors.jobText && (
              <p className="mt-1 text-xs text-zinc-900 dark:text-zinc-100 font-medium">
                {fieldErrors.jobText}
              </p>
            )}
          </div>

          {/* Metadata Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Recruiter Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="recruiter@company.com"
                className={`w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none text-xs transition-all ${
                  fieldErrors.email
                    ? 'border-zinc-900 dark:border-zinc-100'
                    : 'border-zinc-200 dark:border-zinc-800 focus:border-zinc-400'
                }`}
              />
              {fieldErrors.email && (
                <p className="mt-1 text-[11px] text-zinc-900 dark:text-zinc-100 font-medium">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="company" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Company Name
              </label>
              <input
                type="text"
                id="company"
                name="company"
                value={formData.company || ''}
                onChange={(e) => handleInputChange('company', e.target.value)}
                placeholder="e.g. Stripe, Acme Corp"
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 text-xs transition-all"
              />
            </div>

            <div>
              <label htmlFor="salary" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Salary / Pay
              </label>
              <input
                type="text"
                id="salary"
                name="salary"
                value={formData.salary || ''}
                onChange={(e) => handleInputChange('salary', e.target.value)}
                placeholder="e.g. 85000"
                className={`w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none text-xs transition-all ${
                  fieldErrors.salary
                    ? 'border-zinc-900 dark:border-zinc-100'
                    : 'border-zinc-200 dark:border-zinc-800 focus:border-zinc-400'
                }`}
              />
              {fieldErrors.salary && (
                <p className="mt-1 text-[11px] text-zinc-900 dark:text-zinc-100 font-medium">
                  {fieldErrors.salary}
                </p>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <div className="text-xs text-zinc-500 flex items-center gap-2">
              <span>Results are stored in local audit history</span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs text-white dark:text-zinc-950 bg-zinc-950 dark:bg-zinc-100 hover:opacity-90 transition-all flex items-center justify-center gap-2 ${
                isLoading ? 'opacity-70 cursor-not-allowed' : 'active:scale-[0.98]'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Evaluating Posting...</span>
                </>
              ) : (
                <span>Analyze Job Posting</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

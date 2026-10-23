import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  AlertCircle,
  Briefcase,
  Mail,
  Building,
  DollarSign,
  ClipboardPaste,
  RotateCcw,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { AnalyzeRequest } from '../types';
import { EXAMPLE_JOBS } from '../data/examples';

interface HeroAndFormProps {
  formData: AnalyzeRequest;
  setFormData: React.Dispatch<React.SetStateAction<AnalyzeRequest>>;
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
  const [selectedExampleIndex, setSelectedExampleIndex] = useState<number>(0);
  const [showExampleMenu, setShowExampleMenu] = useState<boolean>(false);
  const [pasteSuccess, setPasteSuccess] = useState<boolean>(false);

  const handleInputChange = (field: keyof AnalyzeRequest, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleApplyExample = (index: number) => {
    const ex = EXAMPLE_JOBS[index];
    setFormData({
      job_text: ex.data.job_text,
      email: ex.data.email,
      company: ex.data.company,
      salary: ex.data.salary,
    });
    setSelectedExampleIndex(index);
    setShowExampleMenu(false);
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setFormData((prev) => ({
          ...prev,
          job_text: text,
        }));
        setPasteSuccess(true);
        setTimeout(() => setPasteSuccess(false), 2000);
      }
    } catch (err) {
      console.warn('Clipboard read error or not permitted', err);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAnalyze();
  };

  return (
    <section className="relative pt-8 pb-12 sm:pt-12 sm:pb-16 border-b border-slate-800/80">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* 1. Hero with a one-line promise */}
        <div className="text-center space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs sm:text-sm font-semibold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
            Job Applicant Defense & Safety Scanner
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Check any job posting <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400">before applying</span>.
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal">
            Spot scam triggers, recruiter domain anomalies, upfront fee demands, and unsafe contact methods in seconds.
          </p>
        </div>

        {/* Global Error Banner (backend down / general validation) */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3 shadow-lg shadow-rose-950/20 animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong className="font-semibold block text-rose-200">Action Required:</strong>
              {errorMessage}
            </div>
          </div>
        )}

        {/* 2. Form: job description, recruiter email, company name, salary + Analyze button */}
        <form onSubmit={handleSubmit} className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 sm:p-7 shadow-2xl backdrop-blur-sm">
          {/* Paste Box Header & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <label htmlFor="job_text" className="block text-sm font-semibold text-slate-200 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-indigo-400" />
              <span>Job Description / Posting Text</span>
              <span className="text-rose-400 text-xs font-bold">*Required</span>
            </label>

            <div className="flex items-center gap-2">
              {/* Quick Paste from clipboard */}
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 border border-slate-600/60 flex items-center gap-1.5 transition-colors"
                title="Paste directly from your clipboard"
              >
                {pasteSuccess ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Pasted!</span>
                  </>
                ) : (
                  <>
                    <ClipboardPaste className="w-3.5 h-3.5 text-slate-400" />
                    <span>Paste Box</span>
                  </>
                )}
              </button>

              {/* 3. “Try example” button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowExampleMenu(!showExampleMenu)}
                  className="text-xs px-3 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Try Example</span>
                </button>

                {showExampleMenu && (
                  <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl z-50 p-2 space-y-1">
                    <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                      Select Sample Scenario
                    </div>
                    {EXAMPLE_JOBS.map((ex, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyExample(idx)}
                        className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex flex-col ${
                          selectedExampleIndex === idx
                            ? 'bg-indigo-600/30 border border-indigo-500/50 text-indigo-200'
                            : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <span className="font-semibold text-slate-100">{ex.title}</span>
                        <span className="text-[11px] text-slate-400">{ex.subtitle}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reset / Clear Button */}
              {(formData.job_text || formData.email || formData.company || formData.salary) && (
                <button
                  type="button"
                  onClick={onClear}
                  className="text-xs px-2 py-1 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
                  title="Clear all fields"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Job text area */}
          <div className="mb-4">
            <textarea
              id="job_text"
              name="job_text"
              rows={6}
              value={formData.job_text}
              onChange={(e) => handleInputChange('job_text', e.target.value)}
              placeholder="Paste the full job description, email message, LinkedIn/Indeed posting, or WhatsApp message here..."
              className={`w-full px-4 py-3 rounded-xl bg-slate-900/90 border text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all resize-y ${
                fieldErrors.job_text
                  ? 'border-rose-500 focus:ring-rose-500'
                  : 'border-slate-700 focus:border-indigo-500'
              }`}
            />
            {fieldErrors.job_text && (
              <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {fieldErrors.job_text}
              </p>
            )}
          </div>

          {/* Additional fields grid: recruiter email, company name, salary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {/* Recruiter Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Recruiter Email</span>
                <span className="text-slate-500 text-[11px] font-normal">(optional)</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="e.g. hr@company.com"
                className={`w-full px-3.5 py-2 rounded-xl bg-slate-900/90 border text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 text-xs transition-all ${
                  fieldErrors.email
                    ? 'border-rose-500 focus:ring-rose-500'
                    : 'border-slate-700 focus:ring-indigo-500 focus:border-indigo-500'
                }`}
              />
              {fieldErrors.email && (
                <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Company Name */}
            <div>
              <label htmlFor="company" className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>Company Name</span>
                <span className="text-slate-500 text-[11px] font-normal">(optional)</span>
              </label>
              <input
                type="text"
                id="company"
                name="company"
                value={formData.company || ''}
                onChange={(e) => handleInputChange('company', e.target.value)}
                placeholder="e.g. Stripe, Infosys, Amazon"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs transition-all"
              />
            </div>

            {/* Salary */}
            <div>
              <label htmlFor="salary" className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                <span>Salary / Rate</span>
                <span className="text-slate-500 text-[11px] font-normal">(number or blank)</span>
              </label>
              <input
                type="text"
                id="salary"
                name="salary"
                value={formData.salary || ''}
                onChange={(e) => handleInputChange('salary', e.target.value)}
                placeholder="e.g. 75000"
                className={`w-full px-3.5 py-2 rounded-xl bg-slate-900/90 border text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 text-xs transition-all ${
                  fieldErrors.salary
                    ? 'border-rose-500 focus:ring-rose-500'
                    : 'border-slate-700 focus:ring-indigo-500 focus:border-indigo-500'
                }`}
              />
              {fieldErrors.salary && (
                <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.salary}
                </p>
              )}
            </div>
          </div>

          {/* Form Actions: Analyze button with loading spinner */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-700/60">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 order-2 sm:order-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
              All submissions are checked and automatically logged in local checks history.
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full sm:w-auto px-7 py-3 rounded-xl font-bold text-sm text-white shadow-xl flex items-center justify-center gap-2.5 transition-all order-1 sm:order-2 ${
                isLoading
                  ? 'bg-indigo-600/60 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] shadow-indigo-600/30'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Analyzing Posting...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 text-white" />
                  <span>Analyze Job Posting</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

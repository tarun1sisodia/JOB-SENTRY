import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroAndForm } from './components/HeroAndForm';
import { ResultCard } from './components/ResultCard';
import { HowItWorks } from './components/HowItWorks';
import { CommonScams } from './components/CommonScams';
import { ScamHelpline } from './components/ScamHelpline';
import { HistoryTable } from './components/HistoryTable';
import { Disclaimer } from './components/Disclaimer';
import { AnalyzeRequest, AnalyzeResponse, JobCheckRecord } from './types';
import {
  analyzeJobAPI,
  getStoredChecks,
  clearStoredChecks,
  validateJobInput,
} from './services/api';

export const App: React.FC = () => {
  const [formData, setFormData] = useState<AnalyzeRequest>({
    job_text: '',
    email: '',
    company: '',
    salary: '',
  });

  const [useHeuristics, setUseHeuristics] = useState<boolean>(false);
  const [simulateBackendDown, setSimulateBackendDown] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [lastSavedRecord, setLastSavedRecord] = useState<JobCheckRecord | null>(null);
  const [historyRecords, setHistoryRecords] = useState<JobCheckRecord[]>([]);

  // Load past checks on mount
  useEffect(() => {
    const checks = getStoredChecks();
    setHistoryRecords(checks);
  }, []);

  const handleClearForm = () => {
    setFormData({
      job_text: '',
      email: '',
      company: '',
      salary: '',
    });
    setFieldErrors({});
    setErrorMessage(null);
  };

  const handleAnalyze = async () => {
    setErrorMessage(null);
    setFieldErrors({});

    // Client-side quick check
    const validation = validateJobInput(formData);
    if (!validation.isValid) {
      if (validation.field) {
        setFieldErrors({ [validation.field]: validation.error || 'Invalid input' });
      }
      setErrorMessage(validation.error || 'Please check your inputs.');
      return;
    }

    setIsLoading(true);

    try {
      const outcome = await analyzeJobAPI(formData, {
        useHeuristics,
        simulateBackendDown,
        latencyMs: 650,
      });

      setResult(outcome.response);
      setLastSavedRecord(outcome.record);

      // Refresh history records from database
      const updatedHistory = getStoredChecks();
      setHistoryRecords(updatedHistory);

      // Smooth scroll to the result card
      setTimeout(() => {
        const resultEl = document.getElementById('result-section');
        if (resultEl) {
          resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    clearStoredChecks();
    setHistoryRecords([]);
  };

  const handleSelectRecord = (record: JobCheckRecord) => {
    setFormData({
      job_text: record.job_text,
      email: record.email || '',
      company: record.company || '',
      salary: record.salary || '',
    });
    setResult({
      risk_level: record.risk_level,
      score: record.score,
      red_flags:
        record.risk_level === 'High'
          ? ['Free email domain', 'Asks for registration fee']
          : record.risk_level === 'Medium'
          ? ['Unverified email provider', 'Vague company details']
          : ['No overt automated red flags detected'],
      advice:
        record.risk_level === 'High'
          ? ['Never pay for a job', 'Verify the company website']
          : ['Verify recruiter on LinkedIn and check official careers portal'],
    });
    setLastSavedRecord(record);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Sticky Navigation */}
      <Navbar
        useHeuristics={useHeuristics}
        setUseHeuristics={setUseHeuristics}
        simulateBackendDown={simulateBackendDown}
        setSimulateBackendDown={setSimulateBackendDown}
        historyCount={historyRecords.length}
      />

      <main className="flex-1">
        {/* 1. Hero with a one-line promise and a paste box */}
        {/* 2. Form: job description, recruiter email, company name, salary, plus an Analyze button */}
        {/* 3. “Try example” button */}
        <HeroAndForm
          formData={formData}
          setFormData={setFormData}
          onAnalyze={handleAnalyze}
          isLoading={isLoading}
          errorMessage={errorMessage}
          fieldErrors={fieldErrors}
          onClear={handleClearForm}
        />

        {/* 4. Result card: colour-coded risk badge (green Low, orange Medium, red High), score as a progress bar, red flags list, advice list */}
        <ResultCard result={result} lastRecord={lastSavedRecord} />

        {/* 5. “How it works” in 3 steps */}
        <HowItWorks />

        {/* 6. Common scams section */}
        <CommonScams />

        {/* 7. What to do if you’ve been scammed: cybercrime.gov.in, helpline 1930 */}
        <ScamHelpline />

        {/* 8. History table of past checks */}
        <HistoryTable
          records={historyRecords}
          onClearHistory={handleClearHistory}
          onSelectRecord={handleSelectRecord}
        />
      </main>

      {/* 9. Disclaimer: “This is an advisory risk indicator, not proof of fraud” */}
      <Disclaimer />
    </div>
  );
};

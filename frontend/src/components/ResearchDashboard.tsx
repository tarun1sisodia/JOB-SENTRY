import React, { useEffect, useState } from 'react';
import { ResearchMetricsExport } from '../../shared/contracts';
import { API_BASE } from '../services/api';

interface ResearchMetricsResponse {
  success: boolean;
  data?: ResearchMetricsExport;
  error?: string;
}

function formatThreshold(row: { threshold_name: string; threshold: number }): string {
  const digits = row.threshold_name === 'default_0.5' ? 2 : 4;
  return row.threshold.toFixed(digits);
}

function MetricTable({
  rows,
}: {
  rows: Array<{
    threshold_name: string;
    threshold: number;
    precision: number;
    recall: number;
    f1: number;
    roc_auc: number;
    confusion: { tn: number; fp: number; fn: number; tp: number };
  }>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs font-mono">
        <thead className="text-zinc-500 uppercase border-b border-zinc-200 dark:border-zinc-800">
          <tr>
            <th className="py-2 pr-4">Threshold</th>
            <th className="py-2 px-2">Precision</th>
            <th className="py-2 px-2">Recall</th>
            <th className="py-2 px-2">F1</th>
            <th className="py-2 px-2">ROC-AUC</th>
            <th className="py-2 px-2">TN</th>
            <th className="py-2 px-2">FP</th>
            <th className="py-2 px-2">FN</th>
            <th className="py-2 pl-2">TP</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.map((row) => (
            <tr key={row.threshold_name}>
              <td className="py-2 pr-4">
                <span className="block font-semibold">
                  {row.threshold_name === 'validation_tuned'
                    ? 'Validation-selected threshold'
                    : 'Default threshold'}
                </span>
                <span>{formatThreshold(row)}</span>
              </td>
              <td className="py-2 px-2">{row.precision.toFixed(4)}</td>
              <td className="py-2 px-2">{row.recall.toFixed(4)}</td>
              <td className="py-2 px-2">{row.f1.toFixed(4)}</td>
              <td className="py-2 px-2">{row.roc_auc.toFixed(4)}</td>
              <td className="py-2 px-2">{row.confusion.tn}</td>
              <td className="py-2 px-2">{row.confusion.fp}</td>
              <td className="py-2 px-2">{row.confusion.fn}</td>
              <td className="py-2 pl-2">{row.confusion.tp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const ResearchDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<ResearchMetricsExport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/research/metrics`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Research metrics request failed (HTTP ${response.status}).`);
        }
        return (await response.json()) as ResearchMetricsResponse;
      })
      .then((response) => {
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Research metrics response was invalid.');
        }
        setMetrics(response.data);
      })
      .catch((loadError: unknown) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Research metrics could not be loaded.'
        );
      });
  }, []);

  if (error) {
    return (
      <section className="py-12 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-sm text-rose-700 dark:text-rose-300">
          Research metrics unavailable: {error}
        </div>
      </section>
    );
  }

  if (!metrics) {
    return (
      <section className="py-12 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-sm text-zinc-500">
          Loading research metrics…
        </div>
      </section>
    );
  }

  const coefficientGroups = [
    { heading: 'Positive coefficients', items: metrics.deployed_coefficients.positive },
    { heading: 'Negative coefficients', items: metrics.deployed_coefficients.negative },
  ];

  return (
    <section className="py-12 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        <header className="text-center">
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
            Research model evaluation
          </p>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-zinc-950 dark:text-zinc-50">
            Reported validation and test metrics
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Test set: {metrics.testSet.total_postings.toLocaleString()} postings,{' '}
            {metrics.testSet.fraudulent.toLocaleString()} fraudulent.
          </p>
        </header>

        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
          <h3 className="text-lg font-bold mb-1">Research model</h3>
          <p className="text-sm text-zinc-500 mb-4">
            Configuration: <span className="font-mono">{metrics.researchModel.config}</span>
          </p>
          <MetricTable rows={metrics.researchModel.test_metrics} />
        </section>

        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
          <h3 className="text-lg font-bold mb-4">Ablation results</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-zinc-500 uppercase border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-2 pr-3">Split</th>
                  <th className="py-2 px-2">Configuration</th>
                  <th className="py-2 px-2">Threshold</th>
                  <th className="py-2 px-2">Precision</th>
                  <th className="py-2 px-2">Recall</th>
                  <th className="py-2 px-2">F1</th>
                  <th className="py-2 px-2">ROC-AUC</th>
                  <th className="py-2 pl-2">PR-AUC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {metrics.ablation_metrics.map((row, index) => (
                  <tr key={`${row.split}-${row.config}-${row.threshold_name}-${index}`}>
                    <td className="py-2 pr-3">{row.split}</td>
                    <td className="py-2 px-2" title={row.description}>{row.config}</td>
                    <td className="py-2 px-2">{formatThreshold(row)}</td>
                    <td className="py-2 px-2">{row.precision.toFixed(4)}</td>
                    <td className="py-2 px-2">{row.recall.toFixed(4)}</td>
                    <td className="py-2 px-2">{row.f1.toFixed(4)}</td>
                    <td className="py-2 px-2">{row.roc_auc.toFixed(4)}</td>
                    <td className="py-2 pl-2">{row.pr_auc.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
          <h3 className="text-lg font-bold mb-4">Cross-validation</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-zinc-500 uppercase border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-2 pr-3">Split method</th>
                  <th className="py-2 px-2">Precision mean ± std</th>
                  <th className="py-2 px-2">Recall mean ± std</th>
                  <th className="py-2 pl-2">F1 mean ± std</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {metrics.grouped_cv.map((row) => (
                  <tr key={row.cv_type}>
                    <td className="py-2 pr-3">{row.cv_type}</td>
                    <td className="py-2 px-2">
                      {row.precision_mean.toFixed(4)} ± {row.precision_std.toFixed(4)}
                    </td>
                    <td className="py-2 px-2">
                      {row.recall_mean.toFixed(4)} ± {row.recall_std.toFixed(4)}
                    </td>
                    <td className="py-2 pl-2">
                      {row.f1_mean.toFixed(4)} ± {row.f1_std.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
          <h3 className="text-lg font-bold mb-1">Text-only prototype</h3>
          <p className="text-sm text-zinc-500 mb-4">
            Test results at the validation-selected and default thresholds.
          </p>
          <MetricTable rows={metrics.deployed_metrics} />
        </section>

        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
          <h3 className="text-lg font-bold mb-4">Deployed-model coefficients</h3>
          <div className="grid gap-6 md:grid-cols-2">
            {coefficientGroups.map(({ heading, items }) => (
              <div key={heading}>
                <h4 className="font-semibold mb-2">{heading}</h4>
                <ol className="space-y-1 text-xs font-mono">
                  {items.map((item) => (
                    <li
                      key={item.feature}
                      className="flex justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 py-1"
                    >
                      <span>{item.feature}</span>
                      <span>{item.coefficient.toFixed(6)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
};

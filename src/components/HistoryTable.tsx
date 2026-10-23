import React, { useState } from 'react';
import { Search, Trash2, Download, Eye, X, Calendar } from 'lucide-react';
import { JobAuditRecord, RiskLevel } from '../shared/contracts';

interface HistoryTableProps {
  records: JobAuditRecord[];
  onClearHistory: () => void;
  onSelectRecord: (record: JobAuditRecord) => void;
}

export const HistoryTable: React.FC<HistoryTableProps> = ({
  records,
  onClearHistory,
  onSelectRecord,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterRisk, setFilterRisk] = useState<string>('ALL');
  const [activeRecord, setActiveRecord] = useState<JobAuditRecord | null>(null);

  const filteredRecords = records.filter((rec) => {
    const matchesSearch =
      rec.jobText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.company && rec.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (rec.email && rec.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      rec.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRisk = filterRisk === 'ALL' || rec.riskLevel === filterRisk;
    return matchesSearch && matchesRisk;
  });

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jobsentry_audit_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRiskLabel = (level: RiskLevel) => {
    return (
      <span className="font-mono text-xs font-bold text-zinc-950 dark:text-zinc-50">
        {level}
      </span>
    );
  };

  return (
    <section id="history" className="py-14 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider mb-1">
              Audit Invariant Database · SQLite Schema: checks
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-zinc-50">
              Inspection History Log
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Every analyzed job posting is persisted with timestamp and evaluation score.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportJSON}
              disabled={records.length === 0}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (window.confirm('Clear all stored audit records?')) {
                  onClearHistory();
                }
              }}
              disabled={records.length === 0}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-950 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-950 text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by company, email, text..."
              className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-zinc-500 shrink-0">Filter:</span>
            <div className="flex items-center p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs bg-white dark:bg-zinc-900">
              {['ALL', 'High', 'Medium', 'Low'].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setFilterRisk(lvl)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    filterRisk === lvl
                      ? 'bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 font-semibold'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-700 dark:text-zinc-300">
              <thead className="bg-zinc-50 dark:bg-zinc-900/60 text-zinc-500 uppercase tracking-wider text-[11px] font-mono border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold">ID / Time</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Company</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Email</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Salary</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Risk</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Score</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Snippet</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-zinc-500 text-xs">
                      No matching records found. Submissions will be logged here automatically.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-mono text-zinc-900 dark:text-zinc-100 font-semibold">{rec.id}</div>
                        <div className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5 font-mono">
                          <Calendar className="w-2.5 h-2.5" />
                          {new Date(rec.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap font-medium text-zinc-900 dark:text-zinc-100">
                        {rec.company || <span className="text-zinc-400 font-normal italic">None</span>}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px]">
                        {rec.email || <span className="text-zinc-400 font-sans italic">None</span>}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap font-mono tabular-nums">
                        {rec.salary ? `$${rec.salary}` : <span className="text-zinc-400 font-sans">—</span>}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {getRiskLabel(rec.riskLevel)}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap font-mono font-bold tabular-nums text-zinc-950 dark:text-zinc-50">
                        {rec.score}
                      </td>

                      <td className="px-4 py-3 max-w-xs truncate text-zinc-500">
                        {rec.jobText}
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setActiveRecord(rec)}
                          className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs text-zinc-700 dark:text-zinc-300 font-medium transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {activeRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl relative">
              <div className="flex items-start justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <div className="flex items-center gap-2 mb-1 font-mono text-xs">
                    <span className="text-zinc-500">{activeRecord.id}</span>
                    <span>·</span>
                    <span className="font-bold text-zinc-950 dark:text-zinc-50">{activeRecord.riskLevel} Risk</span>
                    <span>·</span>
                    <span className="tabular-nums">Score {activeRecord.score}</span>
                  </div>
                  <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">Audit Record Details</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveRecord(null)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 font-mono">
                  <div>
                    <span className="text-zinc-400 block text-[10px] uppercase">Company</span>
                    <strong className="text-zinc-900 dark:text-zinc-100 text-xs">{activeRecord.company || 'None'}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px] uppercase">Email</span>
                    <strong className="text-zinc-900 dark:text-zinc-100 text-xs">{activeRecord.email || 'None'}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px] uppercase">Salary</span>
                    <strong className="text-zinc-900 dark:text-zinc-100 text-xs">{activeRecord.salary ? `$${activeRecord.salary}` : 'None'}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px] uppercase">Stage</span>
                    <strong className="text-zinc-900 dark:text-zinc-100 text-xs capitalize">{activeRecord.stage}</strong>
                  </div>
                </div>

                <div>
                  <span className="text-zinc-500 block font-semibold mb-1">Full Posting Text:</span>
                  <div className="p-3.5 rounded-xl bg-zinc-100/50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap font-mono text-[11px] leading-relaxed max-h-56 overflow-y-auto">
                    {activeRecord.jobText}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-[11px] text-zinc-500 font-mono">
                  Recorded at {new Date(activeRecord.createdAt).toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onSelectRecord(activeRecord);
                    setActiveRecord(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 font-semibold text-xs transition-opacity hover:opacity-90"
                >
                  Load into Scanner
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

import React, { useState } from 'react';
import {
  Database,
  Search,
  Trash2,
  Download,
  Eye,
  X,
  Calendar,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { JobCheckRecord, RiskLevel } from '../types';

interface HistoryTableProps {
  records: JobCheckRecord[];
  onClearHistory: () => void;
  onSelectRecord: (record: JobCheckRecord) => void;
}

export const HistoryTable: React.FC<HistoryTableProps> = ({
  records,
  onClearHistory,
  onSelectRecord,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterRisk, setFilterRisk] = useState<string>('ALL');
  const [activeModalRecord, setActiveModalRecord] = useState<JobCheckRecord | null>(null);

  // Filter records
  const filteredRecords = records.filter((rec) => {
    const matchesSearch =
      rec.job_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.company && rec.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (rec.email && rec.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      rec.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRisk = filterRisk === 'ALL' || rec.risk_level === filterRisk;

    return matchesSearch && matchesRisk;
  });

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jobsentry_checks_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRiskBadge = (level: RiskLevel) => {
    switch (level) {
      case 'High':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="w-3 h-3" />
            High
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3" />
            Medium
          </span>
        );
      case 'Low':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-3 h-3" />
            Low
          </span>
        );
    }
  };

  return (
    <section id="history-section" className="py-14 border-b border-slate-800/80 bg-slate-900/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 text-xs font-mono">
                SQLite checks(id, job_text, email, company, salary, risk_level, score, created_at)
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
              <Database className="w-7 h-7 text-indigo-400" />
              <span>Inspection History Database</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Every analyzed job posting is recorded with timestamp and evaluation score.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportJSON}
              disabled={records.length === 0}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Export all records as JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all history records?')) {
                  onClearHistory();
                }
              }}
              disabled={records.length === 0}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Clear all stored checks"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by company, email, text..."
              className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-400 shrink-0">Risk filter:</span>
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs w-full sm:w-auto justify-between sm:justify-start">
              {['ALL', 'High', 'Medium', 'Low'].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setFilterRisk(lvl)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    filterRisk === lvl
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="rounded-2xl border border-slate-700/80 bg-slate-800/40 overflow-hidden shadow-xl backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-700/80">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">ID / Time</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Company</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Email</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Salary</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Risk Level</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Score</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Job Posting Snippet</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                      No matching check records found. Analyze a job posting above to add to history.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec) => (
                    <tr
                      key={rec.id}
                      className="hover:bg-slate-800/60 transition-colors group"
                    >
                      {/* ID & Time */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-mono text-[11px] text-indigo-400 font-semibold">{rec.id}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-2.5 h-2.5" />
                          {new Date(rec.created_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Company */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {rec.company ? (
                          <span className="font-semibold text-slate-100">{rec.company}</span>
                        ) : (
                          <span className="text-slate-500 italic">None</span>
                        )}
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px]">
                        {rec.email ? (
                          <span className="text-slate-300">{rec.email}</span>
                        ) : (
                          <span className="text-slate-500 italic font-sans">None</span>
                        )}
                      </td>

                      {/* Salary */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono">
                        {rec.salary ? `$${rec.salary}` : <span className="text-slate-500 italic font-sans">—</span>}
                      </td>

                      {/* Risk Badge */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getRiskBadge(rec.risk_level)}
                      </td>

                      {/* Score */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono font-bold text-slate-200">
                        {rec.score}
                      </td>

                      {/* Job Snippet */}
                      <td className="px-4 py-3 max-w-xs truncate text-slate-400">
                        {rec.job_text}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setActiveModalRecord(rec)}
                          className="px-2.5 py-1 rounded-lg bg-slate-700/60 hover:bg-indigo-600 hover:text-white text-slate-300 text-xs font-medium transition-colors inline-flex items-center gap-1"
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

        {/* Record Detail Modal */}
        {activeModalRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl relative">
              <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-indigo-400 font-bold">
                      {activeModalRecord.id}
                    </span>
                    {getRiskBadge(activeModalRecord.risk_level)}
                  </div>
                  <h3 className="text-lg font-bold text-white">Record Details & Job Posting</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModalRecord(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-4 text-xs">
                {/* Meta grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Company</span>
                    <strong className="text-white text-xs">{activeModalRecord.company || 'Not provided'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Email</span>
                    <strong className="text-white text-xs font-mono">{activeModalRecord.email || 'Not provided'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Salary</span>
                    <strong className="text-white text-xs font-mono">{activeModalRecord.salary ? `$${activeModalRecord.salary}` : 'None'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Risk Score</span>
                    <strong className="text-white text-xs font-mono">{activeModalRecord.score}</strong>
                  </div>
                </div>

                {/* Full job text */}
                <div>
                  <span className="text-slate-400 block font-semibold mb-1">Analyzed Job Description:</span>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 whitespace-pre-wrap font-mono text-[11px] leading-relaxed max-h-56 overflow-y-auto">
                    {activeModalRecord.job_text}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Recorded on {new Date(activeModalRecord.created_at).toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onSelectRecord(activeModalRecord);
                    setActiveModalRecord(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
                >
                  Load into Form to Re-analyze
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

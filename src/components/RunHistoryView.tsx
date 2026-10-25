import React, { useState } from 'react';
import { 
  History, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  TrendingDown, 
  GitCompare,
  Clock,
  Sparkles,
  Zap
} from 'lucide-react';
import { ValidationRun } from '../types';

interface RunHistoryViewProps {
  runs: ValidationRun[];
  onSelectRunForInspection?: (run: ValidationRun) => void;
}

export const RunHistoryView: React.FC<RunHistoryViewProps> = ({
  runs
}) => {
  const [selectedRunAId, setSelectedRunAId] = useState<string>(runs[0]?.runId || '');
  const [selectedRunBId, setSelectedRunBId] = useState<string>(runs[1]?.runId || runs[0]?.runId || '');

  const runA = runs.find(r => r.runId === selectedRunAId) || runs[0];
  const runB = runs.find(r => r.runId === selectedRunBId) || runs[1] || runs[0];

  const hasMultipleRuns = runs.length > 1;

  // Compute Delta between Run A and Run B (B is newer)
  const healthDelta = runB && runA ? runB.healthScore - runA.healthScore : 0;
  const issuesDelta = runB && runA ? runB.totalIssuesCount - runA.totalIssuesCount : 0;
  const failedDelta = runB && runA ? runB.failedRecords - runA.failedRecords : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center space-x-2">
          <History className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-bold text-white">Validation Run History &amp; Revalidation Delta</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
            {runs.length} Executed Runs
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl">
          Track quality trends over time. When source records are corrected or re-imported, compare successive validation runs to verify that defects were eliminated without introducing regressions.
        </p>
      </div>

      {/* Revalidation Delta Comparison Card */}
      {hasMultipleRuns && runA && runB && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                <GitCompare className="w-4 h-4 text-indigo-400" />
                <span>Side-by-Side Run Delta Comparison</span>
              </h4>
              <p className="text-xs text-slate-400">
                Comparing Run #{runA.runNumber} ({new Date(runA.completedAt).toLocaleTimeString()}) &rarr; Run #{runB.runNumber} ({new Date(runB.completedAt).toLocaleTimeString()})
              </p>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400">Base:</span>
              <select
                value={selectedRunAId}
                onChange={(e) => setSelectedRunAId(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white"
              >
                {runs.map(r => (
                  <option key={r.runId} value={r.runId}>
                    Run #{r.runNumber} ({r.healthScore}%)
                  </option>
                ))}
              </select>

              <span className="text-slate-400">vs Current:</span>
              <select
                value={selectedRunBId}
                onChange={(e) => setSelectedRunBId(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white"
              >
                {runs.map(r => (
                  <option key={r.runId} value={r.runId}>
                    Run #{r.runNumber} ({r.healthScore}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Health Score Delta */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              <span className="text-xs text-slate-400 block mb-1">HEALTH SCORE PROGRESSION</span>
              <div className="flex items-baseline space-x-2 font-mono">
                <span className="text-lg text-slate-400">{runA.healthScore}%</span>
                <ArrowRight className="w-4 h-4 text-slate-500" />
                <span className={`text-2xl font-bold ${runB.healthScore >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {runB.healthScore}%
                </span>
                <span className={`text-xs font-bold ${healthDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ({healthDelta >= 0 ? `+${healthDelta}%` : `${healthDelta}%`})
                </span>
              </div>
            </div>

            {/* Total Issues Delta */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              <span className="text-xs text-slate-400 block mb-1">TOTAL DEFECTS ELIMINATED</span>
              <div className="flex items-baseline space-x-2 font-mono">
                <span className="text-lg text-rose-400">{runA.totalIssuesCount}</span>
                <ArrowRight className="w-4 h-4 text-slate-500" />
                <span className="text-2xl font-bold text-white">{runB.totalIssuesCount}</span>
                <span className={`text-xs font-bold ${issuesDelta <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ({issuesDelta <= 0 ? `${issuesDelta} resolved` : `+${issuesDelta} new`})
                </span>
              </div>
            </div>

            {/* Clean Records Delta */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              <span className="text-xs text-slate-400 block mb-1">CLEAN RECORD ACCURACY</span>
              <div className="flex items-baseline space-x-2 font-mono">
                <span className="text-lg text-slate-400">{runA.passedRecords} clean</span>
                <ArrowRight className="w-4 h-4 text-slate-500" />
                <span className="text-2xl font-bold text-emerald-400">{runB.passedRecords} clean</span>
                <span className="text-xs text-slate-500">
                  / {runB.totalRecords} records
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Runs Timeline Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between">
          <h4 className="text-sm font-bold text-white">Execution Timeline</h4>
          <span className="text-xs text-slate-400 font-mono">Sorted newest to oldest</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0b0f17] text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Run #</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Target Dataset</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Health Score</th>
                <th className="py-2.5 px-3 text-center">Passed / Total</th>
                <th className="py-2.5 px-3 text-center">Violations</th>
                <th className="py-2.5 px-3 text-right">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {runs.map((r) => (
                <tr key={r.runId} className="hover:bg-slate-800/20">
                  <td className="py-2.5 px-3 font-bold text-indigo-400">Run #{r.runNumber}</td>
                  <td className="py-2.5 px-3 text-slate-400">
                    {new Date(r.completedAt).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-white truncate max-w-xs">{r.datasetName}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      r.runStatus === 'PASSED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : r.runStatus === 'WARNING'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}>
                      {r.runStatus}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold">
                    <span className={r.healthScore >= 80 ? 'text-emerald-400' : 'text-rose-400'}>
                      {r.healthScore}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-300">
                    {r.passedRecords} / {r.totalRecords}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {r.totalIssuesCount > 0 ? (
                      <span className="text-rose-400 font-bold">{r.totalIssuesCount}</span>
                    ) : (
                      <span className="text-emerald-400 font-bold">0</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-400">{r.executionTimeMs}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

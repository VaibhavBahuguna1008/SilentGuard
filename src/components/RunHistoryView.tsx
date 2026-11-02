import React, { useState, useMemo, useEffect } from 'react';
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
  Zap,
  Filter,
  Layers,
  Calendar
} from 'lucide-react';
import { ValidationRun } from '../types';

interface RunHistoryViewProps {
  runs: ValidationRun[];
  onSelectRunForInspection?: (run: ValidationRun) => void;
}

export const RunHistoryView: React.FC<RunHistoryViewProps> = ({
  runs
}) => {
  // Unique datasets present in runs
  const datasets = useMemo(() => {
    const map = new Map<string, string>();
    runs.forEach(r => {
      map.set(r.datasetId, r.datasetName || `Dataset ${r.datasetId.substring(0, 8)}`);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [runs]);

  // Selected dataset filter (defaults to first dataset or 'ALL')
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('ALL');

  // Filter runs by chosen dataset
  const filteredRuns = useMemo(() => {
    if (selectedDatasetId === 'ALL') return runs;
    return runs.filter(r => r.datasetId === selectedDatasetId);
  }, [runs, selectedDatasetId]);

  // Chronologically sorted runs (Oldest first -> Newest last) for natural Baseline -> Current delta
  const chronologicalRuns = useMemo(() => {
    return [...filteredRuns].sort((a, b) => {
      const timeA = new Date(a.startedAt || a.completedAt).getTime();
      const timeB = new Date(b.startedAt || b.completedAt).getTime();
      return timeA - timeB;
    });
  }, [filteredRuns]);

  // Selected Run A (Base / Baseline, earlier) and Run B (Current / Latest, newer)
  const [selectedRunAId, setSelectedRunAId] = useState<string>('');
  const [selectedRunBId, setSelectedRunBId] = useState<string>('');

  // Automatically initialize Base (oldest) and Current (newest) when dataset filter changes
  useEffect(() => {
    if (chronologicalRuns.length >= 2) {
      // Base is the earliest baseline (first element)
      setSelectedRunAId(chronologicalRuns[0].runId);
      // Current is the latest revalidation (last element)
      setSelectedRunBId(chronologicalRuns[chronologicalRuns.length - 1].runId);
    } else if (chronologicalRuns.length === 1) {
      setSelectedRunAId(chronologicalRuns[0].runId);
      setSelectedRunBId(chronologicalRuns[0].runId);
    } else {
      setSelectedRunAId('');
      setSelectedRunBId('');
    }
  }, [selectedDatasetId, chronologicalRuns]);

  const baseRun = chronologicalRuns.find(r => r.runId === selectedRunAId) || chronologicalRuns[0];
  const currentRun = chronologicalRuns.find(r => r.runId === selectedRunBId) || chronologicalRuns[chronologicalRuns.length - 1];

  const isSameRun = baseRun && currentRun && baseRun.runId === currentRun.runId;
  const hasMultipleRuns = chronologicalRuns.length > 1;

  // Compute Delta between Base and Current (Current minus Base)
  const healthDelta = currentRun && baseRun ? currentRun.healthScore - baseRun.healthScore : 0;
  const issuesDelta = currentRun && baseRun ? currentRun.totalIssuesCount - baseRun.totalIssuesCount : 0;
  const failedDelta = currentRun && baseRun ? currentRun.failedRecords - baseRun.failedRecords : 0;

  // Helper formatting
  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Dataset Scoping Filter */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Validation Run History &amp; Revalidation Delta</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
              {runs.length} Total Runs
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Compare earlier baseline runs against subsequent revalidation runs to observe defect reduction, schema stabilization, and health score recovery.
          </p>
        </div>

        {/* Dataset Scoper */}
        <div className="flex items-center space-x-2 shrink-0">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-400 font-medium">Dataset Scope:</span>
          <select
            value={selectedDatasetId}
            onChange={(e) => setSelectedDatasetId(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Datasets ({datasets.length})</option>
            {datasets.map(d => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Revalidation Delta Comparison Card */}
      {baseRun && currentRun && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                <GitCompare className="w-4 h-4 text-indigo-400" />
                <span>Side-by-Side Run Delta Comparison</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {isSameRun ? (
                  <span className="text-amber-400">
                    Showing single run execution. Run validation after applying fixes to compare baseline vs current delta.
                  </span>
                ) : (
                  <span>
                    Comparing <strong className="text-indigo-300 font-mono">Base (Run #{baseRun.runNumber})</strong> at {formatTime(baseRun.completedAt)} &rarr; <strong className="text-emerald-300 font-mono">Current (Run #{currentRun.runNumber})</strong> at {formatTime(currentRun.completedAt)}
                  </span>
                )}
              </p>
            </div>

            {/* Clear Base vs Current Selectors */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {/* Base Run Selector */}
              <div className="flex items-center space-x-1.5 bg-slate-950/70 border border-slate-800 rounded-xl p-1.5 px-2.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 uppercase">
                  Base Run
                </span>
                <select
                  value={selectedRunAId}
                  onChange={(e) => setSelectedRunAId(e.target.value)}
                  className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
                >
                  {chronologicalRuns.map((r, idx) => (
                    <option key={r.runId} value={r.runId} className="bg-slate-900 text-white">
                      Run #{r.runNumber} {idx === 0 ? '(Initial Baseline)' : ''} — {formatTime(r.completedAt)} ({r.healthScore}%)
                    </option>
                  ))}
                </select>
              </div>

              <ArrowRight className="w-4 h-4 text-slate-600 hidden sm:inline" />

              {/* Current Run Selector */}
              <div className="flex items-center space-x-1.5 bg-slate-950/70 border border-slate-800 rounded-xl p-1.5 px-2.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 uppercase">
                  Current Run
                </span>
                <select
                  value={selectedRunBId}
                  onChange={(e) => setSelectedRunBId(e.target.value)}
                  className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
                >
                  {chronologicalRuns.map((r, idx) => (
                    <option key={r.runId} value={r.runId} className="bg-slate-900 text-white">
                      Run #{r.runNumber} {idx === chronologicalRuns.length - 1 ? '(Latest Revalidation)' : ''} — {formatTime(r.completedAt)} ({r.healthScore}%)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Delta Metric Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Health Score Delta */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1">HEALTH SCORE RECOVERY</span>
              <div className="flex items-baseline space-x-2 font-mono">
                <span className="text-base text-slate-400">{baseRun.healthScore}%</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className={`text-2xl font-bold ${currentRun.healthScore >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {currentRun.healthScore}%
                </span>
                {!isSameRun && (
                  <span className={`text-xs font-bold ${healthDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ({healthDelta >= 0 ? `+${healthDelta}%` : `${healthDelta}%`})
                  </span>
                )}
              </div>
            </div>

            {/* Total Issues Delta */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1">DEFECT RESOLUTION DELTA</span>
              <div className="flex items-baseline space-x-2 font-mono">
                <span className="text-base text-rose-400">{baseRun.totalIssuesCount} issues</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-2xl font-bold text-white">{currentRun.totalIssuesCount}</span>
                {!isSameRun && (
                  <span className={`text-xs font-bold ${issuesDelta <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ({issuesDelta <= 0 ? `${Math.abs(issuesDelta)} resolved` : `+${issuesDelta} new`})
                  </span>
                )}
              </div>
            </div>

            {/* Clean Records Delta */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1">CLEAN RECORD PASS RATE</span>
              <div className="flex items-baseline space-x-2 font-mono">
                <span className="text-base text-slate-400">{baseRun.passedRecords} clean</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-2xl font-bold text-emerald-400">{currentRun.passedRecords}</span>
                <span className="text-xs text-slate-500">
                  / {currentRun.totalRecords} rows
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Runs Timeline Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h4 className="text-sm font-bold text-white">Execution Timeline</h4>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
              {filteredRuns.length} runs
            </span>
          </div>
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
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-200">
              {filteredRuns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No validation runs recorded for this dataset scope.
                  </td>
                </tr>
              ) : (
                filteredRuns.map((run) => {
                  const isBase = run.runId === selectedRunAId;
                  const isCurrent = run.runId === selectedRunBId;

                  return (
                    <tr
                      key={run.runId}
                      className={`hover:bg-slate-800/40 transition ${
                        isCurrent ? 'bg-emerald-500/5' : isBase ? 'bg-indigo-500/5' : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-bold text-white">
                        <div className="flex items-center space-x-1.5">
                          <span>Run #{run.runNumber}</span>
                          {isBase && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-indigo-500/20 text-indigo-300 uppercase font-bold">
                              Base
                            </span>
                          )}
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-300 uppercase font-bold">
                              Current
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-400">
                        {new Date(run.completedAt).toLocaleDateString()} {new Date(run.completedAt).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-3 text-slate-300 truncate max-w-[200px]" title={run.datasetName}>
                        {run.datasetName || run.datasetId}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          run.runStatus === 'PASSED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : run.runStatus === 'FAILED'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {run.runStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`font-bold ${run.healthScore >= 80 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {run.healthScore}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-400">
                        {run.passedRecords} / {run.totalRecords}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-rose-400 font-bold">{run.totalIssuesCount}</span>
                        {run.criticalIssuesCount > 0 && (
                          <span className="text-[10px] text-slate-500 ml-1">
                            ({run.criticalIssuesCount} crit)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400">
                        {run.executionTimeMs} ms
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

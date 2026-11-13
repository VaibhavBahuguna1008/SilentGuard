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
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
  User,
  ShieldAlert
} from 'lucide-react';
import { ValidationRun, Dataset, EmployeeUser } from '../types';

interface RunHistoryViewProps {
  runs: ValidationRun[];
  allDatasets?: Dataset[];
  currentUser?: EmployeeUser | null;
  onDeleteRun?: (runId: string) => void;
  onSelectRunForInspection?: (run: ValidationRun) => void;
}

export const RunHistoryView: React.FC<RunHistoryViewProps> = ({
  runs,
  allDatasets = [],
  currentUser,
  onDeleteRun
}) => {
  const isAdmin = currentUser?.role === 'ADMIN';

  // 1. Filter runs visible to the current user:
  // - Admin can see everyone's runs.
  // - Other users can ONLY see runs for files they uploaded and validated (or standard presets they executed).
  const visibleRuns = useMemo(() => {
    if (isAdmin || !currentUser) return runs;

    // Build a set of dataset IDs owned by this user or standard presets
    const allowedDatasetIds = new Set<string>();
    allDatasets.forEach(ds => {
      const isOwner = (ds.uploadedById && ds.uploadedById.toUpperCase() === currentUser.employeeId.toUpperCase()) ||
                      (ds.uploadedByEmail && ds.uploadedByEmail.toLowerCase() === currentUser.email.toLowerCase()) ||
                      (ds.uploadedBy && (
                        ds.uploadedBy.includes(currentUser.employeeId) || 
                        ds.uploadedBy.includes(currentUser.name)
                      ));
      if (ds.isPreset || isOwner) {
        allowedDatasetIds.add(ds.datasetId);
      }
    });

    return runs.filter(r => {
      // Direct dataset ownership match
      if (allowedDatasetIds.has(r.datasetId)) return true;

      // Executed by this specific user
      if (r.executedById && r.executedById.toUpperCase() === currentUser.employeeId.toUpperCase()) return true;
      if (r.executedByEmail && r.executedByEmail.toLowerCase() === currentUser.email.toLowerCase()) return true;
      if (r.executedBy && (r.executedBy.includes(currentUser.employeeId) || r.executedBy.includes(currentUser.name))) return true;

      return false;
    });
  }, [runs, allDatasets, currentUser, isAdmin]);

  // Unique datasets present in user's visible runs
  const datasets = useMemo(() => {
    const map = new Map<string, string>();
    visibleRuns.forEach(r => {
      map.set(r.datasetId, r.datasetName || `Dataset ${r.datasetId.substring(0, 8)}`);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [visibleRuns]);

  // Selected dataset filter (defaults to first dataset or 'ALL')
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('ALL');

  // Filter runs by chosen dataset
  const filteredRuns = useMemo(() => {
    if (selectedDatasetId === 'ALL') return visibleRuns;
    return visibleRuns.filter(r => r.datasetId === selectedDatasetId);
  }, [visibleRuns, selectedDatasetId]);

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

  // Pagination & Batching state for Execution Timeline
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Reset to page 1 whenever dataset scope changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDatasetId]);

  const totalPages = Math.max(1, Math.ceil(filteredRuns.length / pageSize));
  const clampedCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedRuns = useMemo(() => {
    const start = (clampedCurrentPage - 1) * pageSize;
    return filteredRuns.slice(start, start + pageSize);
  }, [filteredRuns, clampedCurrentPage, pageSize]);

  const startRunIndex = filteredRuns.length === 0 ? 0 : (clampedCurrentPage - 1) * pageSize + 1;
  const endRunIndex = Math.min(clampedCurrentPage * pageSize, filteredRuns.length);

  return (
    <div className="space-y-6">
      {/* Top Banner & Dataset Scoping Filter */}
      <div className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-red-600 dark:text-red-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Validation Run History &amp; Revalidation Delta</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30 font-mono font-bold">
              {filteredRuns.length} Runs {isAdmin ? '(All Users)' : '(My Files)'}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 max-w-2xl">
            {isAdmin 
              ? 'Administrator View: Full access to all execution runs across all users, with options to delete obsolete validation runs.'
              : 'User Scope: Showing only validation runs for datasets you uploaded and validated, alongside standard presets.'}
          </p>
        </div>

        {/* Dataset Scoper */}
        <div className="flex items-center space-x-2 shrink-0">
          <Filter className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
          <span className="text-xs text-slate-600 dark:text-zinc-400 font-medium">Dataset Scope:</span>
          <select
            value={selectedDatasetId}
            onChange={(e) => setSelectedDatasetId(e.target.value)}
            className="bg-white dark:bg-[#0b0c0e] border border-slate-200 dark:border-[#242630] rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-white font-mono focus:outline-none focus:border-red-600 cursor-pointer shadow-2xs"
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
        <div className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-200 dark:border-[#242630]">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <GitCompare className="w-4 h-4 text-red-600 dark:text-red-500" />
                <span>Side-by-Side Run Delta Comparison</span>
              </h4>
              <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5">
                {isSameRun ? (
                  <span className="text-amber-700 dark:text-amber-400">
                    Showing single run execution. Run validation after applying fixes to compare baseline vs current delta.
                  </span>
                ) : (
                  <span>
                    Comparing <strong className="text-red-700 dark:text-red-400 font-mono">Base (Run #{baseRun.runNumber})</strong> at {formatTime(baseRun.completedAt)} &rarr; <strong className="text-emerald-700 dark:text-emerald-300 font-mono">Current (Run #{currentRun.runNumber})</strong> at {formatTime(currentRun.completedAt)}
                  </span>
                )}
              </p>
            </div>

            {/* Clear Base vs Current Selectors */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {/* Base Run Selector */}
              <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-[#0b0c0e] border border-slate-200 dark:border-[#242630] rounded-xl p-1.5 px-2.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/20 dark:text-red-300 uppercase">
                  Base Run
                </span>
                <select
                  value={selectedRunAId}
                  onChange={(e) => setSelectedRunAId(e.target.value)}
                  className="bg-transparent text-slate-800 dark:text-white font-mono text-xs focus:outline-none cursor-pointer"
                >
                  {chronologicalRuns.map((r, idx) => (
                    <option key={r.runId} value={r.runId} className="bg-white dark:bg-[#121317] text-slate-800 dark:text-white">
                      Run #{r.runNumber} {idx === 0 ? '(Initial Baseline)' : ''} — {formatTime(r.completedAt)} ({r.healthScore}%)
                    </option>
                  ))}
                </select>
              </div>

              <ArrowRight className="w-4 h-4 text-slate-400 dark:text-zinc-600 hidden sm:inline" />

              {/* Current Run Selector */}
              <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-[#0b0c0e] border border-slate-200 dark:border-[#242630] rounded-xl p-1.5 px-2.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 uppercase">
                  Current Run
                </span>
                <select
                  value={selectedRunBId}
                  onChange={(e) => setSelectedRunBId(e.target.value)}
                  className="bg-transparent text-slate-800 dark:text-white font-mono text-xs focus:outline-none cursor-pointer"
                >
                  {chronologicalRuns.map((r, idx) => (
                    <option key={r.runId} value={r.runId} className="bg-white dark:bg-[#121317] text-slate-800 dark:text-white">
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
            <div className="bg-slate-50 dark:bg-[#0e0f13] p-4 rounded-xl border border-slate-200 dark:border-[#242630]">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400 block mb-1">HEALTH SCORE RECOVERY</span>
              <div className="flex items-baseline space-x-2 font-mono">
                <span className="text-base text-slate-500 dark:text-zinc-400">{baseRun.healthScore}%</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                <span className={`text-2xl font-bold ${currentRun.healthScore >= 80 ? 'text-emerald-700 dark:text-emerald-400' : 'text-[#e31b23] dark:text-amber-400'}`}>
                  {currentRun.healthScore}%
                </span>
                {!isSameRun && (
                  <span className={`text-xs font-bold ${healthDelta >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-rose-400'}`}>
                    ({healthDelta >= 0 ? `+${healthDelta}%` : `${healthDelta}%`})
                  </span>
                )}
              </div>
            </div>

            {/* Total Issues Delta */}
            <div className="bg-slate-50 dark:bg-[#0e0f13] p-4 rounded-xl border border-slate-200 dark:border-[#242630]">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400 block mb-1">DEFECT RESOLUTION DELTA</span>
              <div className="flex items-baseline space-x-2 font-mono">
                <span className="text-base text-red-700 dark:text-rose-400 font-bold">{baseRun.totalIssuesCount} issues</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                <span className="text-2xl font-bold text-slate-900 dark:text-white">{currentRun.totalIssuesCount}</span>
                {!isSameRun && (
                  <span className={`text-xs font-bold ${issuesDelta <= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-rose-400'}`}>
                    ({issuesDelta <= 0 ? `${Math.abs(issuesDelta)} resolved` : `+${issuesDelta} new`})
                  </span>
                )}
              </div>
            </div>

            {/* Clean Records Delta */}
            <div className="bg-slate-50 dark:bg-[#0e0f13] p-4 rounded-xl border border-slate-200 dark:border-[#242630]">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400 block mb-1">CLEAN RECORD PASS RATE</span>
              <div className="flex items-baseline space-x-2 font-mono">
                <span className="text-base text-slate-600 dark:text-zinc-400">{baseRun.passedRecords} clean</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{currentRun.passedRecords}</span>
                <span className="text-xs text-slate-500 dark:text-zinc-500">
                  / {currentRun.totalRecords} rows
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Runs Timeline Table */}
      <div className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-2xl overflow-hidden shadow-sm">
        {/* Table Header Bar & Top Pagination */}
        <div className="p-4 bg-slate-50 dark:bg-[#0e0f13] border-b border-slate-200 dark:border-[#242630] flex flex-col md:flex-row md:items-center justify-between text-xs text-slate-600 dark:text-zinc-400 gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Execution Timeline</h4>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-400 font-mono font-bold">
              {filteredRuns.length} total runs
            </span>
            <span className="text-slate-400 dark:text-slate-600">•</span>
            <span className="font-mono text-[#e31b23] dark:text-red-400 font-semibold">
              Showing batch {startRunIndex}–{endRunIndex} of {filteredRuns.length}
            </span>
          </div>

          {/* Top Pagination & Batch Size Selector */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Batch size:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-zinc-200 font-mono focus:outline-none focus:border-red-600 cursor-pointer shadow-2xs"
              >
                <option value={5}>5 per batch</option>
                <option value={10}>10 per batch</option>
                <option value={20}>20 per batch</option>
                <option value={50}>50 per batch</option>
              </select>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={clampedCurrentPage <= 1}
                className="p-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 disabled:opacity-40 disabled:text-slate-400 dark:disabled:text-zinc-600 disabled:bg-slate-100 dark:disabled:bg-zinc-900/40 cursor-pointer disabled:cursor-not-allowed transition shadow-2xs"
                title="First Batch"
              >
                <ChevronsLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={clampedCurrentPage <= 1}
                className="p-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 disabled:opacity-40 disabled:text-slate-400 dark:disabled:text-zinc-600 disabled:bg-slate-100 dark:disabled:bg-zinc-900/40 cursor-pointer disabled:cursor-not-allowed transition shadow-2xs"
                title="Previous Batch"
              >
                <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
              <span className="px-2 font-mono text-xs text-slate-800 dark:text-zinc-200 font-bold">
                {clampedCurrentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={clampedCurrentPage >= totalPages}
                className="p-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 disabled:opacity-40 disabled:text-slate-400 dark:disabled:text-zinc-600 disabled:bg-slate-100 dark:disabled:bg-zinc-900/40 cursor-pointer disabled:cursor-not-allowed transition shadow-2xs"
                title="Next Batch"
              >
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={clampedCurrentPage >= totalPages}
                className="p-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 disabled:opacity-40 disabled:text-slate-400 dark:disabled:text-zinc-600 disabled:bg-slate-100 dark:disabled:bg-zinc-900/40 cursor-pointer disabled:cursor-not-allowed transition shadow-2xs"
                title="Last Batch"
              >
                <ChevronsRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-[#0b0c0e] text-slate-600 dark:text-zinc-400 font-mono text-[11px] border-b border-slate-200 dark:border-[#242630]">
              <tr>
                <th className="py-2.5 px-3">Run #</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Target Dataset</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Health Score</th>
                <th className="py-2.5 px-3 text-center">Passed / Total</th>
                <th className="py-2.5 px-3 text-center">Violations</th>
                <th className="py-2.5 px-3">Executed By</th>
                <th className="py-2.5 px-3 text-right">Duration</th>
                {isAdmin && <th className="py-2.5 px-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#242630] font-mono text-slate-800 dark:text-zinc-200">
              {filteredRuns.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 10 : 9} className="py-8 text-center text-slate-500 dark:text-zinc-500">
                    No validation runs recorded for this dataset scope.
                  </td>
                </tr>
              ) : (
                paginatedRuns.map((run) => {
                  const isBase = run.runId === selectedRunAId;
                  const isCurrent = run.runId === selectedRunBId;

                  return (
                    <tr
                      key={run.runId}
                      className={`hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition ${
                        isCurrent ? 'bg-emerald-50/60 dark:bg-emerald-500/10' : isBase ? 'bg-red-50/60 dark:bg-red-500/10' : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center space-x-1.5">
                          <span>Run #{run.runNumber}</span>
                          {isBase && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30 uppercase font-bold">
                              Base
                            </span>
                          )}
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 uppercase font-bold">
                              Current
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                        {new Date(run.completedAt).toLocaleDateString()} {new Date(run.completedAt).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-3 text-slate-800 dark:text-slate-300 font-semibold truncate max-w-[180px]" title={run.datasetName}>
                        {run.datasetName || run.datasetId}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          run.runStatus === 'PASSED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                            : run.runStatus === 'FAILED'
                            ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30'
                            : 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
                        }`}>
                          {run.runStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-900 dark:text-zinc-200">
                        {run.healthScore}%
                      </td>
                      <td className="py-3 px-3 text-center text-slate-800 dark:text-zinc-200">
                        {run.passedRecords} / {run.totalRecords}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {run.totalIssuesCount > 0 ? (
                          <span className="text-red-700 dark:text-red-400 font-bold">
                            {run.totalIssuesCount} ({run.criticalIssuesCount} crit)
                          </span>
                        ) : (
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                            0 clean
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-zinc-400 text-[11px] truncate max-w-[140px]" title={run.executedBy || 'System / Auto'}>
                        {run.executedBy || 'System / Auto'}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-500 dark:text-zinc-400">
                        {run.executionTimeMs}ms
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete Run #${run.runNumber} for "${run.datasetName || run.datasetId}"?`)) {
                                if (onDeleteRun) onDeleteRun(run.runId);
                              }
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                            title={`Admin: Delete Run #${run.runNumber}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Bottom Pagination Bar */}
        <div className="p-3 bg-slate-50 dark:bg-[#0e0f13] border-t border-slate-200 dark:border-[#242630] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 dark:text-zinc-400 gap-3">
          <div className="flex items-center space-x-2 font-mono text-[11px]">
            <span>Showing {startRunIndex} to {endRunIndex} of {filteredRuns.length} runs</span>
            <span className="text-slate-400 dark:text-zinc-600">•</span>
            <span>Batch {clampedCurrentPage} of {totalPages}</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={clampedCurrentPage <= 1}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 disabled:opacity-40 disabled:text-slate-400 dark:disabled:text-zinc-600 disabled:bg-slate-100 dark:disabled:bg-zinc-900/40 cursor-pointer disabled:cursor-not-allowed transition shadow-2xs"
              title="First Batch"
            >
              <ChevronsLeft className="w-4 h-4 stroke-[2.5]" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={clampedCurrentPage <= 1}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 disabled:opacity-40 disabled:text-slate-400 dark:disabled:text-zinc-600 disabled:bg-slate-100 dark:disabled:bg-zinc-900/40 cursor-pointer disabled:cursor-not-allowed transition shadow-2xs"
              title="Previous Batch"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            </button>

            <span className="px-3 py-1 bg-red-50 dark:bg-zinc-900 border border-red-200 dark:border-[#242630] rounded-lg font-mono text-xs text-red-700 dark:text-red-400 font-bold shadow-2xs">
              {clampedCurrentPage}
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={clampedCurrentPage >= totalPages}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 disabled:opacity-40 disabled:text-slate-400 dark:disabled:text-zinc-600 disabled:bg-slate-100 dark:disabled:bg-zinc-900/40 cursor-pointer disabled:cursor-not-allowed transition shadow-2xs"
              title="Next Batch"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={clampedCurrentPage >= totalPages}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 disabled:opacity-40 disabled:text-slate-400 dark:disabled:text-zinc-600 disabled:bg-slate-100 dark:disabled:bg-zinc-900/40 cursor-pointer disabled:cursor-not-allowed transition shadow-2xs"
              title="Last Batch"
            >
              <ChevronsRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

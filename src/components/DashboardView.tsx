import React, { useMemo } from 'react';
import { 
  ShieldAlert, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  FileSpreadsheet, 
  Layers, 
  RotateCw,
  Check,
  Play,
  HelpCircle
} from 'lucide-react';
import { Dataset, ValidationRun, ValidationIssue, ValidationRule } from '../types';

interface DashboardViewProps {
  activeDataset: Dataset;
  latestRun: ValidationRun | null;
  issues: ValidationIssue[];
  activeRules: ValidationRule[];
  onNavigateToTab: (tab: string) => void;
  onSelectIssue: (issue: ValidationIssue) => void;
  onRunValidation: () => void;
  isValidating: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  activeDataset,
  latestRun,
  issues,
  activeRules,
  onNavigateToTab,
  onSelectIssue,
  onRunValidation,
  isValidating,
}) => {
  // Ensure the latest run matches THIS active dataset specifically
  const isCurrentRunMatching = latestRun !== null && latestRun.datasetId === activeDataset.datasetId;

  // Filter issues strictly belonging to the active dataset
  const activeDatasetIssues = useMemo(() => {
    return isCurrentRunMatching ? issues.filter(i => i.datasetId === activeDataset.datasetId) : [];
  }, [issues, isCurrentRunMatching, activeDataset.datasetId]);

  const totalRecords = activeDataset.rowCount;

  // Calculate failed records from unique row numbers of active issues
  const failedRecordRows = useMemo(() => {
    return new Set(activeDatasetIssues.map(i => i.rowNumber));
  }, [activeDatasetIssues]);

  const failedRecords = isCurrentRunMatching 
    ? (latestRun.failedRecords ?? failedRecordRows.size)
    : 0;
  
  const passedRecords = isCurrentRunMatching 
    ? Math.max(0, totalRecords - failedRecords)
    : totalRecords;

  const healthScore = isCurrentRunMatching
    ? latestRun.healthScore
    : 100;

  const criticalIssuesCount = activeDatasetIssues.filter(i => i.severity === 'CRITICAL').length;
  const errorIssuesCount = activeDatasetIssues.filter(i => i.severity === 'ERROR').length;
  const warningIssuesCount = activeDatasetIssues.filter(i => i.severity === 'WARNING').length;
  const totalIssuesCount = activeDatasetIssues.length;

  const executionTimeMs = isCurrentRunMatching ? (latestRun.executionTimeMs ?? 0) : 0;
  const runNumber = isCurrentRunMatching ? (latestRun.runNumber ?? 1) : 0;

  // Breakdown strictly by category of active issues
  const categories = useMemo(() => {
    const categoryCounts: Record<string, number> = {};
    for (const i of activeDatasetIssues) {
      if (i.category) {
        categoryCounts[i.category] = (categoryCounts[i.category] || 0) + 1;
      }
    }
    return Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
  }, [activeDatasetIssues]);

  // Health status badge calculation
  let healthColor = 'text-emerald-700 dark:text-emerald-400';
  let healthBg = 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30';
  let healthLabel = 'Clean / Production Ready';

  if (!isCurrentRunMatching) {
    healthColor = 'text-blue-700 dark:text-blue-400';
    healthBg = 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30';
    healthLabel = 'Ready for Validation';
  } else if (healthScore < 60) {
    healthColor = 'text-red-700 dark:text-rose-400';
    healthBg = 'bg-red-50 dark:bg-rose-500/10 border-red-200 dark:border-rose-500/30';
    healthLabel = 'Critical Contamination';
  } else if (healthScore < 85) {
    healthColor = 'text-amber-800 dark:text-amber-400';
    healthBg = 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30';
    healthLabel = 'Degraded Quality';
  }

  const passRate = totalRecords > 0 ? Math.round((passedRecords / totalRecords) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* 1. Pending Validation Notice Banner (Shown when user has loaded/selected dataset but hasn't clicked Validate yet) */}
      {!isCurrentRunMatching && (
        <div className="rounded-2xl bg-gradient-to-r from-blue-50 via-white to-slate-50 dark:from-blue-950/40 dark:via-[#14151b] dark:to-zinc-900 border border-blue-200 dark:border-blue-500/30 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
              <Play className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 font-mono">
                  AWAITING VALIDATION
                </span>
                <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                  {totalRecords} records ready in {activeDataset.fileName}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                Data Loaded • Quality Gateway Armed with {activeRules.length} Rules
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5">
                Click the <strong>Validate</strong> button to execute rule validation and detect silent failures.
              </p>
            </div>
          </div>

          <button
            onClick={onRunValidation}
            disabled={isValidating}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#e31b23] hover:bg-[#c41219] text-white transition shadow-md shadow-red-950/30 cursor-pointer border border-red-500/40 shrink-0"
          >
            <Play className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : 'fill-current'}`} />
            <span>{isValidating ? 'Validating Dataset...' : 'Validate Active Dataset'}</span>
          </button>
        </div>
      )}

      {/* 2. Silent Failure Flagged Banner (ONLY shown when there ARE actual violations and ETL reported HTTP 200) */}
      {isCurrentRunMatching && totalIssuesCount > 0 && activeDataset.reportedSuccess && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-50 via-white to-red-50/40 dark:from-red-950/70 dark:via-[#14151b] dark:to-zinc-900 border border-red-200 dark:border-red-600/50 p-5 shadow-sm dark:shadow-xl">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-start space-x-4">
            <div className="p-3 rounded-xl bg-red-100 dark:bg-red-600/20 border border-red-200 dark:border-red-500/40 text-red-600 dark:text-red-400 shrink-0">
              <ShieldAlert className="w-6 h-6 animate-pulse text-red-600 dark:text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[#e31b23] text-white shadow-sm">
                  Silent Failure Flagged
                </span>
                <span className="text-xs text-red-700 dark:text-red-300 font-mono font-semibold">
                  Upstream Status: HTTP 200 SUCCESS (Misleading)
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                Data Ingestion Succeeded, But Business Rules Were Corrupted
              </h3>
              <p className="text-xs text-slate-700 dark:text-zinc-300 mt-1 leading-relaxed">
                The file transfer reported success, but SilentGuard detected{' '}
                <strong className="text-red-700 dark:text-red-400 font-bold">{totalIssuesCount} rule violations</strong> across{' '}
                <strong className="text-red-700 dark:text-red-400 font-bold">{failedRecords} records</strong> ({criticalIssuesCount} Critical, {errorIssuesCount} Error). 
                Without this validation layer, downstream systems would process invalid specifications, duplicate IDs, or out-of-range figures silently.
              </p>
              <div className="mt-3.5 flex items-center space-x-3">
                <button
                  onClick={() => onNavigateToTab('explorer')}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-[#e31b23] hover:bg-[#c41219] text-white transition shadow-sm shadow-red-950/30 cursor-pointer"
                >
                  <span>Review Violations in Table</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Health Index Card */}
        <div className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-zinc-400 mb-2">
            <span className="font-medium">Data Health Index</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${healthBg} ${healthColor}`}>
              {healthLabel}
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className={`text-4xl font-extrabold font-mono tracking-tight ${healthColor}`}>
              {isCurrentRunMatching ? `${healthScore}%` : '100%'}
            </span>
            <span className="text-xs text-slate-500 dark:text-zinc-500 font-mono">/ 100 max</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-2 mt-4 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 rounded-full ${
                !isCurrentRunMatching ? 'bg-blue-500' : (healthScore >= 85 ? 'bg-emerald-500' : healthScore >= 60 ? 'bg-amber-500' : 'bg-[#e31b23]')
              }`}
              style={{ width: `${isCurrentRunMatching ? healthScore : 100}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-2 font-mono">
            {isCurrentRunMatching 
              ? `Run #${runNumber} • ${activeRules.length} rules in ${executionTimeMs}ms` 
              : `Armed with ${activeRules.length} rules`}
          </p>
        </div>

        {/* Record Accuracy */}
        <div className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-zinc-400 mb-2">
            <span className="font-medium">Record Pass / Fail Rate</span>
            <FileSpreadsheet className="w-4 h-4 text-red-600 dark:text-red-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
              {passedRecords}
            </span>
            <span className="text-xs text-slate-600 dark:text-zinc-400">
              / {totalRecords} clean ({passRate}%)
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-mono">
            <div className="flex items-center space-x-1.5 p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{passedRecords} Valid</span>
            </div>
            <div className="flex items-center space-x-1.5 p-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{failedRecords} Tainted</span>
            </div>
          </div>
        </div>

        {/* Violations Severity */}
        <div className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-zinc-400 mb-2">
            <span className="font-medium">Total Violations</span>
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
              {totalIssuesCount}
            </span>
            <span className="text-xs text-slate-600 dark:text-zinc-400">rule failures detected</span>
          </div>
          <div className="flex items-center space-x-2 mt-4 text-[11px] font-mono">
            <span className="px-2 py-1 rounded bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/30 font-bold">
              {criticalIssuesCount} Critical
            </span>
            <span className="px-2 py-1 rounded bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/25 font-bold">
              {errorIssuesCount} Error
            </span>
            <span className="px-2 py-1 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 font-bold">
              {warningIssuesCount} Warn
            </span>
          </div>
        </div>

        {/* Dataset Metadata */}
        <div className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-zinc-400 mb-2">
            <span className="font-medium">Source Dataset</span>
            <Clock className="w-4 h-4 text-red-600 dark:text-red-500" />
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-white truncate" title={activeDataset.fileName}>
            {activeDataset.fileName}
          </p>
          <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 truncate">
            {activeDataset.columns.length} columns • {activeDataset.sourceSystem || 'Direct Ingestion'}
          </p>
          <div className="mt-4 pt-2 border-t border-slate-200 dark:border-[#242630] flex items-center justify-between">
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
              RFC-4180 / XLSX
            </span>
            <button
              onClick={onRunValidation}
              disabled={isValidating}
              className="text-xs font-semibold text-[#e31b23] hover:text-[#c41219] inline-flex items-center space-x-1 cursor-pointer"
            >
              <RotateCw className={`w-3 h-3 ${isValidating ? 'animate-spin' : ''}`} />
              <span>{isCurrentRunMatching ? 'Re-run' : 'Validate'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Categories & Flagged Exceptions Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Violations by Category */}
        <div className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Layers className="w-4 h-4 text-red-600 dark:text-red-500" />
              <span>Violations by Category</span>
            </h4>
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
              {categories.length} categories
            </span>
          </div>

          {!isCurrentRunMatching ? (
            <div className="text-center py-8 text-xs text-slate-500 dark:text-zinc-400">
              <HelpCircle className="w-6 h-6 text-blue-400 mx-auto mb-1.5" />
              Validation pending. Click &quot;Validate&quot; in the navbar to categorize records.
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500 dark:text-zinc-400">
              <Check className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
              All data adheres to configured category constraints.
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map(([category, count]) => {
                const percentage = totalIssuesCount > 0 ? Math.round((count / totalIssuesCount) * 100) : 0;
                return (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-800 dark:text-zinc-200 font-medium">{category}</span>
                      <span className="text-slate-500 dark:text-zinc-400 font-mono">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-red-600 to-red-500 h-full rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-[#242630]">
            <button
              onClick={() => onNavigateToTab('rules')}
              className="text-xs text-[#e31b23] hover:text-[#c41219] font-medium inline-flex items-center space-x-1 cursor-pointer"
            >
              <span>Manage Rule Configuration &amp; Presets &rarr;</span>
            </button>
          </div>
        </div>

        {/* Flagged Records Stream */}
        <div className="lg:col-span-2 bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-500" />
                  <span>Flagged Exceptions Awaiting Resolution</span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5">
                  Click any issue to inspect row details and record audit resolution.
                </p>
              </div>
              <button
                onClick={() => onNavigateToTab('explorer')}
                className="text-xs font-semibold text-[#e31b23] hover:text-[#c41219] inline-flex items-center space-x-1 cursor-pointer"
              >
                <span>View All ({activeDatasetIssues.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {!isCurrentRunMatching ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-[#0d0e12] rounded-xl border border-slate-200 dark:border-[#242630]">
                <Clock className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <h5 className="text-sm font-bold text-slate-900 dark:text-white">Validation Not Yet Executed</h5>
                <p className="text-xs text-slate-600 dark:text-zinc-400 max-w-sm mx-auto mt-1">
                  This dataset has not been validated in the current session. Click the &quot;Validate&quot; button in the top navigation bar to analyze records against business constraints.
                </p>
              </div>
            ) : activeDatasetIssues.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-[#0d0e12] rounded-xl border border-slate-200 dark:border-[#242630]">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <h5 className="text-sm font-bold text-slate-900 dark:text-white">Zero Data Quality Defects Found</h5>
                <p className="text-xs text-slate-600 dark:text-zinc-400 max-w-sm mx-auto mt-1">
                  All {activeDataset.rowCount} records passed mandatory, uniqueness, format, range, and referential checks with 100% compliance.
                </p>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[300px] pr-1">
                {activeDatasetIssues.slice(0, 5).map(issue => (
                  <div
                    key={issue.issueId}
                    onClick={() => onSelectIssue(issue)}
                    className="p-3 rounded-xl bg-slate-50/80 dark:bg-[#0e0f13] border border-slate-200 dark:border-[#242630] hover:border-red-400 dark:hover:border-red-600/40 hover:bg-red-50/40 dark:hover:bg-[#16171d] transition cursor-pointer flex items-center justify-between space-x-3"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase shrink-0 ${
                        issue.severity === 'CRITICAL'
                          ? 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/40'
                          : issue.severity === 'ERROR'
                          ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700'
                      }`}>
                        {issue.severity}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            Row #{issue.rowNumber} • {issue.columnName}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                            [{issue.ruleName}]
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-zinc-300 truncate mt-0.5">
                          {issue.errorMessage}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                        issue.resolutionStatus === 'FIXED_IN_SOURCE'
                          ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                          : issue.resolutionStatus === 'IN_REVIEW'
                          ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700'
                      }`}>
                        {issue.resolutionStatus}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-[#242630] flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
            <span>
              Showing {Math.min(5, activeDatasetIssues.length)} of {activeDatasetIssues.length} detected exceptions
            </span>
            <button
              onClick={() => onNavigateToTab('explorer')}
              className="font-medium text-[#e31b23] hover:text-[#c41219] cursor-pointer"
            >
              Open Interactive Grid &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

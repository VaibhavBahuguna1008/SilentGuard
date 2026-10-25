import React from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  Sparkles, 
  Layers, 
  ArrowRight, 
  Clock, 
  Activity,
  FileSpreadsheet,
  Zap,
  Filter,
  Check,
  RotateCw,
  ExternalLink
} from 'lucide-react';
import { Dataset, ValidationIssue, ValidationRun, ValidationRule } from '../types';

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
  isValidating
}) => {
  if (!latestRun) {
    return (
      <div className="text-center py-20 px-4">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <Activity className="w-8 h-8 text-indigo-400 animate-pulse" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">No Validation Run Executed Yet</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
          Dataset &lsquo;{activeDataset.fileName}&rsquo; has been loaded ({activeDataset.rowCount} records). Execute SilentGuard validation engine to detect hidden data quality issues.
        </p>
        <button
          onClick={onRunValidation}
          disabled={isValidating}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition cursor-pointer"
        >
          <Zap className="w-4 h-4" />
          <span>Execute Initial Validation</span>
        </button>
      </div>
    );
  }

  const {
    totalRecords,
    passedRecords,
    failedRecords,
    healthScore,
    criticalIssuesCount,
    errorIssuesCount,
    warningIssuesCount,
    totalIssuesCount,
    executionTimeMs,
    runNumber
  } = latestRun;

  // Error category breakdown
  const categoryCounts: Record<string, number> = {};
  issues.forEach(i => {
    categoryCounts[i.category] = (categoryCounts[i.category] || 0) + 1;
  });

  const categories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);

  // Health status badge
  let healthColor = 'text-emerald-400';
  let healthBg = 'bg-emerald-500/10 border-emerald-500/30';
  let healthLabel = 'Clean / Production Ready';
  if (healthScore < 60) {
    healthColor = 'text-rose-400';
    healthBg = 'bg-rose-500/10 border-rose-500/30';
    healthLabel = 'Critical Contamination';
  } else if (healthScore < 85) {
    healthColor = 'text-amber-400';
    healthBg = 'bg-amber-500/10 border-amber-500/30';
    healthLabel = 'Degraded Quality';
  }

  const passRate = totalRecords > 0 ? Math.round((passedRecords / totalRecords) * 100) : 100;

  return (
    <div className="space-y-6">
      {totalIssuesCount > 0 && activeDataset.reportedSuccess && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-950/60 via-slate-900 to-amber-950/40 border border-rose-500/40 p-5 shadow-xl">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-start space-x-4">
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 shrink-0">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-500 text-white">
                  Silent Failure Flagged
                </span>
                <span className="text-xs text-rose-300 font-mono">
                  Upstream Status: HTTP 200 SUCCESS (Misleading)
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-1">
                Data Transfer Succeeded, But Business Rules Were Corrupted
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                The file transfer reported success, but SilentGuard detected{' '}
                <strong className="text-rose-300 font-semibold">{totalIssuesCount} rule violations</strong> across{' '}
                <strong className="text-rose-300 font-semibold">{failedRecords} records</strong> ({criticalIssuesCount} Critical, {errorIssuesCount} Error). 
                Without this validation layer, downstream systems would have processed invalid salaries, duplicate keys, and missing mandatory fields silently.
              </p>
              <div className="mt-3 flex items-center space-x-3">
                <button
                  onClick={() => onNavigateToTab('explorer')}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition shadow cursor-pointer"
                >
                  <span>Review Violations in Table</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Data Health Index</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${healthBg} ${healthColor}`}>
              {healthLabel}
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className={`text-4xl font-extrabold font-mono tracking-tight ${healthColor}`}>
              {healthScore}%
            </span>
            <span className="text-xs text-slate-500 font-mono">/ 100 max</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-800 rounded-full h-2 mt-4 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 rounded-full ${
                healthScore >= 85 ? 'bg-emerald-500' : healthScore >= 60 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${healthScore}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Run #{runNumber} • Evaluated {activeRules.length} rules in {executionTimeMs}ms
          </p>
        </div>

        {/* Record Accuracy */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Record Pass / Fail Rate</span>
            <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold font-mono text-white">
              {passedRecords}
            </span>
            <span className="text-xs text-slate-400">
              / {totalRecords} clean ({passRate}%)
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-mono">
            <div className="flex items-center space-x-1.5 p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{passedRecords} Valid</span>
            </div>
            <div className="flex items-center space-x-1.5 p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <XCircle className="w-3.5 h-3.5" />
              <span>{failedRecords} Tainted</span>
            </div>
          </div>
        </div>

        {/* Violations Severity */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Total Violations</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold font-mono text-white">
              {totalIssuesCount}
            </span>
            <span className="text-xs text-slate-400">rule failures detected</span>
          </div>
          <div className="flex items-center space-x-2 mt-4 text-[11px] font-mono">
            <span className="px-2 py-1 rounded bg-rose-500/15 text-rose-300 border border-rose-500/25">
              {criticalIssuesCount} Critical
            </span>
            <span className="px-2 py-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25">
              {errorIssuesCount} Error
            </span>
            <span className="px-2 py-1 rounded bg-blue-500/15 text-blue-300 border border-blue-500/25">
              {warningIssuesCount} Warn
            </span>
          </div>
        </div>

        {/* Dataset Metadata */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Source Dataset</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-sm font-bold text-white truncate" title={activeDataset.fileName}>
            {activeDataset.fileName}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {activeDataset.columns.length} columns • {activeDataset.sourceSystem || 'Direct CSV'}
          </p>
          <div className="mt-4 pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-mono">
              Engine: Pure TypeScript RFC-4180
            </span>
            <button
              onClick={onRunValidation}
              disabled={isValidating}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 inline-flex items-center space-x-1 cursor-pointer"
            >
              <RotateCw className={`w-3 h-3 ${isValidating ? 'animate-spin' : ''}`} />
              <span>Re-run</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-white flex items-center space-x-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Violations by Category</span>
            </h4>
            <span className="text-xs text-slate-400 font-mono">
              {categories.length} categories
            </span>
          </div>

          {categories.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              <Check className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
              All data adheres to configured category constraints.
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map(([category, count]) => {
                const percentage = totalIssuesCount > 0 ? Math.round((count / totalIssuesCount) * 100) : 0;
                return (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">{category}</span>
                      <span className="text-slate-400 font-mono">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-slate-800">
            <button
              onClick={() => onNavigateToTab('rules')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center space-x-1 cursor-pointer"
            >
              <span>Manage Rule Configuration &amp; Presets &rarr;</span>
            </button>
          </div>
        </div>

        {/* Flagged Records Stream (Top Issues) */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>Flagged Exceptions Awaiting Resolution</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Click any issue to inspect row details and record audit resolution.
                </p>
              </div>
              <button
                onClick={() => onNavigateToTab('explorer')}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 inline-flex items-center space-x-1 cursor-pointer"
              >
                <span>View All ({issues.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {issues.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800/80">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <h5 className="text-sm font-bold text-white">Zero Data Quality Defects Found</h5>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  All {activeDataset.rowCount} records passed mandatory, uniqueness, format, range, and referential checks.
                </p>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[300px] pr-1">
                {issues.slice(0, 5).map(issue => (
                  <div
                    key={issue.issueId}
                    onClick={() => onSelectIssue(issue)}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 transition cursor-pointer flex items-center justify-between space-x-3"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase shrink-0 ${
                        issue.severity === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : issue.severity === 'ERROR'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}>
                        {issue.severity}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-white truncate">
                            Row #{issue.rowNumber} • {issue.columnName}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            [{issue.ruleName}]
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 truncate mt-0.5">
                          {issue.errorMessage}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                        issue.resolutionStatus === 'FIXED_IN_SOURCE'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : issue.resolutionStatus === 'IN_REVIEW'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {issue.resolutionStatus}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing {Math.min(5, issues.length)} of {issues.length} detected exceptions
            </span>
            <button
              onClick={() => onNavigateToTab('explorer')}
              className="font-medium text-indigo-400 hover:text-indigo-300 cursor-pointer"
            >
              Open Interactive Grid &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

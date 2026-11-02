import React, { useState, useMemo } from 'react';
import { 
  FileDown, 
  FileSpreadsheet, 
  ShieldCheck, 
  CheckCircle2, 
  Download, 
  Printer, 
  Award,
  Layers,
  Clock,
  Sparkles,
  Edit3,
  Trash2,
  Filter,
  Search,
  User,
  History,
  X,
  Check,
  AlertTriangle
} from 'lucide-react';
import { Dataset, ValidationRun, ValidationIssue, ValidationRule, ResolutionHistory, ResolutionStatus } from '../types';
import { downloadTextFile, exportDatasetToCsv, exportIssuesToCsv } from '../utils/csvParser';

interface ExportAuditViewProps {
  dataset: Dataset;
  latestRun: ValidationRun | null;
  issues: ValidationIssue[];
  rules: ValidationRule[];
  resolutionHistories: ResolutionHistory[];
  onEditAuditLog?: (resolutionId: string, status: ResolutionStatus, comment: string) => void;
  onDeleteAuditLog?: (resolutionId: string) => void;
}

export const ExportAuditView: React.FC<ExportAuditViewProps> = ({
  dataset,
  latestRun,
  issues,
  rules,
  resolutionHistories,
  onEditAuditLog,
  onDeleteAuditLog
}) => {
  // Search & Filter for Resolution Logs
  const [logFilterStatus, setLogFilterStatus] = useState<string>('ALL');
  const [logSearchTerm, setLogSearchTerm] = useState('');

  // Editing state for an individual audit log
  const [editingLog, setEditingLog] = useState<ResolutionHistory | null>(null);
  const [editStatus, setEditStatus] = useState<ResolutionStatus>('IN_REVIEW');
  const [editComment, setEditComment] = useState('');

  // Filtered resolution histories
  const filteredLogs = useMemo(() => {
    return resolutionHistories.filter(log => {
      if (logFilterStatus !== 'ALL' && log.resolutionStatus !== logFilterStatus) {
        return false;
      }
      if (logSearchTerm.trim()) {
        const term = logSearchTerm.toLowerCase();
        const matchesComment = (log.resolutionComment || '').toLowerCase().includes(term);
        const matchesIssueId = (log.issueId || '').toLowerCase().includes(term);
        const matchesUser = (log.resolvedBy || '').toLowerCase().includes(term);
        if (!matchesComment && !matchesIssueId && !matchesUser) return false;
      }
      return true;
    });
  }, [resolutionHistories, logFilterStatus, logSearchTerm]);

  const handleOpenEdit = (log: ResolutionHistory) => {
    setEditingLog(log);
    setEditStatus(log.resolutionStatus);
    setEditComment(log.resolutionComment);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog || !editComment.trim()) return;
    if (onEditAuditLog) {
      onEditAuditLog(editingLog.resolutionId, editStatus, editComment.trim());
    }
    setEditingLog(null);
  };

  const handleDelete = (resolutionId: string) => {
    if (window.confirm('Are you sure you want to delete this resolution audit log?')) {
      if (onDeleteAuditLog) {
        onDeleteAuditLog(resolutionId);
      }
    }
  };

  const handleExportFullAuditJson = () => {
    const auditPackage = {
      auditTimestamp: new Date().toISOString(),
      platform: 'SilentGuard',
      environment: 'Quality Audit Staging',
      dataset: {
        id: dataset.datasetId,
        fileName: dataset.fileName,
        rowCount: dataset.rowCount,
        columns: dataset.columns,
        sourceSystem: dataset.sourceSystem,
        reportedSuccess: dataset.reportedSuccess
      },
      validationRun: latestRun,
      rulesConfigured: rules,
      issuesIdentified: issues,
      resolutionHistory: resolutionHistories,
      successMetrics: {
        totalIssuesFlagged: issues.length,
        executionLatencyMs: latestRun?.executionTimeMs ?? 0,
        unresolvedDefects: issues.filter(i => i.resolutionStatus === 'OPEN').length,
        fixedDefects: issues.filter(i => i.resolutionStatus === 'FIXED_IN_SOURCE').length
      }
    };

    downloadTextFile(
      JSON.stringify(auditPackage, null, 2),
      `silentguard_audit_package_${dataset.fileName.replace('.csv', '')}.json`,
      'application/json'
    );
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  const resolvedCount = issues.filter(i => i.resolutionStatus === 'FIXED_IN_SOURCE' || i.resolutionStatus === 'WAIVED').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <FileDown className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Reports, Audit Package &amp; Compliance Export</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
              Ready for Download
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Inspect data steward audit logs, edit or delete resolution records, and export verifiable machine-readable audit packages.
          </p>
        </div>

        <button
          onClick={handlePrintCertificate}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5 text-slate-400" />
          <span>Print Summary Certificate</span>
        </button>
      </div>

      {/* Export Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cleaned Dataset CSV */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white mb-1">
              Export Verified Dataset (CSV)
            </h4>
            <p className="text-xs text-slate-400">
              Download the active records with in-browser corrections applied, ready for ingestion into downstream reporting.
            </p>
          </div>

          <button
            onClick={() => downloadTextFile(exportDatasetToCsv(dataset), `cleaned_${dataset.fileName}`)}
            className="mt-4 w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center space-x-1.5 transition border border-slate-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Download Clean CSV</span>
          </button>
        </div>

        {/* Exceptions Report CSV */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-3">
              <FileDown className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white mb-1">
              Exceptions &amp; Defects Log (CSV)
            </h4>
            <p className="text-xs text-slate-400">
              Structured spreadsheet containing row numbers, failed rule names, severity levels, and specific error messages.
            </p>
          </div>

          <button
            onClick={() => downloadTextFile(exportIssuesToCsv(issues), `exceptions_${dataset.fileName}`)}
            className="mt-4 w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center space-x-1.5 transition border border-slate-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-rose-400" />
            <span>Download Exceptions CSV</span>
          </button>
        </div>

        {/* Full Compliance Package JSON */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white mb-1">
              Full Compliance Bundle (JSON)
            </h4>
            <p className="text-xs text-slate-400">
              Complete verifiable audit JSON with applied rules, execution timestamp, individual issue records, and resolution notes.
            </p>
          </div>

          <button
            onClick={handleExportFullAuditJson}
            className="mt-4 w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Audit JSON</span>
          </button>
        </div>
      </div>

      {/* Flagged Exceptions & Data Steward Audit Logs Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {/* Header & Controls */}
        <div className="p-4 sm:p-5 bg-slate-950/50 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>Remediation Audit Trail &amp; Exception Logs</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                  {resolutionHistories.length} Records
                </span>
              </h4>
              <p className="text-xs text-slate-400">
                Logged resolutions from Dashboard and Records &amp; Exceptions. Edit resolution status or delete logs directly.
              </p>
            </div>
          </div>

          {/* Search & Status Filter */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="relative min-w-[180px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit comments..."
                value={logSearchTerm}
                onChange={(e) => setLogSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
              />
            </div>

            <select
              value={logFilterStatus}
              onChange={(e) => setLogFilterStatus(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500 cursor-pointer font-mono"
            >
              <option value="ALL">All Statuses ({resolutionHistories.length})</option>
              <option value="IN_REVIEW">IN_REVIEW</option>
              <option value="FIXED_IN_SOURCE">FIXED_IN_SOURCE</option>
              <option value="FALSE_POSITIVE">FALSE_POSITIVE</option>
              <option value="WAIVED">WAIVED</option>
              <option value="OPEN">OPEN</option>
            </select>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0b0f17] text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Issue ID / Ref</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3">Logged By</th>
                <th className="py-2.5 px-3">Audit Comment &amp; Remediation</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No remediation logs found matching the filter. Log a resolution on any flagged exception to see it recorded here.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  return (
                    <tr key={log.resolutionId} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-3 font-mono text-slate-400 whitespace-nowrap">
                        {new Date(log.updatedAt).toLocaleDateString()} {new Date(log.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-3 font-mono text-indigo-300">
                        {log.issueId}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          log.resolutionStatus === 'FIXED_IN_SOURCE'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : log.resolutionStatus === 'WAIVED'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : log.resolutionStatus === 'FALSE_POSITIVE'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : log.resolutionStatus === 'IN_REVIEW'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {log.resolutionStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <User className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{log.resolvedBy || 'Data Steward'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-300 max-w-md">
                        <p className="truncate" title={log.resolutionComment}>
                          {log.resolutionComment}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleOpenEdit(log)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                            title="Edit Status & Comment"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                          </button>
                          <button
                            onClick={() => handleDelete(log.resolutionId)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                            title="Delete Log"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Audit Log Modal */}
      {editingLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-indigo-400" />
                <span>Edit Remediation Audit Log</span>
              </h3>
              <button
                onClick={() => setEditingLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Target Issue Reference
                </label>
                <input
                  type="text"
                  disabled
                  value={editingLog.issueId}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-500 font-mono text-xs cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Resolution Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as ResolutionStatus)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="OPEN">OPEN (Unaddressed Exception)</option>
                  <option value="IN_REVIEW">IN_REVIEW (Under QA Review)</option>
                  <option value="FIXED_IN_SOURCE">FIXED_IN_SOURCE (Corrected in upstream file/source)</option>
                  <option value="FALSE_POSITIVE">FALSE_POSITIVE (Rule exception verified)</option>
                  <option value="WAIVED">WAIVED (Accepted business exception)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Audit Comment / Remediation Action Notes
                </label>
                <textarea
                  required
                  rows={4}
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingLog(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/30 transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Update Log</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Compliance Verification Certificate Card (Ready to Print / Present) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400">
                Official Validation Attestation
              </span>
              <h3 className="text-base font-bold text-white">
                SilentGuard Data Quality Certificate
              </h3>
            </div>
          </div>

          <div className="text-right text-xs font-mono text-slate-400">
            <div>AUDIT ID: SG-{(latestRun?.runId || 'PENDING').substring(0, 14)}</div>
            <div>DATE: {new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-6 text-xs font-mono">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px]">EVALUATED DATASET</span>
            <span className="text-white font-bold truncate block">{dataset.fileName}</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px]">RECORD VOLUME</span>
            <span className="text-white font-bold">{dataset.rowCount} rows</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px]">DATA QUALITY SCORE</span>
            <span className={`font-bold text-sm ${latestRun && latestRun.healthScore >= 80 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {latestRun?.healthScore ?? 0}%
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px]">RESOLUTION PROGRESS</span>
            <span className="text-emerald-400 font-bold">
              {resolvedCount} resolved / {issues.length} total
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 leading-relaxed">
          <p>
            This document attests that <strong>{dataset.fileName}</strong> was subjected to deterministic business rule validation by the SilentGuard engine. 
            All evaluated columns were vetted against mandatory presence, uniqueness, numerical ranges, regex patterns, and cross-field chronology. 
            {issues.length > 0 ? (
              <span className="text-amber-300">
                {' '}{issues.length} defect(s) were flagged; {resolvedCount} resolved through logged data-steward intervention.
              </span>
            ) : (
              <span className="text-emerald-300">
                {' '}Zero violations detected across all active business rules. Data is certified for production import.
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

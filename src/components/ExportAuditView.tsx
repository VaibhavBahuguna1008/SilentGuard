import React from 'react';
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
  Sparkles
} from 'lucide-react';
import { Dataset, ValidationRun, ValidationIssue, ValidationRule, ResolutionHistory } from '../types';
import { downloadTextFile, exportDatasetToCsv, exportIssuesToCsv } from '../utils/csvParser';

interface ExportAuditViewProps {
  dataset: Dataset;
  latestRun: ValidationRun | null;
  issues: ValidationIssue[];
  rules: ValidationRule[];
  resolutionHistories: ResolutionHistory[];
}

export const ExportAuditView: React.FC<ExportAuditViewProps> = ({
  dataset,
  latestRun,
  issues,
  rules,
  resolutionHistories
}) => {
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
  const openCount = issues.filter(i => i.resolutionStatus === 'OPEN' || i.resolutionStatus === 'IN_REVIEW').length;

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
            Export machine-readable data files and full verification audit logs to prove data integrity and satisfy enterprise compliance mandates.
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

        {/* Full Audit Package JSON */}
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

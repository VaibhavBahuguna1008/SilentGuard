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
  AlertTriangle,
  FileText,
  Eye,
  CheckCircle
} from 'lucide-react';
import { 
  Dataset, 
  ValidationRun, 
  ValidationIssue, 
  ValidationRule, 
  ResolutionHistory, 
  ResolutionStatus,
  EmployeeUser 
} from '../types';
import { 
  downloadTextFile, 
  exportDatasetToCsv, 
  exportIssuesToCsv,
  exportDatasetToExcel,
  exportIssuesToExcel,
  exportComprehensiveAuditExcel 
} from '../utils/spreadsheetParser';
import { 
  downloadAuditReportPdf, 
  generateAuditReportPdfBlobUrl 
} from '../utils/pdfReportGenerator';

interface ExportAuditViewProps {
  dataset: Dataset;
  latestRun: ValidationRun | null;
  issues: ValidationIssue[];
  rules: ValidationRule[];
  resolutionHistories: ResolutionHistory[];
  currentUser?: EmployeeUser | null;
  onEditAuditLog?: (resolutionId: string, status: ResolutionStatus, comment: string) => void;
  onDeleteAuditLog?: (resolutionId: string) => void;
}

export const ExportAuditView: React.FC<ExportAuditViewProps> = ({
  dataset,
  latestRun,
  issues,
  rules,
  resolutionHistories,
  currentUser,
  onEditAuditLog,
  onDeleteAuditLog
}) => {
  const isAdmin = currentUser?.role === 'ADMIN';

  // Search & Filter for Resolution Logs
  const [logFilterStatus, setLogFilterStatus] = useState<string>('ALL');
  const [logSearchTerm, setLogSearchTerm] = useState('');

  // Editing state for an individual audit log
  const [editingLog, setEditingLog] = useState<ResolutionHistory | null>(null);
  const [editStatus, setEditStatus] = useState<ResolutionStatus>('IN_REVIEW');
  const [editComment, setEditComment] = useState('');

  // PDF Preview State
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

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

  // 1. PDF Audit Report Handler
  const handleDownloadPdfReport = () => {
    downloadAuditReportPdf({
      dataset,
      latestRun,
      issues,
      rules,
      resolutionHistories,
      currentUser
    });
  };

  const handleOpenPdfPreview = () => {
    try {
      const url = generateAuditReportPdfBlobUrl({
        dataset,
        latestRun,
        issues,
        rules,
        resolutionHistories,
        currentUser
      });
      setPdfBlobUrl(url);
      setIsPdfPreviewOpen(true);
    } catch (e) {
      console.error('Failed to generate PDF preview:', e);
      handleDownloadPdfReport();
    }
  };

  // 2. Excel Handlers
  const handleDownloadCleanExcel = () => {
    exportDatasetToExcel(dataset);
  };

  const handleDownloadExceptionsExcel = () => {
    exportIssuesToExcel(issues);
  };

  const handleDownloadMasterWorkbookExcel = () => {
    exportComprehensiveAuditExcel({
      dataset,
      latestRun,
      issues,
      rules,
      resolutionHistories,
      certifierName: currentUser?.name
    });
  };

  // 3. JSON Compliance Package Handler
  const handleExportFullAuditJson = () => {
    const auditPackage = {
      auditTimestamp: new Date().toISOString(),
      platform: 'SilentGuard Quality Gateway',
      environment: 'Motherson Industrial Quality Staging',
      certifiedBy: currentUser ? `${currentUser.name} (${currentUser.employeeId})` : 'Authorized Data Steward',
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
        fixedDefects: issues.filter(i => i.resolutionStatus === 'FIXED_IN_SOURCE').length,
        waivedDefects: issues.filter(i => i.resolutionStatus === 'WAIVED').length
      }
    };

    downloadTextFile(
      JSON.stringify(auditPackage, null, 2),
      `motherson_audit_package_${dataset.fileName.replace(/\.[^/.]+$/, '')}.json`,
      'application/json'
    );
  };

  const resolvedCount = issues.filter(i => i.resolutionStatus === 'FIXED_IN_SOURCE' || i.resolutionStatus === 'WAIVED').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <FileDown className="w-5 h-5 text-red-600 dark:text-red-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Official Quality Reports, PDF Audit &amp; Compliance Export
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30 font-mono font-bold">
              Multi-Format Gateway
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 max-w-2xl">
            Export structured PDF audit reports, clean datasets in Excel (.xlsx) and CSV, or verifiable machine-readable compliance packages for Motherson plant operations.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleOpenPdfPreview}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 transition cursor-pointer shadow-2xs"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
            <span>Preview PDF</span>
          </button>

          <button
            onClick={handleDownloadPdfReport}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#e31b23] hover:bg-[#c41219] text-white shadow-sm shadow-red-950/30 transition cursor-pointer border border-red-500/30"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF Audit Report</span>
          </button>
        </div>
      </div>

      {/* Primary Highlights: PDF & Comprehensive Excel Audit */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Featured Card 1: Official PDF Quality Audit Report */}
        <div className="bg-gradient-to-br from-red-500/10 via-white to-red-500/5 dark:from-red-950/30 dark:via-[#131418] dark:to-[#131418] border-2 border-red-500/30 dark:border-red-500/40 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md">
                <FileText className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 font-mono border border-red-200 dark:border-red-500/40">
                RECOMMENDED AUDIT FORMAT
              </span>
            </div>

            <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
              Official PDF Quality Audit &amp; Compliance Report
            </h4>
            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
              Concise, human-readable executive audit document. Encapsulates all quality assessment metrics, active validation rules, detected silent failures, and complete data steward remediation details with digital verification seals.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-lg bg-white/80 dark:bg-black/30 border border-red-200/60 dark:border-red-500/20">
                <span className="text-slate-500 dark:text-zinc-400 block">Dataset Health:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {latestRun?.healthScore ?? 100}% Score • {issues.length} Flagged
                </span>
              </div>
              <div className="p-2 rounded-lg bg-white/80 dark:bg-black/30 border border-red-200/60 dark:border-red-500/20">
                <span className="text-slate-500 dark:text-zinc-400 block">Remediation Status:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {resolvedCount} of {issues.length} Resolved
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center space-x-2">
            <button
              onClick={handleDownloadPdfReport}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#e31b23] hover:bg-[#c41219] text-white text-xs font-bold flex items-center justify-center space-x-2 transition shadow-md cursor-pointer border border-red-500/40"
            >
              <Download className="w-4 h-4" />
              <span>Download Signed PDF Report</span>
            </button>
            <button
              onClick={handleOpenPdfPreview}
              className="py-2.5 px-3 rounded-xl bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold flex items-center justify-center space-x-1 border border-slate-200 dark:border-zinc-700 shadow-2xs cursor-pointer"
              title="Preview generated PDF"
            >
              <Eye className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
              <span>Preview</span>
            </button>
          </div>
        </div>

        {/* Featured Card 2: 5-Sheet Excel Audit Master Workbook */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-white to-emerald-500/5 dark:from-emerald-950/30 dark:via-[#131418] dark:to-[#131418] border-2 border-emerald-500/30 dark:border-emerald-500/40 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 font-mono border border-emerald-200 dark:border-emerald-500/40">
                5-SHEET AUDIT WORKBOOK
              </span>
            </div>

            <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
              Comprehensive Audit Master Workbook (.XLSX)
            </h4>
            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
              Complete multi-tab Microsoft Excel workbook. Contains Executive Summary, Validation Rules Registry, Detailed Defect Logs, Stewardship Remediation Trail, and Clean Master Data.
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5 text-[10px] font-mono">
              <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">1. Executive_Summary</span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">2. Validation_Rules</span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">3. Flagged_Defects</span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">4. Audit_Trail</span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">5. Master_Data</span>
            </div>
          </div>

          <div className="mt-5">
            <button
              onClick={handleDownloadMasterWorkbookExcel}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center space-x-2 transition shadow-md cursor-pointer border border-emerald-500/40"
            >
              <Download className="w-4 h-4" />
              <span>Download 5-Sheet Audit Excel (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Modular Export Grid: Clean Datasets & Raw Logs */}
      <div>
        <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-3">
          Granular Spreadsheets &amp; Compliance Logs
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Verified Dataset Excel */}
          <div className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-2.5">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <h5 className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                Verified Dataset (Excel .xlsx)
              </h5>
              <p className="text-[11px] text-slate-600 dark:text-zinc-400">
                Active dataset records with in-browser steward corrections applied in native XLSX format.
              </p>
            </div>

            <button
              onClick={handleDownloadCleanExcel}
              className="mt-3 w-full py-1.5 px-3 rounded-xl bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-semibold flex items-center justify-center space-x-1.5 transition border border-slate-200 dark:border-zinc-700 shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Download Excel (.xlsx)</span>
            </button>
          </div>

          {/* Exceptions Excel */}
          <div className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400 mb-2.5">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <h5 className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                Defects Log (Excel .xlsx)
              </h5>
              <p className="text-[11px] text-slate-600 dark:text-zinc-400">
                Spreadsheet of all flagged rule breaches, row numbers, observed values, and error messages.
              </p>
            </div>

            <button
              onClick={handleDownloadExceptionsExcel}
              className="mt-3 w-full py-1.5 px-3 rounded-xl bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-semibold flex items-center justify-center space-x-1.5 transition border border-slate-200 dark:border-zinc-700 shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
              <span>Download Excel (.xlsx)</span>
            </button>
          </div>

          {/* Verified Dataset CSV */}
          <div className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2.5">
                <FileDown className="w-4 h-4" />
              </div>
              <h5 className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                Verified Dataset (CSV)
              </h5>
              <p className="text-[11px] text-slate-600 dark:text-zinc-400">
                Standard comma-delimited RFC 4180 CSV export for direct pipeline consumption.
              </p>
            </div>

            <button
              onClick={() => downloadTextFile(exportDatasetToCsv(dataset), `cleaned_${dataset.fileName.replace(/\.[^/.]+$/, '')}.csv`)}
              className="mt-3 w-full py-1.5 px-3 rounded-xl bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-semibold flex items-center justify-center space-x-1.5 transition border border-slate-200 dark:border-zinc-700 shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Download CSV</span>
            </button>
          </div>

          {/* Compliance Package JSON */}
          <div className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-2.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h5 className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                Raw Audit Package (JSON)
              </h5>
              <p className="text-[11px] text-slate-600 dark:text-zinc-400">
                Verifiable machine-readable payload for external SIEM / Motherson ERP audit pipelines.
              </p>
            </div>

            <button
              onClick={handleExportFullAuditJson}
              className="mt-3 w-full py-1.5 px-3 rounded-xl bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-semibold flex items-center justify-center space-x-1.5 transition border border-slate-200 dark:border-zinc-700 shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Download JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* Flagged Exceptions & Data Steward Audit Logs Section */}
      <div className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-2xl overflow-hidden shadow-sm">
        {/* Header & Controls */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-[#0e0f13] border-b border-slate-200 dark:border-[#242630] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-transparent">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Remediation Audit Trail &amp; Exception Logs</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/20 dark:text-red-300 font-mono font-bold">
                  {resolutionHistories.length} Records
                </span>
              </h4>
              <p className="text-xs text-slate-600 dark:text-zinc-400">
                Logged resolutions from Dashboard and Records &amp; Exceptions. Included in official PDF and Excel audit reports.
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
                className="w-full bg-white dark:bg-[#0b0c0e] border border-slate-200 dark:border-[#242630] rounded-xl pl-9 pr-3 py-1.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/30 text-xs shadow-2xs font-mono"
              />
            </div>

            <select
              value={logFilterStatus}
              onChange={(e) => setLogFilterStatus(e.target.value)}
              className="bg-white dark:bg-[#0b0c0e] border border-slate-200 dark:border-[#242630] rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-white focus:outline-none focus:border-red-600 cursor-pointer font-mono shadow-2xs"
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
            <thead className="bg-slate-50 dark:bg-[#0b0c0e] text-slate-600 dark:text-zinc-400 font-mono text-[11px] border-b border-slate-200 dark:border-[#242630]">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Issue ID / Ref</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3">Logged By</th>
                <th className="py-2.5 px-3">Audit Comment &amp; Remediation</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#242630] text-slate-800 dark:text-zinc-200 font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 dark:text-zinc-500">
                    No remediation logs found matching the filter. Log a resolution on any flagged exception to see it recorded here.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const statusColors: Record<string, string> = {
                    FIXED_IN_SOURCE: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30',
                    WAIVED: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30',
                    FALSE_POSITIVE: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
                    IN_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
                    OPEN: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30'
                  };

                  return (
                    <tr key={log.resolutionId} className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/30 transition">
                      <td className="py-2.5 px-3 text-slate-500 dark:text-zinc-400 whitespace-nowrap text-[11px]">
                        {new Date(log.updatedAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                        {log.issueId}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border font-bold ${statusColors[log.resolutionStatus] || statusColors.OPEN}`}>
                          {log.resolutionStatus}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-zinc-300">
                        {log.resolvedBy}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800 dark:text-zinc-200 max-w-md truncate">
                        {log.resolutionComment}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleOpenEdit(log)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-zinc-800 transition cursor-pointer"
                            title="Edit resolution log"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(log.resolutionId)}
                              className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                              title="Admin only: Delete audit log entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* Edit Resolution Log Modal */}
      {editingLog && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#242630]">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Edit Audit Resolution Record
              </h4>
              <button
                onClick={() => setEditingLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-zinc-400 font-medium mb-1">
                  Issue Reference ID:
                </label>
                <input
                  type="text"
                  disabled
                  value={editingLog.issueId}
                  className="w-full bg-slate-100 dark:bg-[#0b0c0e] border border-slate-200 dark:border-[#242630] rounded-xl px-3 py-2 text-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-zinc-300 font-medium mb-1">
                  Resolution Status:
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as ResolutionStatus)}
                  className="w-full bg-white dark:bg-[#0b0c0e] border border-slate-200 dark:border-[#242630] rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-red-600"
                >
                  <option value="IN_REVIEW">IN_REVIEW</option>
                  <option value="FIXED_IN_SOURCE">FIXED_IN_SOURCE</option>
                  <option value="FALSE_POSITIVE">FALSE_POSITIVE</option>
                  <option value="WAIVED">WAIVED</option>
                  <option value="OPEN">OPEN</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-zinc-300 font-medium mb-1">
                  Audit Justification / Remediation Comment:
                </label>
                <textarea
                  rows={3}
                  required
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  className="w-full bg-white dark:bg-[#0b0c0e] border border-slate-200 dark:border-[#242630] rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none focus:border-red-600 resize-none font-mono text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLog(null)}
                  className="px-3.5 py-1.5 rounded-xl text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#e31b23] hover:bg-[#c41219] text-white font-semibold transition shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Live Preview Modal */}
      {isPdfPreviewOpen && pdfBlobUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-2xl w-full max-w-4xl h-[85vh] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-[#242630] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-red-600 dark:text-red-500" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Motherson SilentGuard Official Quality Audit Report Preview
                </h4>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleDownloadPdfReport}
                  className="px-3 py-1.5 rounded-xl bg-[#e31b23] hover:bg-[#c41219] text-white text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => {
                    setIsPdfPreviewOpen(false);
                    if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
                    setPdfBlobUrl(null);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 dark:bg-black/40 p-2">
              <iframe
                src={pdfBlobUrl}
                title="Motherson PDF Quality Audit Report"
                className="w-full h-full rounded-xl border border-slate-200 dark:border-zinc-800 shadow-inner"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

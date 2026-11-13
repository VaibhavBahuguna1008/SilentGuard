import React, { useState } from 'react';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Building2,
  Users,
  CreditCard,
  Loader2,
  Layers,
  FileCheck
} from 'lucide-react';
import { 
  parseSpreadsheetFile, 
  createDatasetFromSpreadsheet,
  SpreadsheetParseResult 
} from '../utils/spreadsheetParser';
import { Dataset, EmployeeUser } from '../types';
import { 
  EMPLOYEE_CSV, 
  MOTHERSON_PARTS_CSV, 
  FINANCIAL_ORDERS_CSV 
} from '../data/mockDatasets';
import { api } from '../services/api';
import { hasPermission } from '../services/authService';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDatasetCreated: (dataset: Dataset, suggestedPresetId?: string) => void;
  currentUser?: EmployeeUser | null;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onDatasetCreated,
  currentUser
}) => {
  if (!isOpen) return null;

  const [fileName, setFileName] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [sourceSystem, setSourceSystem] = useState('Motherson MES / Shopfloor Gateway');
  const [previewInfo, setPreviewInfo] = useState<{ rowCount: number; columns: string[] } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Excel multi-sheet support
  const [fileFormat, setFileFormat] = useState<'csv' | 'xlsx'>('csv');
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [activeFile, setActiveFile] = useState<File | null>(null);

  const canUpload = hasPermission(currentUser || null, 'upload_data');

  const processFile = async (file: File, sheetName?: string) => {
    setActiveFile(file);
    setFileName(file.name);
    setUploadError(null);
    setParseError(null);

    const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');
    setFileFormat(isExcel ? 'xlsx' : 'csv');

    try {
      const res: SpreadsheetParseResult = await parseSpreadsheetFile(file, sheetName);
      if (res.error) {
        setParseError(res.error);
        setPreviewInfo(null);
        setParsedRows([]);
        return;
      }

      setCsvContent(res.rawCsv);
      setParsedRows(res.data);
      setAvailableSheets(res.sheetNames || []);
      setSelectedSheet(res.activeSheet || '');
      setPreviewInfo({
        rowCount: res.rowCount,
        columns: res.columns
      });
    } catch (e: any) {
      setParseError(`Failed to process spreadsheet: ${e?.message || 'Invalid file format'}`);
      setPreviewInfo(null);
    }
  };

  const handleFileUpload = (file: File) => {
    processFile(file);
  };

  const handleSheetChange = (newSheet: string) => {
    if (activeFile) {
      processFile(activeFile, newSheet);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleCsvTextChange = (text: string) => {
    setCsvContent(text);
    setUploadError(null);
    setFileFormat('csv');
    setActiveFile(null);
    setAvailableSheets([]);

    if (!text.trim()) {
      setPreviewInfo(null);
      setParseError(null);
      setParsedRows([]);
      return;
    }

    const dummyFile = new File([text], fileName || 'data_entry.csv', { type: 'text/csv' });
    processFile(dummyFile);
  };

  const handleLoadDemo = (type: 'employee' | 'motherson' | 'orders') => {
    if (type === 'employee') {
      const name = 'employee_master_roster.csv';
      setFileName(name);
      setSourceSystem('Workday HCM Cloud');
      const file = new File([EMPLOYEE_CSV], name, { type: 'text/csv' });
      processFile(file);
    } else if (type === 'motherson') {
      const name = 'motherson_parts_batch_dispatch.xlsx';
      setFileName(name);
      setSourceSystem('Motherson Shopfloor MES');
      const file = new File([MOTHERSON_PARTS_CSV], name, { type: 'text/csv' });
      processFile(file);
    } else if (type === 'orders') {
      const name = 'financial_orders.csv';
      setFileName(name);
      setSourceSystem('Stripe Global Ledger');
      const file = new File([FINANCIAL_ORDERS_CSV], name, { type: 'text/csv' });
      processFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewInfo || previewInfo.rowCount === 0) return;

    if (!canUpload) {
      setUploadError('Access Denied: Quality Lead (Steward) or Administrator role required to ingest datasets.');
      return;
    }

    setIsSubmitting(true);
    setUploadError(null);

    const effectiveFileName = fileName || (fileFormat === 'xlsx' ? 'dataset.xlsx' : 'dataset.csv');

    try {
      // 1. Attempt Spring Boot backend upload if active
      let backendDataset: Dataset | null = null;
      try {
        const fileToUpload = activeFile || new File([csvContent], effectiveFileName, { 
          type: fileFormat === 'xlsx' 
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            : 'text/csv' 
        });
        backendDataset = await api.uploadCsvFile(fileToUpload, 'BATCH', sourceSystem);
      } catch (backendErr) {
        console.warn('Backend PostgreSQL upload unavailable, using client-side resilient ingestion:', backendErr);
      }

      // 2. If backend succeeded, use it; otherwise create local dataset
      const baseDataset = backendDataset || createDatasetFromSpreadsheet({
        fileName: effectiveFileName,
        rawData: parsedRows,
        columns: previewInfo.columns,
        originalCsv: csvContent,
        fileType: fileFormat === 'xlsx' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
          : 'text/csv',
        uploadedBy: currentUser ? `${currentUser.name} (${currentUser.employeeId})` : 'Data Steward',
        uploadedById: currentUser?.employeeId,
        uploadedByEmail: currentUser?.email,
        isPreset: false,
        sourceSystem: sourceSystem,
        reportedSuccess: true
      });

      const effectiveDataset: Dataset = {
        ...baseDataset,
        uploadedById: currentUser?.employeeId || baseDataset.uploadedById,
        uploadedByEmail: currentUser?.email || baseDataset.uploadedByEmail,
        uploadedBy: currentUser ? `${currentUser.name} (${currentUser.employeeId})` : baseDataset.uploadedBy,
        isPreset: false
      };

      // 3. Auto-suggest preset based on recognized domain columns
      let suggestedPresetId: string | undefined = undefined;
      const colStr = effectiveDataset.columns.map(c => c.toLowerCase()).join(' ');
      if (colStr.includes('part') || colStr.includes('batch') || colStr.includes('dispatch')) {
        suggestedPresetId = 'preset-motherson-parts';
      } else if (colStr.includes('employee') || colStr.includes('salary') || colStr.includes('department')) {
        suggestedPresetId = 'preset-employee';
      } else if (colStr.includes('order') || colStr.includes('amount') || colStr.includes('currency')) {
        suggestedPresetId = 'preset-financial-orders';
      }

      onDatasetCreated(effectiveDataset, suggestedPresetId);
      onClose();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to ingest spreadsheet dataset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-[#242630]">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <UploadCloud className="w-5 h-5 text-red-600 dark:text-red-500" />
              <span>Ingest Dataset (CSV &amp; Excel .XLSX)</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5">
              Multi-format data ingestion gateway with automatic sheet detection &amp; schema mapping.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!canUpload && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              You are signed in as <strong>{currentUser?.name}</strong> with <strong>Viewer</strong> privileges. File ingestion requires Quality Steward or Administrator credentials.
            </span>
          </div>
        )}

        {/* Demo Seed Presets (One-click) */}
        <div className="mt-4">
          <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-2">
            Quick Load Industry Benchmarks with Seeded Silent Errors:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => handleLoadDemo('motherson')}
              className="flex items-start p-2.5 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50/70 hover:bg-red-100/70 dark:bg-red-950/20 dark:hover:bg-red-950/30 text-left transition cursor-pointer group"
            >
              <Building2 className="w-4 h-4 text-red-600 dark:text-red-500 shrink-0 mt-0.5 mr-2" />
              <div>
                <span className="text-xs font-semibold text-slate-900 dark:text-white block group-hover:text-red-700 dark:group-hover:text-red-300">
                  Motherson Parts (.XLSX)
                </span>
                <span className="text-[10px] text-slate-600 dark:text-zinc-400 block leading-tight">
                  8 records • Chronology mismatch, negative quantity
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleLoadDemo('employee')}
              className="flex items-start p-2.5 rounded-xl border border-slate-200 dark:border-[#242630] bg-slate-50 hover:bg-slate-100 dark:bg-[#0b0c0e] dark:hover:bg-zinc-800/40 text-left transition cursor-pointer group"
            >
              <Users className="w-4 h-4 text-slate-500 dark:text-zinc-400 shrink-0 mt-0.5 mr-2" />
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 block group-hover:text-slate-900 dark:group-hover:text-white">
                  Employee Master (.CSV)
                </span>
                <span className="text-[10px] text-slate-500 dark:text-zinc-500 block leading-tight">
                  8 records • Missing email, negative salary
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleLoadDemo('orders')}
              className="flex items-start p-2.5 rounded-xl border border-slate-200 dark:border-[#242630] bg-slate-50 hover:bg-slate-100 dark:bg-[#0b0c0e] dark:hover:bg-zinc-800/40 text-left transition cursor-pointer group"
            >
              <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 mr-2" />
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 block group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                  Financial Ledger (.CSV)
                </span>
                <span className="text-[10px] text-slate-500 dark:text-zinc-500 block leading-tight">
                  8 records • Order amounts &amp; currency integrity
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Upload Dropzone */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition ${
              dragActive 
                ? 'border-red-600 bg-red-50 dark:bg-red-600/10' 
                : 'border-slate-300 dark:border-[#242630] bg-slate-50/50 dark:bg-[#0b0c0e] hover:border-red-500 dark:hover:border-red-600/40'
            }`}
          >
            <div className="flex items-center justify-center space-x-2 mb-2">
              <FileSpreadsheet className="w-8 h-8 text-red-600 dark:text-red-500" />
            </div>
            <p className="text-xs text-slate-700 dark:text-zinc-300 font-medium">
              Drag &amp; drop an <span className="font-bold text-red-600 dark:text-red-400">Excel (.xlsx, .xls)</span> or <span className="font-bold text-red-600 dark:text-red-400">CSV (.csv)</span> file, or{' '}
              <label className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 cursor-pointer underline font-semibold">
                browse files
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
              </label>
            </p>
            <p className="text-[11px] text-slate-500 dark:text-zinc-500 mt-1">
              Supports Microsoft Excel (.xlsx/.xls) with multi-sheet parsing and standard RFC 4180 CSV
            </p>
          </div>

          {/* Excel Multi-Sheet Selector */}
          {availableSheets.length > 1 && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0e0f13] border border-slate-200 dark:border-[#242630] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                  Multiple Worksheets Detected:
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-slate-500 dark:text-zinc-400">Active Sheet:</span>
                <select
                  value={selectedSheet}
                  onChange={(e) => handleSheetChange(e.target.value)}
                  className="bg-white dark:bg-[#0b0c0e] border border-slate-200 dark:border-[#242630] rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-red-600 cursor-pointer"
                >
                  {availableSheets.map(sheet => (
                    <option key={sheet} value={sheet}>{sheet}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Form Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-zinc-300 font-medium mb-1">Target Filename</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="dataset_name.xlsx or .csv"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full bg-white dark:bg-[#0b0c0e] border border-slate-200 dark:border-[#242630] rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-red-600 font-mono text-xs shadow-2xs"
                />
                {fileFormat === 'xlsx' && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    EXCEL
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-zinc-300 font-medium mb-1">Source System Designation</label>
              <input
                type="text"
                placeholder="e.g. Motherson MES, SAP ERP, Workday"
                value={sourceSystem}
                onChange={(e) => setSourceSystem(e.target.value)}
                className="w-full bg-white dark:bg-[#0b0c0e] border border-slate-200 dark:border-[#242630] rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-red-600 text-xs shadow-2xs"
              />
            </div>
          </div>

          {/* Raw CSV / Data Content Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-700 dark:text-zinc-300 font-medium text-xs">
                Parsed Data Preview &amp; Ingest Buffer
              </label>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                {previewInfo ? `${previewInfo.rowCount} records • ${previewInfo.columns.length} columns` : ''}
              </span>
            </div>
            <textarea
              rows={4}
              required
              placeholder="part_number,batch_id,quantity,dispatch_date,destination_plant&#10;MTH-4401,LOT-2026-X,120,2026-10-14,Plant-Noida..."
              value={csvContent}
              onChange={(e) => handleCsvTextChange(e.target.value)}
              className="w-full bg-white dark:bg-[#0b0c0e] font-mono text-[11px] border border-slate-200 dark:border-[#242630] rounded-xl p-3 text-slate-900 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-red-600 resize-none shadow-2xs"
            />
          </div>

          {/* Preview / Parse Result Box */}
          {previewInfo && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-500/30 text-red-800 dark:text-red-300 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  Successfully mapped <strong>{previewInfo.rowCount} records</strong> with columns:{' '}
                  <span className="font-mono text-slate-900 dark:text-white text-[11px] font-bold">
                    {previewInfo.columns.slice(0, 6).join(', ')}{previewInfo.columns.length > 6 ? ` (+${previewInfo.columns.length - 6} more)` : ''}
                  </span>
                </span>
              </div>
            </div>
          )}

          {parseError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-rose-500/10 border border-red-200 dark:border-rose-500/20 text-red-700 dark:text-rose-300 flex items-center space-x-2 text-xs">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-rose-400 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {uploadError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-rose-500/10 border border-red-200 dark:border-rose-500/20 text-red-700 dark:text-rose-300 flex items-center space-x-2 text-xs">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-rose-400 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-200 dark:border-[#242630]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition cursor-pointer text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!previewInfo || previewInfo.rowCount === 0 || isSubmitting || !canUpload}
              className="px-5 py-2 rounded-xl bg-[#e31b23] hover:bg-[#c41219] text-white font-semibold shadow-md shadow-red-950/40 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center space-x-2 text-xs border border-red-500/30"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Ingesting Dataset...</span>
                </>
              ) : (
                <span>Ingest &amp; Execute Validation</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

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
  Loader2
} from 'lucide-react';
import { parseCsvString } from '../utils/csvParser';
import { Dataset } from '../types';
import { 
  EMPLOYEE_CSV, 
  MOTHERSON_PARTS_CSV, 
  FINANCIAL_ORDERS_CSV 
} from '../data/mockDatasets';
import { api } from '../services/api';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDatasetCreated: (dataset: Dataset, suggestedPresetId?: string) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onDatasetCreated
}) => {
  if (!isOpen) return null;

  const [fileName, setFileName] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [sourceSystem, setSourceSystem] = useState('Enterprise ERP');
  const [previewInfo, setPreviewInfo] = useState<{ rowCount: number; columns: string[] } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleCsvTextChange = (text: string) => {
    setCsvContent(text);
    setUploadError(null);
    if (!text.trim()) {
      setPreviewInfo(null);
      setParseError(null);
      return;
    }

    const parsed = parseCsvString(text);
    if (parsed.error) {
      setParseError(parsed.error);
      setPreviewInfo(null);
    } else {
      setParseError(null);
      setPreviewInfo({
        rowCount: parsed.rowCount,
        columns: parsed.columns
      });
    }
  };

  const handleFileUpload = (file: File) => {
    setFileName(file.name);
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      handleCsvTextChange(text);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleLoadDemo = (type: 'employee' | 'motherson' | 'orders') => {
    if (type === 'employee') {
      const name = 'employee_master_data.csv';
      setFileName(name);
      setSourceSystem('Workday Core HR Export');
      handleCsvTextChange(EMPLOYEE_CSV);
    } else if (type === 'motherson') {
      const name = 'motherson_parts_dispatch.csv';
      setFileName(name);
      setSourceSystem('Motherson MES / Shopfloor Ingest');
      handleCsvTextChange(MOTHERSON_PARTS_CSV);
    } else if (type === 'orders') {
      const name = 'financial_orders_inbound.csv';
      setFileName(name);
      setSourceSystem('Global Payment Gateway');
      handleCsvTextChange(FINANCIAL_ORDERS_CSV);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvContent.trim()) return;

    setIsSubmitting(true);
    setUploadError(null);

    const effectiveFileName = fileName || 'uploaded_dataset.csv';
    const csvFile = new File([csvContent], effectiveFileName, { type: 'text/csv' });

    try {
      // Upload file directly to Spring Boot backend + PostgreSQL
      const savedDataset = await api.uploadCsvFile(csvFile, 'BATCH', sourceSystem);

      let suggestedPresetId: string | undefined = undefined;
      if (savedDataset.columns.includes('employee_id') || savedDataset.columns.includes('salary')) {
        suggestedPresetId = 'preset-employee';
      } else if (savedDataset.columns.includes('part_number') || savedDataset.columns.includes('batch_id')) {
        suggestedPresetId = 'preset-motherson-parts';
      } else if (savedDataset.columns.includes('order_id') || savedDataset.columns.includes('total_amount')) {
        suggestedPresetId = 'preset-financial-orders';
      }

      onDatasetCreated(savedDataset, suggestedPresetId);
      onClose();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload dataset to PostgreSQL database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <UploadCloud className="w-5 h-5 text-indigo-400" />
              <span>Upload CSV Dataset to PostgreSQL</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Input CSV files for structural parsing and Spring Boot PostgreSQL ingestion.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Seed Presets (One-click) */}
        <div className="mt-4">
          <label className="text-xs font-bold text-slate-300 block mb-2">
            Quick Load Synthetic Datasets with Seeded Errors:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => handleLoadDemo('employee')}
              className="flex items-start p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/60 text-left transition cursor-pointer group"
            >
              <Users className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5 mr-2" />
              <div>
                <span className="text-xs font-semibold text-slate-200 block group-hover:text-indigo-300">
                  Employee Master
                </span>
                <span className="text-[10px] text-slate-500 block leading-tight">
                  8 rows • Missing email, negative salary, duplicate ID
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleLoadDemo('motherson')}
              className="flex items-start p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/60 text-left transition cursor-pointer group"
            >
              <Building2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 mr-2" />
              <div>
                <span className="text-xs font-semibold text-slate-200 block group-hover:text-amber-300">
                  Motherson Parts
                </span>
                <span className="text-[10px] text-slate-500 block leading-tight">
                  8 rows • Chronology mismatch, negative quantity
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleLoadDemo('orders')}
              className="flex items-start p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/60 text-left transition cursor-pointer group"
            >
              <CreditCard className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 mr-2" />
              <div>
                <span className="text-xs font-semibold text-slate-200 block group-hover:text-emerald-300">
                  Financial Orders
                </span>
                <span className="text-[10px] text-slate-500 block leading-tight">
                  8 rows • Transaction order amounts &amp; currency
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
              dragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
            }`}
          >
            <FileSpreadsheet className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
            <p className="text-xs text-slate-300 font-medium">
              Drag &amp; drop a CSV file here, or{' '}
              <label className="text-indigo-400 hover:text-indigo-300 cursor-pointer underline">
                browse files
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
              </label>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Supports standard comma-delimited RFC 4180 CSV files up to 50MB
            </p>
          </div>

          {/* Form Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Target Filename</label>
              <input
                type="text"
                placeholder="dataset_name.csv"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Source System Designation</label>
              <input
                type="text"
                placeholder="e.g. SAP ERP, Workday, Inbound Partner FTP"
                value={sourceSystem}
                onChange={(e) => setSourceSystem(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Raw CSV Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-300 font-medium text-xs">CSV Raw Content / Edit</label>
              <span className="text-[11px] text-slate-400 font-mono">
                {previewInfo ? `${previewInfo.rowCount} records • ${previewInfo.columns.length} columns` : ''}
              </span>
            </div>
            <textarea
              rows={5}
              required
              placeholder="employee_id,name,email,salary,department_id&#10;101,Amit,amit@example.com,45000,10..."
              value={csvContent}
              onChange={(e) => handleCsvTextChange(e.target.value)}
              className="w-full bg-slate-950 font-mono text-[11px] border border-slate-700 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Preview / Parse Result Box */}
          {previewInfo && (
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Parsed <strong>{previewInfo.rowCount} records</strong> with columns:{' '}
                  <span className="font-mono text-white text-[11px]">
                    {previewInfo.columns.join(', ')}
                  </span>
                </span>
              </div>
            </div>
          )}

          {parseError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center space-x-2 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {uploadError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center space-x-2 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!previewInfo || previewInfo.rowCount === 0 || isSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center space-x-2 text-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading to PostgreSQL...</span>
                </>
              ) : (
                <span>Upload to PostgreSQL &amp; Validate</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

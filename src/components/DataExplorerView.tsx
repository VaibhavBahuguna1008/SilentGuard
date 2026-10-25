import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Edit3, 
  Save, 
  X, 
  Download, 
  Plus, 
  Trash2, 
  Sparkles, 
  Layers, 
  Info, 
  Check, 
  FileSpreadsheet,
  Sliders
} from 'lucide-react';
import { Dataset, ValidationIssue } from '../types';
import { downloadTextFile, exportDatasetToCsv } from '../utils/csvParser';
import { inferColumnSemanticDomain } from '../services/semanticDisambiguator';
import { getFieldDefinition } from '../data/mockDatasets';
import { AutoFixVerificationModal } from './AutoFixVerificationModal';

interface DataExplorerViewProps {
  dataset: Dataset;
  issues: ValidationIssue[];
  onSelectIssue: (issue: ValidationIssue) => void;
  onUpdateDatasetRecords: (updatedRecords: Record<string, string>[], updatedColumns?: string[]) => void;
  onRunValidation: () => void;
  onOpenDisambiguatorWithValue?: (val: string) => void;
}

export const DataExplorerView: React.FC<DataExplorerViewProps> = ({
  dataset,
  issues,
  onSelectIssue,
  onUpdateDatasetRecords,
  onRunValidation,
  onOpenDisambiguatorWithValue,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'ISSUES_ONLY' | 'CLEAN_ONLY'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'ERROR' | 'WARNING'>('ALL');
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editedRowData, setEditedRowData] = useState<Record<string, string>>({});
  const [hoveredCell, setHoveredCell] = useState<{ rowIndex: number; colName: string } | null>(null);
  const [showExceptionsPanel, setShowExceptionsPanel] = useState<boolean>(true);

  // Dynamic Column Addition State
  const [isAddColModalOpen, setIsAddColModalOpen] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColDefaultVal, setNewColDefaultVal] = useState('');
  const [hasAppliedFixes, setHasAppliedFixes] = useState(false);
  const [isAutoFixModalOpen, setIsAutoFixModalOpen] = useState(false);

  // Map issues by rowNumber and columnName for instant cell lookup
  const issueMap = useMemo(() => {
    const map = new Map<string, ValidationIssue[]>();
    for (const issue of issues) {
      const key = `${issue.rowNumber}:${issue.columnName}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(issue);
    }
    return map;
  }, [issues]);

  // Set of row numbers with issues
  const rowsWithIssues = useMemo(() => {
    return new Set(issues.map(i => i.rowNumber));
  }, [issues]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return dataset.rawData
      .map((row, idx) => ({ row, rowNumber: idx + 1, originalIndex: idx }))
      .filter(({ row, rowNumber }) => {
        const hasIssue = rowsWithIssues.has(rowNumber);
        if (filterMode === 'ISSUES_ONLY' && !hasIssue) return false;
        if (filterMode === 'CLEAN_ONLY' && hasIssue) return false;

        if (severityFilter !== 'ALL') {
          const rowIssues = issues.filter(i => i.rowNumber === rowNumber);
          if (!rowIssues.some(i => i.severity === severityFilter)) return false;
        }

        if (searchTerm.trim() !== '') {
          const term = searchTerm.toLowerCase();
          const matches = Object.values(row).some(val => 
            String(val).toLowerCase().includes(term)
          );
          if (!matches) return false;
        }

        return true;
      });
  }, [dataset.rawData, rowsWithIssues, issues, filterMode, severityFilter, searchTerm]);

  // Handle Edit Row
  const startEditingRow = (index: number, row: Record<string, string>) => {
    setEditingRowIndex(index);
    setEditedRowData({ ...row });
  };

  const cancelEditing = () => {
    setEditingRowIndex(null);
    setEditedRowData({});
  };

  const saveEditedRow = () => {
    if (editingRowIndex === null) return;
    const newRecords = [...dataset.rawData];
    newRecords[editingRowIndex] = editedRowData;
    setHasAppliedFixes(true);
    onUpdateDatasetRecords(newRecords);
    setEditingRowIndex(null);
    setEditedRowData({});
  };

  // Append a new column to the schema and initialize values
  const handleAddNewColumnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const colTrimmed = newColName.trim();
    if (!colTrimmed || dataset.columns.includes(colTrimmed)) return;

    const updatedCols = [...dataset.columns, colTrimmed];
    const updatedRecords = dataset.rawData.map(row => ({
      ...row,
      [colTrimmed]: newColDefaultVal
    }));

    onUpdateDatasetRecords(updatedRecords, updatedCols);
    setIsAddColModalOpen(false);
    setNewColName('');
    setNewColDefaultVal('');
  };

  // Remove column from schema and records
  const handleDeleteColumn = (colToDelete: string) => {
    if (dataset.columns.length <= 1) return;
    const updatedCols = dataset.columns.filter(c => c !== colToDelete);
    const updatedRecords = dataset.rawData.map(row => {
      const copy = { ...row };
      delete copy[colToDelete];
      return copy;
    });

    onUpdateDatasetRecords(updatedRecords, updatedCols);
  };

  // Apply corrections to common sample anomalies
  const applyQuickDemoFix = () => {
    const fixed = dataset.rawData.map(row => {
      const copy = { ...row };
      if (copy.employee_id === '' && copy.name?.includes('Neha')) {
        copy.employee_id = '104';
      }
      if (copy.email === '' && copy.name?.includes('Priya')) {
        copy.email = 'priya.patel@example.com';
      }
      if (copy.employee_id === '102' && copy.name?.includes('Rahul')) {
        copy.employee_id = '103';
        if (parseFloat(copy.salary) < 0) copy.salary = '52000';
      }
      if (copy.email?.includes('sneha-at-corp.com')) {
        copy.email = 'sneha@example.com';
      }
      if (copy.department_id === '99') {
        copy.department_id = '40'; // Valid HR dept in expanded catalog
      }
      if (copy.quantity === '-20') copy.quantity = '120';
      if (copy.quantity === '0') copy.quantity = '100';
      if (!copy.supplier_code && copy.batch_id === 'BATCH-2026-B') copy.supplier_code = 'SUP-USA-05';
      if (copy.status === 'InvalidStatus') copy.status = 'Approved';
      if (copy.delivery_date === '2026-09-25' && copy.manufacturing_date === '2026-10-01') {
        copy.delivery_date = '2026-10-15';
      }
      return copy;
    });

    setHasAppliedFixes(true);
    onUpdateDatasetRecords(fixed);
  };

  const handleDownloadCleanedCsv = () => {
    const csvContent = exportDatasetToCsv(dataset);
    downloadTextFile(csvContent, `corrected_${dataset.fileName}`, 'text/csv');
  };

  return (
    <div className="space-y-4">
      {/* Control bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Mode toggle */}
          <div className="inline-flex rounded-xl bg-slate-950/60 p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setFilterMode('ALL')}
              className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                filterMode === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Records ({dataset.rowCount})
            </button>
            <button
              onClick={() => setFilterMode('ISSUES_ONLY')}
              className={`px-3 py-1 rounded-lg font-medium transition flex items-center space-x-1 cursor-pointer ${
                filterMode === 'ISSUES_ONLY'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Exceptions Only</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/30 text-rose-200">
                {rowsWithIssues.size}
              </span>
            </button>
            <button
              onClick={() => setFilterMode('CLEAN_ONLY')}
              className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                filterMode === 'CLEAN_ONLY'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Clean Records ({dataset.rowCount - rowsWithIssues.size})
            </button>
          </div>

          {/* Severity filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            aria-label="Filter by severity"
            className="bg-slate-950/60 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="ERROR">Error Only</option>
            <option value="WARNING">Warning Only</option>
          </select>
        </div>

        {/* Action Buttons: Add Column & Download Corrected CSV */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Dynamic Column Addition Button */}
          <button
            onClick={() => setIsAddColModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
            title="Dynamically introduce a new column to test real-time validation error propagation"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
            <span>Add Column</span>
          </button>

          {rowsWithIssues.size > 0 && (
            <button
              onClick={() => setIsAutoFixModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition shadow-sm cursor-pointer"
              title="Inspect backend legitimacy rules, review replacement values, and auto-fix"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Review &amp; Auto-Fix</span>
            </button>
          )}

          {/* Value Disambiguator Button */}
          {onOpenDisambiguatorWithValue && (
            <button
              onClick={() => onOpenDisambiguatorWithValue('120')}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-950/40 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-900/60 transition shadow-sm cursor-pointer"
              title="Analyze how shared values (like 120) are scoped to specific column domains"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Value Disambiguator (e.g. 120)</span>
            </button>
          )}

          {/* Prominent Download Corrected CSV Button */}
          <button
            onClick={handleDownloadCleanedCsv}
            className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow cursor-pointer ${
              rowsWithIssues.size === 0 || hasAppliedFixes
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
            title="Download corrected dataset file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{rowsWithIssues.size === 0 ? 'Download Verified CSV' : 'Download Corrected CSV'}</span>
          </button>
        </div>
      </div>

      {/* Exceptions & Plain-English Error Explanations Panel */}
      {issues.length > 0 && (
        <div className="bg-slate-900/90 border border-rose-500/30 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>Exceptions &amp; Plain-English Explanations</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {issues.length} Issues Across {rowsWithIssues.size} Records
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Clear, jargon-free explanations of what went wrong with numbers and values in this dataset, and how to resolve them.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsAutoFixModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition cursor-pointer"
                title="Open Auto-Fix Verification modal to inspect backend legitimacy logic"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verify &amp; Auto-Fix Values</span>
              </button>
              <button
                onClick={() => setShowExceptionsPanel(!showExceptionsPanel)}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 transition cursor-pointer"
              >
                {showExceptionsPanel ? 'Collapse List' : 'Expand All Explanations'}
              </button>
            </div>
          </div>

          {showExceptionsPanel && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {issues.map((issue) => {
                const fieldDef = getFieldDefinition(issue.columnName);
                const rowIdx = issue.rowNumber - 1;

                return (
                  <div
                    key={issue.issueId}
                    className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-3"
                  >
                    <div>
                      {/* Header with Row and Severity */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-slate-300">
                          Row #{issue.rowNumber} • <span className="text-indigo-400">{issue.columnName}</span>
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold uppercase ${
                          issue.severity === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {issue.severity}
                        </span>
                      </div>

                      {/* Cell Value Found */}
                      <div className="mt-2 text-xs font-mono flex items-center space-x-1.5 text-slate-400">
                        <span>Observed Value:</span>
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                          {issue.foundValue}
                        </span>
                      </div>

                      {/* What's Wrong */}
                      <div className="mt-2 p-2 rounded-lg bg-rose-950/30 border border-rose-500/30 text-xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">
                          What is wrong:
                        </span>
                        <p className="text-white font-medium mt-0.5 text-xs">
                          {issue.simpleProblem || issue.errorMessage}
                        </p>
                      </div>

                      {/* How to Fix */}
                      <div className="mt-2 p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                          How to fix:
                        </span>
                        <p className="text-emerald-200 mt-0.5 text-xs">
                          {issue.simpleFix || 'Provide a valid entry'}
                        </p>
                      </div>

                      {/* Field Plain Meaning */}
                      <p className="text-[11px] text-slate-400 mt-2">
                        <span className="text-slate-500 font-semibold">{fieldDef.displayName}:</span> {fieldDef.plainMeaning}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <button
                        onClick={() => {
                          if (dataset.rawData[rowIdx]) {
                            startEditingRow(rowIdx, dataset.rawData[rowIdx]);
                          }
                        }}
                        className="inline-flex items-center space-x-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Row #{issue.rowNumber}</span>
                      </button>

                      <button
                        onClick={() => onSelectIssue(issue)}
                        className="text-xs text-slate-400 hover:text-white transition cursor-pointer"
                      >
                        Audit Details &rarr;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Main Records Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-3 bg-slate-950/40 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-200">Dataset Grid:</span>
            <span>Showing {filteredRows.length} of {dataset.rowCount} rows</span>
            <span className="text-slate-600">•</span>
            <span className="font-mono text-indigo-300">{dataset.columns.length} columns registered</span>
          </div>

          <div className="flex items-center space-x-3 text-[11px]">
            <span className="text-slate-400">
              Columns are strictly scoped to isolated semantic domains. Click <Sliders className="w-3 h-3 inline text-indigo-400" /> on any cell to inspect cross-column validity.
            </span>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[600px] relative">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0b0f17] text-slate-300 font-mono text-[11px] sticky top-0 z-20 shadow-sm border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3 w-14 text-center border-r border-slate-800/60 font-semibold text-slate-500">
                  #
                </th>
                <th className="py-2.5 px-3 w-24 text-center border-r border-slate-800/60 font-semibold">
                  Status
                </th>
                {dataset.columns.map((col) => {
                  const colIssues = issues.filter(i => i.columnName === col);
                  const domain = inferColumnSemanticDomain(col);

                  return (
                    <th key={col} className="py-2.5 px-3 border-r border-slate-800/60 font-semibold min-w-[145px] group">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col min-w-0 pr-1">
                          <span className="truncate">{col}</span>
                          <span className="text-[9px] text-slate-500 font-sans font-normal truncate" title={domain.domainLabel}>
                            {domain.domainLabel.split(' ')[0]}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 shrink-0">
                          {colIssues.length > 0 && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              {colIssues.length}
                            </span>
                          )}
                          <button
                            onClick={() => handleDeleteColumn(col)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                            title={`Drop column '${col}' to simulate schema change`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </th>
                  );
                })}
                <th className="py-2.5 px-3 w-20 text-center font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={dataset.columns.length + 3} className="py-12 text-center text-slate-500">
                    No records match current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRows.map(({ row, rowNumber, originalIndex }) => {
                  const isEditing = editingRowIndex === originalIndex;
                  const rowIssues = issues.filter(i => i.rowNumber === rowNumber);
                  const hasIssues = rowIssues.length > 0;

                  return (
                    <tr
                      key={originalIndex}
                      className={`hover:bg-slate-800/30 transition ${
                        hasIssues ? 'bg-rose-950/10' : ''
                      } ${isEditing ? 'bg-indigo-950/30 ring-1 ring-indigo-500' : ''}`}
                    >
                      {/* Row index */}
                      <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-500 border-r border-slate-800/60">
                        {rowNumber}
                      </td>

                      {/* Row Status Badge */}
                      <td className="py-2.5 px-3 text-center border-r border-slate-800/60">
                        {hasIssues ? (
                          <button
                            onClick={() => onSelectIssue(rowIssues[0])}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 cursor-pointer"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            <span>{rowIssues.length} issue{rowIssues.length > 1 ? 's' : ''}</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Valid</span>
                          </span>
                        )}
                      </td>

                      {/* Columns */}
                      {dataset.columns.map((col) => {
                        const cellKey = `${rowNumber}:${col}`;
                        const cellIssues = issueMap.get(cellKey) || [];
                        const isCellInvalid = cellIssues.length > 0;
                        const cellVal = isEditing ? (editedRowData[col] ?? '') : (row[col] ?? '');

                        return (
                          <td
                            key={col}
                            className={`py-2 px-3 border-r border-slate-800/60 relative group ${
                              isCellInvalid
                                ? 'bg-rose-500/15 text-rose-200 font-medium'
                                : ''
                            }`}
                            onMouseEnter={() => setHoveredCell({ rowIndex: originalIndex, colName: col })}
                            onMouseLeave={() => setHoveredCell(null)}
                          >
                            {isEditing ? (
                              <input
                                type="text"
                                value={cellVal}
                                onChange={(e) =>
                                  setEditedRowData({ ...editedRowData, [col]: e.target.value })
                                }
                                className="w-full bg-slate-950 border border-indigo-500/70 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                              />
                            ) : (
                              <div className="flex items-center justify-between">
                                <span className="truncate">
                                  {cellVal === '' ? (
                                    <span className="text-slate-600 italic font-mono">&lt;EMPTY&gt;</span>
                                  ) : (
                                    cellVal
                                  )}
                                </span>
                                <div className="flex items-center space-x-1 shrink-0">
                                  {cellVal !== '' && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenDisambiguatorWithValue?.(cellVal);
                                      }}
                                      className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-indigo-400 cursor-pointer transition"
                                      title={`Test value '${cellVal}' across all column domains`}
                                    >
                                      <Sliders className="w-3 h-3" />
                                    </button>
                                  )}
                                  {isCellInvalid && (
                                    <button
                                      onClick={() => onSelectIssue(cellIssues[0])}
                                      title={cellIssues.map(i => i.errorMessage).join('\n')}
                                      className="p-0.5 text-rose-400 hover:text-rose-200 cursor-pointer shrink-0"
                                    >
                                      <AlertTriangle className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Floating tooltip on hover if invalid */}
                            {isCellInvalid && hoveredCell?.rowIndex === originalIndex && hoveredCell?.colName === col && !isEditing && (
                              <div className="absolute left-2 -top-24 z-30 bg-[#0f172a] text-slate-100 p-3 rounded-xl border border-rose-500/50 shadow-2xl text-[11px] pointer-events-none min-w-[260px] max-w-sm">
                                <div className="font-bold text-rose-400 flex items-center space-x-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                  <span>{cellIssues[0].simpleProblem || cellIssues[0].errorMessage}</span>
                                </div>
                                <div className="text-emerald-300 font-medium mt-1 flex items-start space-x-1">
                                  <span className="text-emerald-400 font-bold shrink-0">Fix:</span>
                                  <span>{cellIssues[0].simpleFix || 'Correct cell value'}</span>
                                </div>
                                <div className="text-slate-400 text-[10px] mt-1 pt-1 border-t border-slate-800">
                                  <span className="text-slate-500 font-medium">Field meaning:</span> {getFieldDefinition(col).plainMeaning}
                                </div>
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* Row Actions */}
                      <td className="py-2 px-3 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={saveEditedRow}
                              className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-500 cursor-pointer"
                              title="Save Changes"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditingRow(originalIndex, row)}
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                            title="Edit row data in-place to fix corruptions"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Auto-Fix Verification & Legitimacy Inspector Modal */}
      <AutoFixVerificationModal
        isOpen={isAutoFixModalOpen}
        onClose={() => setIsAutoFixModalOpen(false)}
        dataset={dataset}
        issues={issues}
        onApplyFixes={(updatedRecords) => {
          setHasAppliedFixes(true);
          onUpdateDatasetRecords(updatedRecords);
        }}
      />

      {/* Dynamic Add Column Modal */}
      {isAddColModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-white mb-1 flex items-center space-x-2">
              <Plus className="w-4 h-4 text-indigo-400" />
              <span>Introduce Dynamic Column to Schema</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Simulates dynamic schema evolution. New column will be added across all records and dynamically analyzed for quality errors.
            </p>

            <form onSubmit={handleAddNewColumnSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Column Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. hire_date, cost_center, country_code..."
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Default Initial Value (Optional)</label>
                <input
                  type="text"
                  placeholder="Leave empty to test empty cell detection..."
                  value={newColDefaultVal}
                  onChange={(e) => setNewColDefaultVal(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddColModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/30 transition cursor-pointer"
                >
                  Add &amp; Dynamically Validate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

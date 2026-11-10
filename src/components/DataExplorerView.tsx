import React, { useState, useMemo, useEffect } from 'react';
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
  Sliders,
  History,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { Dataset, ValidationIssue, ValidationRule } from '../types';
import { downloadTextFile, exportDatasetToCsv } from '../utils/csvParser';
import { inferColumnSemanticDomain } from '../services/semanticDisambiguator';
import { getFieldDefinition, MASTER_DEPARTMENT_CATALOG } from '../data/mockDatasets';
import { AutoFixVerificationModal } from './AutoFixVerificationModal';
import { AddColumnModal, AddColumnResult } from './AddColumnModal';
import { DuplicateColumnResolverModal } from './DuplicateColumnResolverModal';

interface DataExplorerViewProps {
  dataset: Dataset;
  issues: ValidationIssue[];
  onSelectIssue: (issue: ValidationIssue) => void;
  onUpdateDatasetRecords: (updatedRecords: Record<string, string>[], updatedColumns?: string[]) => void;
  onRunValidation: () => void;
  onOpenDisambiguatorWithValue?: (val: string) => void;
  onAddMultipleRules?: (rules: ValidationRule[]) => void;
}

export const DataExplorerView: React.FC<DataExplorerViewProps> = ({
  dataset,
  issues,
  onSelectIssue,
  onUpdateDatasetRecords,
  onRunValidation,
  onOpenDisambiguatorWithValue,
  onAddMultipleRules,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'ISSUES_ONLY' | 'CLEAN_ONLY'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'ERROR' | 'WARNING'>('ALL');
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editedRowData, setEditedRowData] = useState<Record<string, string>>({});
  const [hoveredCell, setHoveredCell] = useState<{ rowIndex: number; colName: string } | null>(null);
  const [showExceptionsPanel, setShowExceptionsPanel] = useState<boolean>(true);

  // Dynamic Column Addition & Duplicate Resolver State
  const [isAddColModalOpen, setIsAddColModalOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [hasAppliedFixes, setHasAppliedFixes] = useState(false);
  const [isAutoFixModalOpen, setIsAutoFixModalOpen] = useState(false);

  // Pagination states for responsive handling of 25,000+ records
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [exceptionsPage, setExceptionsPage] = useState<number>(1);
  const exceptionsPerPage = 12;

  // Filter issues strictly relevant to the active dataset columns and non-synthetic row numbers
  const relevantIssues = useMemo(() => {
    const colSet = new Set(dataset.columns);
    return issues.filter(issue => 
      colSet.has(issue.columnName) &&
      issue.foundValue !== '<MISSING HEADER>' &&
      issue.foundValue !== '<MISSING SECOND COLUMN>' &&
      issue.rowNumber > 0 &&
      issue.rowNumber <= dataset.rowCount
    );
  }, [issues, dataset.columns, dataset.rowCount]);

  // Map issues by rowNumber and columnName for instant O(1) cell lookup
  const issueMap = useMemo(() => {
    const map = new Map<string, ValidationIssue[]>();
    for (const issue of relevantIssues) {
      const key = `${issue.rowNumber}:${issue.columnName}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(issue);
    }
    return map;
  }, [relevantIssues]);

  // Set of row numbers with issues for instant O(1) lookup
  const rowsWithIssues = useMemo(() => {
    return new Set(relevantIssues.map(i => i.rowNumber));
  }, [relevantIssues]);

  // Pre-index issues by rowNumber for instant O(1) row queries
  const issuesByRowNumber = useMemo(() => {
    const map = new Map<number, ValidationIssue[]>();
    for (const issue of relevantIssues) {
      const list = map.get(issue.rowNumber) || [];
      list.push(issue);
      map.set(issue.rowNumber, list);
    }
    return map;
  }, [relevantIssues]);

  // Pre-index severities by rowNumber for instant O(1) severity filtering (eliminates O(N*M) scanning on 25,000 rows)
  const severitiesByRow = useMemo(() => {
    const map = new Map<number, Set<string>>();
    for (const issue of relevantIssues) {
      let set = map.get(issue.rowNumber);
      if (!set) {
        set = new Set<string>();
        map.set(issue.rowNumber, set);
      }
      set.add(issue.severity);
    }
    return map;
  }, [relevantIssues]);

  // Pre-index issue counts by column name for instant O(1) header counts
  const issuesCountByCol = useMemo(() => {
    const map = new Map<string, number>();
    for (const issue of relevantIssues) {
      map.set(issue.columnName, (map.get(issue.columnName) || 0) + 1);
    }
    return map;
  }, [relevantIssues]);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterMode, severityFilter, dataset.datasetId]);

  // Filtered rows (optimized O(1) inner checks)
  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const hasSearch = term !== '';

    return dataset.rawData
      .map((row, idx) => ({ row, rowNumber: idx + 1, originalIndex: idx }))
      .filter(({ row, rowNumber }) => {
        const hasIssue = rowsWithIssues.has(rowNumber);
        if (filterMode === 'ISSUES_ONLY' && !hasIssue) return false;
        if (filterMode === 'CLEAN_ONLY' && hasIssue) return false;

        if (severityFilter !== 'ALL') {
          const rowSeverities = severitiesByRow.get(rowNumber);
          if (!rowSeverities || !rowSeverities.has(severityFilter)) return false;
        }

        if (hasSearch) {
          const matches = Object.values(row).some(val => 
            String(val).toLowerCase().includes(term)
          );
          if (!matches) return false;
        }

        return true;
      });
  }, [dataset.rawData, rowsWithIssues, severitiesByRow, filterMode, severityFilter, searchTerm]);

  // Slice paginated records for butter-smooth rendering
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const clampedCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedRows = useMemo(() => {
    const start = (clampedCurrentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, clampedCurrentPage, pageSize]);

  const startRecordIndex = filteredRows.length === 0 ? 0 : (clampedCurrentPage - 1) * pageSize + 1;
  const endRecordIndex = Math.min(clampedCurrentPage * pageSize, filteredRows.length);

  // Paginated exceptions for card grid
  const displayExceptions = relevantIssues.length > 0 ? relevantIssues : issues;
  const totalExceptionPages = Math.max(1, Math.ceil(displayExceptions.length / exceptionsPerPage));
  const clampedExceptionPage = Math.min(Math.max(1, exceptionsPage), totalExceptionPages);

  const paginatedExceptions = useMemo(() => {
    const start = (clampedExceptionPage - 1) * exceptionsPerPage;
    return displayExceptions.slice(start, start + exceptionsPerPage);
  }, [displayExceptions, clampedExceptionPage, exceptionsPerPage]);

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

  // Detect duplicate or colliding column names in current dataset
  const duplicateColumnPairs = useMemo(() => {
    const seen = new Map<string, string[]>();
    for (const c of dataset.columns) {
      const normalized = c.toLowerCase().replace(/(_\d+|_copy|_alt|_backup)$/, '');
      if (!seen.has(normalized)) seen.set(normalized, []);
      seen.get(normalized)!.push(c);
    }
    const pairs: Array<{ key: string; cols: string[] }> = [];
    for (const [key, cols] of seen.entries()) {
      if (cols.length > 1) pairs.push({ key, cols });
    }
    return pairs;
  }, [dataset.columns]);

  // Handle column addition with custom data type, check constraints, and duplicate resolution
  const handleAddNewColumn = (result: AddColumnResult) => {
    const {
      columnName,
      defaultValue,
      rules,
      duplicateResolution,
      resolvedColumnName
    } = result;

    const finalCol = resolvedColumnName || columnName;
    let updatedCols = [...dataset.columns];
    let updatedRecords: Record<string, string>[] = [];

    if (duplicateResolution === 'OVERWRITE') {
      updatedRecords = dataset.rawData.map(row => ({
        ...row,
        [finalCol]: defaultValue
      }));
    } else if (duplicateResolution === 'MERGE') {
      updatedRecords = dataset.rawData.map(row => {
        const copy = { ...row };
        if (!copy[finalCol] || copy[finalCol].trim() === '') {
          copy[finalCol] = defaultValue;
        }
        return copy;
      });
    } else {
      // Standard addition or Disambiguated rename (e.g. email_2)
      if (!updatedCols.includes(finalCol)) {
        updatedCols = [...updatedCols, finalCol];
      }
      updatedRecords = dataset.rawData.map(row => ({
        ...row,
        [finalCol]: defaultValue
      }));
    }

    onUpdateDatasetRecords(updatedRecords, updatedCols);

    // Register identified or configured check constraints/rules
    if (rules && rules.length > 0 && onAddMultipleRules) {
      onAddMultipleRules(rules);
    }
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

  // Helper to render typed cell editor based on column semantics
  const renderCellEditor = (col: string, cellVal: string) => {
    const colLower = col.toLowerCase();
    const isDate = colLower.includes('date') || colLower.includes('time') || /^\d{4}-\d{2}-\d{2}$/.test(cellVal.trim());
    const isStatus = colLower.includes('status');
    const isDept = colLower.includes('dept');
    const isNumber = colLower.includes('salary') || colLower.includes('qty') || colLower.includes('quantity') || colLower.includes('amount') || colLower.includes('price');
    const isEmail = colLower.includes('email') || colLower.includes('mail');

    // 1. Date Editor: Ensure flexible text entry, calendar picker, and auto-conversion so full dates are never truncated or rejected
    if (isDate) {
      const isValidIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(cellVal.trim());
      return (
        <div className="min-w-[175px] space-y-1">
          <div className="flex items-center space-x-1">
            <input
              type="text"
              placeholder="YYYY-MM-DD"
              value={cellVal}
              onChange={(e) => {
                setEditedRowData({ ...editedRowData, [col]: e.target.value });
              }}
              className="flex-1 bg-[#0b0c0e] border border-red-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-600 font-mono"
            />
            <input
              type="date"
              value={isValidIsoDate ? cellVal.trim() : ''}
              onChange={(e) => {
                if (e.target.value) {
                  setEditedRowData({ ...editedRowData, [col]: e.target.value });
                }
              }}
              className="w-7 h-7 bg-[#14151a] border border-red-600/60 rounded p-0 text-xs text-white cursor-pointer"
              title="Pick date from calendar"
            />
          </div>
          {!isValidIsoDate && cellVal && (
            <div className="flex items-center justify-between text-[10px] text-amber-400 font-mono">
              <span className="truncate max-w-[90px]" title={cellVal}>{cellVal}</span>
              <button
                type="button"
                onClick={() => {
                  const parsed = Date.parse(cellVal);
                  const iso = !isNaN(parsed) ? new Date(parsed).toISOString().split('T')[0] : '2026-10-15';
                  setEditedRowData({ ...editedRowData, [col]: iso });
                }}
                className="px-1.5 py-0.2 rounded bg-red-600/30 text-red-300 hover:bg-red-600 hover:text-white transition"
              >
                Auto ISO
              </button>
            </div>
          )}
        </div>
      );
    }

    // 2. Status / Allowed Values Dropdown
    if (isStatus) {
      const standardStatuses = ['Approved', 'Pending', 'Shipped', 'Quality_Check', 'Active', 'Inactive'];
      const hasCurrent = standardStatuses.includes(cellVal);
      return (
        <select
          value={cellVal}
          onChange={(e) => setEditedRowData({ ...editedRowData, [col]: e.target.value })}
          className="w-full min-w-[125px] bg-[#0b0c0e] border border-red-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-600 font-mono cursor-pointer"
        >
          {!hasCurrent && cellVal && (
            <option value={cellVal} className="bg-red-950 text-red-300">
              ⚠️ Current: {cellVal}
            </option>
          )}
          {standardStatuses.map((s) => (
            <option key={s} value={s} className="bg-[#14151a] text-white">
              {s}
            </option>
          ))}
        </select>
      );
    }

    // 3. Department Code Dropdown
    if (isDept) {
      return (
        <select
          value={cellVal}
          onChange={(e) => setEditedRowData({ ...editedRowData, [col]: e.target.value })}
          className="w-full min-w-[145px] bg-[#0b0c0e] border border-red-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-600 font-mono cursor-pointer"
        >
          {MASTER_DEPARTMENT_CATALOG.map((dept) => (
            <option key={dept.code} value={dept.code} className="bg-[#14151a] text-white">
              {dept.code} ({dept.name})
            </option>
          ))}
          {!MASTER_DEPARTMENT_CATALOG.some(d => d.code === cellVal) && cellVal && (
            <option value={cellVal} className="bg-red-950 text-red-300">
              ⚠️ Unknown Code: {cellVal}
            </option>
          )}
        </select>
      );
    }

    // 4. Numeric input
    if (isNumber) {
      return (
        <input
          type="number"
          min={colLower.includes('salary') || colLower.includes('qty') ? '1' : '0'}
          value={cellVal}
          onChange={(e) => setEditedRowData({ ...editedRowData, [col]: e.target.value })}
          placeholder="Number >= 0"
          className="w-full min-w-[110px] bg-[#0b0c0e] border border-red-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-600 font-mono"
        />
      );
    }

    // 5. Email input
    if (isEmail) {
      return (
        <input
          type="email"
          value={cellVal}
          onChange={(e) => setEditedRowData({ ...editedRowData, [col]: e.target.value })}
          placeholder="user@example.com"
          className="w-full min-w-[165px] bg-[#0b0c0e] border border-red-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-600 font-mono"
        />
      );
    }

    // 6. Default text input
    return (
      <input
        type="text"
        value={cellVal}
        onChange={(e) => setEditedRowData({ ...editedRowData, [col]: e.target.value })}
        className="w-full min-w-[110px] bg-[#0b0c0e] border border-red-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-600 font-mono"
      />
    );
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
      <div className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-400" />
            <input
              type="text"
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#0b0c0e] border border-slate-200 dark:border-[#242630] rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/30"
            />
          </div>

          {/* Mode toggle */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-[#0b0c0e] p-1 border border-slate-200 dark:border-[#242630] text-xs">
            <button
              onClick={() => setFilterMode('ALL')}
              className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                filterMode === 'ALL'
                  ? 'bg-[#e31b23] text-white shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Records ({dataset.rowCount})
            </button>
            <button
              onClick={() => setFilterMode('ISSUES_ONLY')}
              className={`px-3 py-1 rounded-lg font-medium transition flex items-center space-x-1 cursor-pointer ${
                filterMode === 'ISSUES_ONLY'
                  ? 'bg-red-700 text-white shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-red-700 dark:hover:text-white'
              }`}
            >
              <span>Exceptions Only</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-red-100 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-800 font-bold">
                {rowsWithIssues.size}
              </span>
            </button>
            <button
              onClick={() => setFilterMode('CLEAN_ONLY')}
              className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                filterMode === 'CLEAN_ONLY'
                  ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-emerald-700 dark:hover:text-white'
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
            className="bg-white dark:bg-[#0b0c0e] border border-slate-200 dark:border-[#242630] rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-zinc-300 focus:outline-none focus:border-red-600 cursor-pointer shadow-2xs"
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
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-white border border-slate-200 dark:border-[#2e303d] hover:border-red-500/50 transition cursor-pointer shadow-2xs"
            title="Introduce new column with custom data type, check constraints, and multi-valued configuration"
          >
            <Plus className="w-3.5 h-3.5 text-red-600 dark:text-red-500" />
            <span>Add Column</span>
          </button>

          {/* Duplicate Column Resolver Button */}
          {duplicateColumnPairs.length > 0 && (
            <button
              onClick={() => setIsDuplicateModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-500/30 transition shadow-2xs cursor-pointer animate-pulse"
              title="Compare and resolve colliding duplicate columns"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Resolve Duplicates ({duplicateColumnPairs.length})</span>
            </button>
          )}

          {rowsWithIssues.size > 0 && (
            <button
              onClick={() => setIsAutoFixModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-600/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-600/30 transition shadow-2xs cursor-pointer"
              title="Inspect backend legitimacy rules, review replacement values, and auto-fix"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Review &amp; Auto-Fix</span>
            </button>
          )}

          {/* Value Disambiguator Button */}
          {onOpenDisambiguatorWithValue && (
            <button
              onClick={() => onOpenDisambiguatorWithValue('120')}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-[#121318] hover:bg-slate-50 dark:hover:bg-[#1a1b22] text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-[#2e303d] hover:border-red-500/50 transition shadow-2xs cursor-pointer"
              title="Analyze how shared values (like 120) are scoped to specific column domains"
            >
              <Sliders className="w-3.5 h-3.5 text-red-600 dark:text-red-500" />
              <span>Value Disambiguator</span>
            </button>
          )}

          {/* Prominent Download Corrected CSV Button */}
          <button
            onClick={handleDownloadCleanedCsv}
            className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow cursor-pointer ${
              rowsWithIssues.size === 0 || hasAppliedFixes
                ? 'bg-[#e31b23] hover:bg-[#c41219] text-white shadow-md shadow-red-950/30 border border-red-500/30'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700'
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
        <div className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-rose-500/30 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <span>Exceptions &amp; Plain-English Explanations</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-red-50 text-red-700 border border-red-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30 font-bold">
                    {issues.length} Issues Across {rowsWithIssues.size} Records
                  </span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Clear, jargon-free explanations of what went wrong with numbers and values in this dataset, and how to resolve them.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsAutoFixModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-600/20 dark:text-emerald-300 dark:border-emerald-500/30 transition cursor-pointer shadow-2xs"
                title="Open Auto-Fix Verification modal to inspect backend legitimacy logic"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Verify &amp; Auto-Fix Values</span>
              </button>
              <button
                onClick={() => setShowExceptionsPanel(!showExceptionsPanel)}
                className="text-xs text-slate-700 hover:text-slate-900 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white transition cursor-pointer shadow-2xs"
              >
                {showExceptionsPanel ? 'Collapse List' : 'Expand All Explanations'}
              </button>
            </div>
          </div>

          {showExceptionsPanel && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {paginatedExceptions.map((issue) => {
                  const fieldDef = getFieldDefinition(issue.columnName);
                  const rowIdx = issue.rowNumber - 1;

                  return (
                    <div
                      key={issue.issueId}
                      className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-[#0e0f13] border border-slate-200 dark:border-[#242630] hover:border-red-400 dark:hover:border-red-600/40 transition flex flex-col justify-between space-y-3 shadow-2xs"
                    >
                      <div>
                        {/* Header with Row, Severity, and Resolution Status */}
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-zinc-300">
                            Row #{issue.rowNumber} • <span className="text-[#e31b23] dark:text-red-400 font-bold">{issue.columnName}</span>
                          </span>
                          <div className="flex items-center space-x-1.5">
                            {issue.resolutionStatus && issue.resolutionStatus !== 'OPEN' && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                                {issue.resolutionStatus}
                              </span>
                            )}
                            <span className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold uppercase ${
                              issue.severity === 'CRITICAL'
                                ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30'
                                : 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
                            }`}>
                              {issue.severity}
                            </span>
                          </div>
                        </div>

                        {/* Cell Value Found */}
                        <div className="mt-2 text-xs font-mono flex items-center space-x-1.5 text-slate-600 dark:text-zinc-400">
                          <span>Observed Value:</span>
                          <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/20 dark:text-red-300 font-bold">
                            {issue.foundValue}
                          </span>
                        </div>

                        {/* What's Wrong */}
                        <div className="mt-2.5 p-2.5 rounded-lg bg-red-50/70 border border-red-200/80 text-slate-900 dark:bg-red-950/30 dark:border-red-500/30 dark:text-white text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400 block">
                            What is wrong:
                          </span>
                          <p className="text-slate-800 dark:text-white font-medium mt-0.5 text-xs">
                            {issue.simpleProblem || issue.errorMessage}
                          </p>
                        </div>

                        {/* How to Fix */}
                        <div className="mt-2 p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80 text-slate-900 dark:bg-emerald-950/30 dark:border-emerald-500/30 dark:text-emerald-200 text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                            How to fix:
                          </span>
                          <p className="text-emerald-900 dark:text-emerald-200 mt-0.5 text-xs font-medium">
                            {issue.simpleFix || 'Provide a valid entry'}
                          </p>
                        </div>

                        {/* Field Plain Meaning */}
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-2">
                          <span className="text-slate-700 dark:text-zinc-500 font-semibold">{fieldDef.displayName}:</span> {fieldDef.plainMeaning}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="pt-2.5 border-t border-slate-200 dark:border-[#242630] flex items-center justify-between text-xs">
                        <button
                          onClick={() => {
                            if (dataset.rawData[rowIdx]) {
                              startEditingRow(rowIdx, dataset.rawData[rowIdx]);
                            }
                          }}
                          className="inline-flex items-center space-x-1 text-xs text-[#e31b23] hover:text-[#c41219] font-semibold cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Row #{issue.rowNumber}</span>
                        </button>

                        <button
                          onClick={() => onSelectIssue(issue)}
                          className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 dark:bg-red-600/15 dark:hover:bg-red-600/25 dark:text-red-300 dark:border-red-600/30 transition cursor-pointer text-xs font-semibold"
                          title="Open remediation drawer to inspect record details and record audit log"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>Audit Details &rarr;</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Exception Cards Pagination Controls */}
              {totalExceptionPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between pt-3 border-t border-[#242630] text-xs gap-2">
                  <span className="text-zinc-400 font-mono text-[11px]">
                    Showing issues {((clampedExceptionPage - 1) * exceptionsPerPage) + 1}–{Math.min(clampedExceptionPage * exceptionsPerPage, issues.length)} of {issues.length} flagged exceptions
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setExceptionsPage(p => Math.max(1, p - 1))}
                      disabled={clampedExceptionPage === 1}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 text-xs cursor-pointer disabled:cursor-not-allowed transition"
                    >
                      &larr; Prev 12
                    </button>
                    <span className="text-zinc-400 font-mono text-xs px-2">
                      Page {clampedExceptionPage} of {totalExceptionPages}
                    </span>
                    <button
                      onClick={() => setExceptionsPage(p => Math.min(totalExceptionPages, p + 1))}
                      disabled={clampedExceptionPage === totalExceptionPages}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 text-xs cursor-pointer disabled:cursor-not-allowed transition"
                    >
                      Next 12 &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main Records Table */}
      <div className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-2xl overflow-hidden shadow-sm">
        {/* Table Header Bar & Top Pagination */}
        <div className="p-3 bg-slate-50 dark:bg-[#0e0f13] border-b border-slate-200 dark:border-[#242630] flex flex-col md:flex-row md:items-center justify-between text-xs text-slate-600 dark:text-zinc-400 gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900 dark:text-zinc-200">Dataset Records:</span>
            <span className="font-mono text-[#e31b23] dark:text-red-400 font-bold">
              Showing {startRecordIndex}–{endRecordIndex} of {filteredRows.length.toLocaleString()} rows
            </span>
            {filteredRows.length !== dataset.rowCount && (
              <span className="text-slate-500 font-mono text-[11px]">
                (Filtered from {dataset.rowCount.toLocaleString()} total)
              </span>
            )}
            <span className="text-slate-400 dark:text-slate-600">•</span>
            <span className="font-mono text-slate-500 dark:text-slate-400">{dataset.columns.length} columns registered</span>
          </div>

          {/* Top Pagination & Page Size Control */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-zinc-200 font-mono focus:outline-none focus:border-red-600 cursor-pointer shadow-2xs"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={500}>500</option>
              </select>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={clampedCurrentPage <= 1}
                className="p-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 disabled:opacity-40 disabled:text-slate-400 dark:disabled:text-zinc-600 disabled:bg-slate-100 dark:disabled:bg-zinc-900/40 cursor-pointer disabled:cursor-not-allowed transition shadow-2xs"
                title="First Page"
              >
                <ChevronsLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={clampedCurrentPage <= 1}
                className="p-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 disabled:opacity-40 disabled:text-slate-400 dark:disabled:text-zinc-600 disabled:bg-slate-100 dark:disabled:bg-zinc-900/40 cursor-pointer disabled:cursor-not-allowed transition shadow-2xs"
                title="Previous Page"
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
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={clampedCurrentPage >= totalPages}
                className="p-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 disabled:opacity-40 disabled:text-slate-400 dark:disabled:text-zinc-600 disabled:bg-slate-100 dark:disabled:bg-zinc-900/40 cursor-pointer disabled:cursor-not-allowed transition shadow-2xs"
                title="Last Page"
              >
                <ChevronsRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[620px] relative">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-[#0b0f17] text-slate-700 dark:text-slate-300 font-mono text-[11px] sticky top-0 z-20 shadow-sm border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3 w-14 text-center border-r border-slate-200 dark:border-slate-800/60 font-semibold text-slate-500">
                  #
                </th>
                <th className="py-2.5 px-3 w-24 text-center border-r border-slate-200 dark:border-slate-800/60 font-semibold">
                  Status
                </th>
                {dataset.columns.map((col) => {
                  const colIssuesCount = issuesCountByCol.get(col) || 0;
                  const domain = inferColumnSemanticDomain(col);

                  return (
                    <th key={col} className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800/60 font-semibold min-w-[145px] group">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col min-w-0 pr-1">
                          <span className="truncate">{col}</span>
                          <span className="text-[9px] text-slate-500 font-sans font-normal truncate" title={domain.domainLabel}>
                            {domain.domainLabel.split(' ')[0]}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 shrink-0">
                          {colIssuesCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-red-50 text-red-700 border border-red-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30 font-bold">
                              {colIssuesCount}
                            </span>
                          )}
                          <button
                            onClick={() => handleDeleteColumn(col)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-600 transition cursor-pointer"
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
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={dataset.columns.length + 3} className="py-12 text-center text-slate-500">
                    No records match current filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedRows.map(({ row, rowNumber, originalIndex }) => {
                  const isEditing = editingRowIndex === originalIndex;
                  const rowIssues = issuesByRowNumber.get(rowNumber) || [];
                  const hasIssues = rowIssues.length > 0;

                  return (
                    <tr
                      key={originalIndex}
                      className={`hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition ${
                        hasIssues ? 'bg-red-50/40 dark:bg-red-950/15' : ''
                      } ${isEditing ? 'bg-red-50 dark:bg-red-950/30 ring-1 ring-red-600' : ''}`}
                    >
                      {/* Row index */}
                      <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-500 dark:text-zinc-500 border-r border-slate-100 dark:border-[#242630]">
                        {rowNumber}
                      </td>

                      {/* Row Status Badge */}
                      <td className="py-2.5 px-3 text-center border-r border-slate-100 dark:border-[#242630]">
                        {hasIssues ? (
                          <button
                            onClick={() => onSelectIssue(rowIssues[0])}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/40 dark:hover:bg-red-500/30 cursor-pointer"
                          >
                            <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" />
                            <span>{rowIssues.length} issue{rowIssues.length > 1 ? 's' : ''}</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25">
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
                            className={`py-2 px-3 border-r border-slate-100 dark:border-[#242630] relative group ${
                              isCellInvalid
                                ? 'bg-red-50/80 text-red-950 font-medium dark:bg-red-950/30 dark:text-red-200'
                                : ''
                            }`}
                            onMouseEnter={() => setHoveredCell({ rowIndex: originalIndex, colName: col })}
                            onMouseLeave={() => setHoveredCell(null)}
                          >
                            {isEditing ? (
                              renderCellEditor(col, cellVal)
                            ) : (
                              <div className="flex items-center justify-between">
                                <span className="truncate">
                                  {cellVal === '' ? (
                                    <span className="text-zinc-600 italic font-mono">&lt;EMPTY&gt;</span>
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
                                      className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-500 hover:text-red-400 cursor-pointer transition"
                                      title={`Test value '${cellVal}' across all column domains`}
                                    >
                                      <Sliders className="w-3 h-3" />
                                    </button>
                                  )}
                                  {isCellInvalid && (
                                    <button
                                      onClick={() => onSelectIssue(cellIssues[0])}
                                      title={cellIssues.map(i => i.errorMessage).join('\n')}
                                      className="p-0.5 text-red-400 hover:text-red-200 cursor-pointer shrink-0"
                                    >
                                      <AlertTriangle className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Floating tooltip on hover if invalid */}
                            {isCellInvalid && hoveredCell?.rowIndex === originalIndex && hoveredCell?.colName === col && !isEditing && (
                              <div className="absolute left-2 -top-24 z-30 bg-[#121318] text-zinc-100 p-3 rounded-xl border border-red-500/50 shadow-2xl text-[11px] pointer-events-none min-w-[260px] max-w-sm">
                                <div className="font-bold text-red-400 flex items-center space-x-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                  <span>{cellIssues[0].simpleProblem || cellIssues[0].errorMessage}</span>
                                </div>
                                <div className="text-emerald-300 font-medium mt-1 flex items-start space-x-1">
                                  <span className="text-emerald-400 font-bold shrink-0">Fix:</span>
                                  <span>{cellIssues[0].simpleFix || 'Correct cell value'}</span>
                                </div>
                                <div className="text-zinc-400 text-[10px] mt-1 pt-1 border-t border-[#242630]">
                                  <span className="text-zinc-500 font-medium">Field meaning:</span> {getFieldDefinition(col).plainMeaning}
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
                              className="p-1 rounded bg-[#e31b23] text-white hover:bg-[#c41219] cursor-pointer"
                              title="Save Changes"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="p-1 rounded bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditingRow(originalIndex, row)}
                            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
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

        {/* Bottom Comprehensive Pagination Toolbar */}
        <div className="p-3 bg-[#0e0f13] border-t border-[#242630] flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-400 gap-3">
          <div className="flex items-center space-x-2 font-mono text-[11px]">
            <span>
              Showing {startRecordIndex} to {endRecordIndex} of {filteredRows.length.toLocaleString()} rows
            </span>
            <span className="text-slate-600">•</span>
            <span>Page {clampedCurrentPage} of {totalPages}</span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Quick jump to page */}
            <div className="flex items-center space-x-1.5 mr-2 text-[11px]">
              <span className="text-slate-600 dark:text-zinc-400 font-medium">Go to page:</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={clampedCurrentPage}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val >= 1 && val <= totalPages) {
                    setCurrentPage(val);
                  }
                }}
                className="w-14 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg px-2 py-1 text-center text-slate-800 dark:text-zinc-200 font-mono text-xs focus:outline-none focus:border-red-600 shadow-2xs"
              />
            </div>

            <button
              onClick={() => setCurrentPage(1)}
              disabled={clampedCurrentPage <= 1}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 disabled:opacity-40 disabled:text-slate-400 dark:disabled:text-zinc-600 disabled:bg-slate-100 dark:disabled:bg-zinc-900/40 cursor-pointer disabled:cursor-not-allowed transition shadow-2xs"
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4 stroke-[2.5]" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={clampedCurrentPage <= 1}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 disabled:opacity-40 disabled:text-slate-400 dark:disabled:text-zinc-600 disabled:bg-slate-100 dark:disabled:bg-zinc-900/40 cursor-pointer disabled:cursor-not-allowed transition shadow-2xs"
              title="Previous Page"
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
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={clampedCurrentPage >= totalPages}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 disabled:opacity-40 disabled:text-slate-400 dark:disabled:text-zinc-600 disabled:bg-slate-100 dark:disabled:bg-zinc-900/40 cursor-pointer disabled:cursor-not-allowed transition shadow-2xs"
              title="Last Page"
            >
              <ChevronsRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
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

      {/* Modern Dynamic Add Column Modal */}
      <AddColumnModal
        isOpen={isAddColModalOpen}
        onClose={() => setIsAddColModalOpen(false)}
        existingColumns={dataset.columns}
        onAddColumn={handleAddNewColumn}
      />

      {/* Duplicate / Colliding Column Resolver Modal */}
      <DuplicateColumnResolverModal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        dataset={dataset}
        initialColA={duplicateColumnPairs[0]?.cols[0]}
        initialColB={duplicateColumnPairs[0]?.cols[1]}
        onResolve={(updatedRecords, updatedCols) => {
          setHasAppliedFixes(true);
          onUpdateDatasetRecords(updatedRecords, updatedCols);
        }}
      />
    </div>
  );
};

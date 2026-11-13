import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Dataset, ValidationIssue, ValidationRule, ValidationRun, ResolutionHistory } from '../types';

export interface ParseResult {
  data: Record<string, string>[];
  columns: string[];
  rowCount: number;
  error?: string;
}

export interface SpreadsheetParseResult extends ParseResult {
  sheetNames: string[];
  activeSheet: string;
  rawCsv: string;
  fileFormat: 'csv' | 'xlsx';
}

/**
 * Parses raw CSV string using PapaParse.
 */
export function parseCsvString(csvContent: string): ParseResult {
  const result = Papa.parse<Record<string, string>>(csvContent.trim(), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
  });

  if (result.errors && result.errors.length > 0 && result.data.length === 0) {
    return {
      data: [],
      columns: [],
      rowCount: 0,
      error: result.errors[0]?.message || 'Failed to parse CSV file.',
    };
  }

  const columns = result.meta.fields || (result.data.length > 0 ? Object.keys(result.data[0]) : []);
  const cleanData = result.data.map(row => {
    const cleanedRow: Record<string, string> = {};
    columns.forEach(col => {
      cleanedRow[col] = row[col] !== undefined && row[col] !== null ? String(row[col]).trim() : '';
    });
    return cleanedRow;
  });

  return {
    data: cleanData,
    columns,
    rowCount: cleanData.length
  };
}

/**
 * Parses an Excel ArrayBuffer (XLSX, XLS).
 */
export function parseExcelBuffer(
  buffer: ArrayBuffer, 
  preferredSheet?: string | number
): ParseResult & { sheetNames: string[]; activeSheet: string; rawCsv: string } {
  try {
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheetNames = workbook.SheetNames || [];

    if (sheetNames.length === 0) {
      return {
        data: [],
        columns: [],
        rowCount: 0,
        sheetNames: [],
        activeSheet: '',
        rawCsv: '',
        error: 'The uploaded Excel file contains no worksheets.'
      };
    }

    let activeSheet = sheetNames[0];
    if (typeof preferredSheet === 'string' && sheetNames.includes(preferredSheet)) {
      activeSheet = preferredSheet;
    } else if (typeof preferredSheet === 'number' && preferredSheet >= 0 && preferredSheet < sheetNames.length) {
      activeSheet = sheetNames[preferredSheet];
    }

    const worksheet = workbook.Sheets[activeSheet];
    if (!worksheet) {
      return {
        data: [],
        columns: [],
        rowCount: 0,
        sheetNames,
        activeSheet,
        rawCsv: '',
        error: `Could not load worksheet '${activeSheet}'.`
      };
    }

    // Convert to JSON with empty string defaults
    const rawJsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
      defval: '',
      raw: false
    });

    // Also convert worksheet to standard CSV representation for storage / preview
    const rawCsv = XLSX.utils.sheet_to_csv(worksheet);

    if (rawJsonRows.length === 0) {
      return {
        data: [],
        columns: [],
        rowCount: 0,
        sheetNames,
        activeSheet,
        rawCsv,
        error: 'The selected worksheet has no data rows.'
      };
    }

    // Collect distinct column headers preserving original sheet header ordering
    const columnSet = new Set<string>();
    // Extract headers from first 10 rows to catch sparse columns
    rawJsonRows.slice(0, 20).forEach(row => {
      Object.keys(row).forEach(col => {
        if (col && !col.startsWith('__EMPTY')) {
          columnSet.add(col.trim());
        }
      });
    });
    const columns = Array.from(columnSet);

    // Format all row values cleanly as strings
    const cleanData = rawJsonRows.map(row => {
      const record: Record<string, string> = {};
      columns.forEach(col => {
        const val = row[col];
        record[col] = val !== undefined && val !== null ? String(val).trim() : '';
      });
      return record;
    });

    return {
      data: cleanData,
      columns,
      rowCount: cleanData.length,
      sheetNames,
      activeSheet,
      rawCsv
    };
  } catch (err: any) {
    return {
      data: [],
      columns: [],
      rowCount: 0,
      sheetNames: [],
      activeSheet: '',
      rawCsv: '',
      error: `Failed to parse Excel workbook: ${err?.message || 'Invalid format'}`
    };
  }
}

/**
 * Universal file parser supporting both .csv and .xlsx/.xls
 */
export async function parseSpreadsheetFile(
  file: File, 
  preferredSheet?: string
): Promise<SpreadsheetParseResult> {
  const fileName = file.name.toLowerCase();
  const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

  if (isExcel) {
    const buffer = await file.arrayBuffer();
    const excelRes = parseExcelBuffer(buffer, preferredSheet);
    return {
      ...excelRes,
      fileFormat: 'xlsx'
    };
  }

  // Otherwise handle as CSV
  const text = await file.text();
  const csvRes = parseCsvString(text);
  return {
    ...csvRes,
    sheetNames: ['Sheet1'],
    activeSheet: 'Sheet1',
    rawCsv: text,
    fileFormat: 'csv'
  };
}

/**
 * Creates Dataset model from parsed data
 */
export function createDatasetFromSpreadsheet(params: {
  fileName: string;
  rawData: Record<string, string>[];
  columns: string[];
  originalCsv: string;
  fileType?: string;
  uploadedBy?: string;
  uploadedById?: string;
  uploadedByEmail?: string;
  isPreset?: boolean;
  sourceSystem?: string;
  reportedSuccess?: boolean;
}): Dataset {
  const isExcel = params.fileName.toLowerCase().endsWith('.xlsx') || params.fileName.toLowerCase().endsWith('.xls');
  return {
    datasetId: `ds-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    fileName: params.fileName,
    uploadedBy: params.uploadedBy || 'Data Steward (SilentGuard Ingest)',
    uploadedById: params.uploadedById,
    uploadedByEmail: params.uploadedByEmail,
    isPreset: params.isPreset ?? false,
    uploadTime: new Date().toISOString(),
    fileType: isExcel 
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      : 'text/csv',
    rowCount: params.rawData.length,
    columns: params.columns,
    status: 'uploaded',
    rawData: params.rawData,
    originalCsv: params.originalCsv,
    sourceSystem: params.sourceSystem || 'Enterprise ERP / Shopfloor Gateway',
    reportedSuccess: params.reportedSuccess !== undefined ? params.reportedSuccess : true
  };
}

/**
 * Backward compatible createDatasetFromCsv
 */
export function createDatasetFromCsv(
  fileName: string,
  csvContent: string,
  uploadedBy: string = 'Engineer (SilentGuard UI)',
  sourceSystem: string = 'ERP / File Upload',
  reportedSuccess: boolean = true,
  isPreset: boolean = false
): Dataset {
  const parsed = parseCsvString(csvContent);
  return createDatasetFromSpreadsheet({
    fileName,
    rawData: parsed.data,
    columns: parsed.columns,
    originalCsv: csvContent,
    uploadedBy,
    isPreset,
    sourceSystem,
    reportedSuccess
  });
}

/**
 * Export dataset to CSV string
 */
export function exportDatasetToCsv(dataset: Dataset): string {
  return Papa.unparse(dataset.rawData, {
    quotes: true,
    header: true
  });
}

/**
 * Export issues to CSV string
 */
export function exportIssuesToCsv(issues: ValidationIssue[]): string {
  const exportRows = issues.map(issue => ({
    'Issue ID': issue.issueId,
    'Row #': issue.rowNumber,
    'Column': issue.columnName,
    'Severity': issue.severity,
    'Rule Name': issue.ruleName,
    'Rule Type': issue.ruleType,
    'Observed Value': issue.foundValue,
    'Expected Condition': issue.expectedCondition,
    'Error Message': issue.errorMessage,
    'Resolution Status': issue.resolutionStatus,
  }));

  return Papa.unparse(exportRows, {
    header: true
  });
}

/**
 * Direct file download trigger for text content
 */
export function downloadTextFile(content: string, filename: string, mimeType: string = 'text/csv') {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Direct file download trigger for binary content (e.g. XLSX)
 */
export function downloadBinaryFile(data: ArrayBuffer | Uint8Array | Blob, filename: string, mimeType: string) {
  const blob = data instanceof Blob ? data : new Blob([data as any], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports verified dataset records directly to an Excel (.xlsx) file.
 */
export function exportDatasetToExcel(dataset: Dataset, filename?: string): void {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(dataset.rawData);

  // Auto-fit column widths based on maximum length
  const colWidths = dataset.columns.map(col => {
    let maxLen = col.length;
    dataset.rawData.slice(0, 50).forEach(row => {
      const val = row[col] || '';
      if (val.length > maxLen) maxLen = Math.min(val.length, 45);
    });
    return { wch: Math.max(maxLen + 3, 12) };
  });
  worksheet['!cols'] = colWidths;

  const sheetName = 'Clean_Master_Data';
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const outFileName = filename || `cleaned_${dataset.fileName.replace(/\.[^/.]+$/, '')}.xlsx`;
  XLSX.writeFile(workbook, outFileName);
}

/**
 * Exports flagged validation issues to an Excel (.xlsx) file.
 */
export function exportIssuesToExcel(issues: ValidationIssue[], filename?: string): void {
  const exportRows = issues.map(issue => ({
    'Issue ID': issue.issueId,
    'Row #': issue.rowNumber,
    'Column': issue.columnName,
    'Severity': issue.severity,
    'Rule Name': issue.ruleName,
    'Rule Type': issue.ruleType,
    'Observed Value': issue.foundValue,
    'Expected Condition': issue.expectedCondition,
    'Error Message': issue.errorMessage,
    'Resolution Status': issue.resolutionStatus,
    'Category': issue.category
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(exportRows);

  worksheet['!cols'] = [
    { wch: 14 }, // Issue ID
    { wch: 8 },  // Row #
    { wch: 18 }, // Column
    { wch: 12 }, // Severity
    { wch: 26 }, // Rule Name
    { wch: 18 }, // Rule Type
    { wch: 20 }, // Observed Value
    { wch: 25 }, // Expected Condition
    { wch: 45 }, // Error Message
    { wch: 18 }, // Resolution Status
    { wch: 20 }  // Category
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Quality_Defects');

  const outFileName = filename || `exceptions_log_${Date.now()}.xlsx`;
  XLSX.writeFile(workbook, outFileName);
}

/**
 * Enterprise 5-Sheet Comprehensive Audit Workbook (.xlsx).
 */
export function exportComprehensiveAuditExcel(params: {
  dataset: Dataset;
  latestRun: ValidationRun | null;
  issues: ValidationIssue[];
  rules: ValidationRule[];
  resolutionHistories: ResolutionHistory[];
  certifierName?: string;
}): void {
  const { dataset, latestRun, issues, rules, resolutionHistories, certifierName } = params;
  const workbook = XLSX.utils.book_new();

  // 1. Executive Summary Sheet
  const summaryData = [
    { 'Audit Property': 'Report Document', 'Value': 'Motherson SilentGuard Official Quality Audit' },
    { 'Audit Property': 'Generated At', 'Value': new Date().toLocaleString() },
    { 'Audit Property': 'Auditing Officer', 'Value': certifierName || 'Motherson Certified Data Steward' },
    { 'Audit Property': 'Dataset Name', 'Value': dataset.fileName },
    { 'Audit Property': 'Source Ingestion System', 'Value': dataset.sourceSystem || 'Shopfloor MES / ERP' },
    { 'Audit Property': 'ETL Silent Failure Check', 'Value': dataset.reportedSuccess ? 'ETL Reported Success (Silent Issues Detected)' : 'Standard Verification' },
    { 'Audit Property': 'Total Records Analyzed', 'Value': dataset.rowCount },
    { 'Audit Property': 'Overall Health Score', 'Value': `${latestRun?.healthScore ?? 100}%` },
    { 'Audit Property': 'Run Status', 'Value': latestRun?.runStatus ?? 'PASSED' },
    { 'Audit Property': 'Total Issues Flagged', 'Value': issues.length },
    { 'Audit Property': 'Critical Severity Issues', 'Value': issues.filter(i => i.severity === 'CRITICAL').length },
    { 'Audit Property': 'Error Severity Issues', 'Value': issues.filter(i => i.severity === 'ERROR').length },
    { 'Audit Property': 'Warning Severity Issues', 'Value': issues.filter(i => i.severity === 'WARNING').length },
    { 'Audit Property': 'Resolved / Waived Defect Count', 'Value': issues.filter(i => i.resolutionStatus === 'FIXED_IN_SOURCE' || i.resolutionStatus === 'WAIVED').length },
    { 'Audit Property': 'Execution Latency', 'Value': `${latestRun?.executionTimeMs ?? 0} ms` }
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 30 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive_Summary');

  // 2. Validation Rules Sheet
  const rulesData = rules.map(r => ({
    'Rule ID': r.ruleId,
    'Rule Name': r.ruleName,
    'Target Column': r.columnName,
    'Rule Type': r.ruleType,
    'Severity': r.severity,
    'Status': r.enabled ? 'ACTIVE' : 'DISABLED',
    'Category': r.category,
    'Rule Parameter': r.parameter || '',
    'Description': r.description
  }));
  const rulesSheet = XLSX.utils.json_to_sheet(rulesData);
  rulesSheet['!cols'] = [
    { wch: 14 },
    { wch: 28 },
    { wch: 20 },
    { wch: 18 },
    { wch: 12 },
    { wch: 10 },
    { wch: 22 },
    { wch: 20 },
    { wch: 45 }
  ];
  XLSX.utils.book_append_sheet(workbook, rulesSheet, 'Validation_Rules');

  // 3. Flagged Exceptions Sheet
  const issuesData = issues.map(i => ({
    'Issue ID': i.issueId,
    'Row #': i.rowNumber,
    'Target Column': i.columnName,
    'Severity': i.severity,
    'Rule Name': i.ruleName,
    'Observed Value': i.foundValue || '[EMPTY / NULL]',
    'Expected Condition': i.expectedCondition,
    'Error Details': i.errorMessage,
    'Resolution Status': i.resolutionStatus
  }));
  const issuesSheet = XLSX.utils.json_to_sheet(issuesData.length > 0 ? issuesData : [{ 'Status': 'No issues detected - 100% compliant dataset' }]);
  issuesSheet['!cols'] = [
    { wch: 14 },
    { wch: 8 },
    { wch: 20 },
    { wch: 12 },
    { wch: 26 },
    { wch: 22 },
    { wch: 26 },
    { wch: 45 },
    { wch: 18 }
  ];
  XLSX.utils.book_append_sheet(workbook, issuesSheet, 'Flagged_Defects');

  // 4. Audit Resolutions Sheet
  const auditData = resolutionHistories.map(h => ({
    'Resolution ID': h.resolutionId,
    'Issue ID': h.issueId,
    'Status': h.resolutionStatus,
    'Action Taken By': h.resolvedBy,
    'Timestamp': new Date(h.updatedAt).toLocaleString(),
    'Steward Comment / Justification': h.resolutionComment
  }));
  const auditSheet = XLSX.utils.json_to_sheet(auditData.length > 0 ? auditData : [{ 'Status': 'No resolution history logs recorded.' }]);
  auditSheet['!cols'] = [
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 22 },
    { wch: 24 },
    { wch: 50 }
  ];
  XLSX.utils.book_append_sheet(workbook, auditSheet, 'Audit_Trail');

  // 5. Clean Dataset Sheet
  const cleanSheet = XLSX.utils.json_to_sheet(dataset.rawData);
  XLSX.utils.book_append_sheet(workbook, cleanSheet, 'Master_Data');

  const baseName = dataset.fileName.replace(/\.[^/.]+$/, '');
  XLSX.writeFile(workbook, `motherson_silentguard_audit_master_${baseName}.xlsx`);
}

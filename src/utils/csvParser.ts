import Papa from 'papaparse';
import { Dataset } from '../types';

export interface ParseResult {
  data: Record<string, string>[];
  columns: string[];
  rowCount: number;
  error?: string;
}

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
      cleanedRow[col] = row[col] !== undefined ? String(row[col]) : '';
    });
    return cleanedRow;
  });

  return {
    data: cleanData,
    columns,
    rowCount: cleanData.length
  };
}

export function createDatasetFromCsv(
  fileName: string,
  csvContent: string,
  uploadedBy: string = 'Engineer (SilentGuard UI)',
  sourceSystem: string = 'ERP / File Upload',
  reportedSuccess: boolean = true
): Dataset {
  const parsed = parseCsvString(csvContent);
  return {
    datasetId: `ds-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    fileName,
    uploadedBy,
    uploadTime: new Date().toISOString(),
    fileType: 'text/csv',
    rowCount: parsed.rowCount,
    columns: parsed.columns,
    status: 'uploaded',
    rawData: parsed.data,
    originalCsv: csvContent,
    sourceSystem,
    reportedSuccess
  };
}

export function exportDatasetToCsv(dataset: Dataset): string {
  return Papa.unparse(dataset.rawData, {
    quotes: true,
    header: true
  });
}

export function exportIssuesToCsv(issues: import('../types').ValidationIssue[]): string {
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

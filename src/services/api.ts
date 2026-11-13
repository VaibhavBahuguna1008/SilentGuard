import { 
  Dataset, 
  ValidationRule, 
  ValidationRun, 
  ValidationIssue, 
  ResolutionHistory, 
  ResolutionStatus,
  RuleType,
  Severity
} from '../types';

const API_BASE_URL = 'http://localhost:8080/api';

export interface BackendHealth {
  status: string;
  database: string;
  version: string;
  platform: string;
}

export interface BackendDatasetEntity {
  datasetId: string;
  fileName: string;
  tableName?: string;
  pipelineType?: string;
  sourceSystem?: string;
  reportedSuccess?: boolean;
  rowCount: number;
  columnCount: number;
  columnsJson: string;
  rawDataJson: string;
  originalCsv?: string;
  createdAt?: string;
}

export interface BackendRuleEntity {
  ruleId: string;
  ruleName: string;
  columnName: string;
  ruleType: string;
  parameter?: string;
  severity: string;
  enabled: boolean;
  category?: string;
  description?: string;
  secondColumn?: string;
  operator?: string;
}

export interface BackendRunEntity {
  runId: string;
  datasetId: string;
  runNumber: number;
  runStatus: 'PASSED' | 'FAILED' | 'WARNING';
  totalRecords: number;
  passedRecords: number;
  failedRecords: number;
  healthScore: number;
  criticalIssuesCount: number;
  errorIssuesCount: number;
  warningIssuesCount: number;
  totalIssuesCount: number;
  executionTimeMs: number;
  ruleCountExecuted: number;
  executedAt?: string;
}

export interface BackendIssueEntity {
  issueId: string;
  runId: string;
  datasetId: string;
  rowNumber: number;
  columnName: string;
  ruleId: string;
  ruleName: string;
  ruleType: string;
  severity: string;
  foundValue: string;
  expectedCondition: string;
  errorMessage: string;
  resolutionStatus: string;
  category: string;
  rowDataJson: string;
}

// Map backend dataset entity to frontend Dataset
export function mapBackendDataset(entity: BackendDatasetEntity): Dataset {
  let columns: string[] = [];
  try {
    if (entity.columnsJson) {
      if (entity.columnsJson.startsWith('[')) {
        columns = JSON.parse(entity.columnsJson);
      } else {
        columns = entity.columnsJson.split(',').map(s => s.trim());
      }
    }
  } catch {
    columns = [];
  }

  let rawData: Record<string, string>[] = [];
  try {
    if (entity.rawDataJson) {
      rawData = JSON.parse(entity.rawDataJson);
    }
  } catch {
    rawData = [];
  }

  return {
    datasetId: entity.datasetId,
    fileName: entity.fileName,
    uploadedBy: entity.sourceSystem || 'Data Steward',
    uploadTime: entity.createdAt ? new Date(entity.createdAt).toLocaleString() : new Date().toLocaleString(),
    fileType: 'CSV Dataset',
    rowCount: entity.rowCount || rawData.length,
    columns,
    status: 'validated',
    rawData,
    originalCsv: entity.originalCsv || '',
    sourceSystem: entity.sourceSystem || 'Enterprise Pipeline',
    reportedSuccess: entity.reportedSuccess !== undefined ? entity.reportedSuccess : true
  };
}

// Map backend rule entity to frontend ValidationRule
export function mapBackendRule(entity: BackendRuleEntity): ValidationRule {
  return {
    ruleId: entity.ruleId,
    ruleName: entity.ruleName,
    columnName: entity.columnName,
    ruleType: entity.ruleType as RuleType,
    parameter: entity.parameter,
    severity: entity.severity as Severity,
    enabled: entity.enabled,
    description: entity.description || '',
    category: (entity.category || 'Missing Data') as any,
    crossFieldConfig: entity.secondColumn ? {
      secondColumn: entity.secondColumn,
      operator: (entity.operator || 'GREATER_EQUAL') as any
    } : undefined,
    referenceList: entity.ruleType === 'REFERENTIAL_INTEGRITY' && entity.parameter
      ? entity.parameter.split(',').map(s => s.trim())
      : undefined
  };
}

// Map backend run to frontend ValidationRun
export function mapBackendRun(entity: BackendRunEntity, datasetName = 'Active Dataset'): ValidationRun {
  return {
    runId: entity.runId,
    runNumber: entity.runNumber,
    datasetId: entity.datasetId,
    datasetName,
    startedAt: entity.executedAt ? new Date(entity.executedAt).toISOString() : new Date().toISOString(),
    completedAt: entity.executedAt ? new Date(entity.executedAt).toISOString() : new Date().toISOString(),
    totalRecords: entity.totalRecords,
    passedRecords: entity.passedRecords,
    failedRecords: entity.failedRecords,
    healthScore: entity.healthScore,
    runStatus: entity.runStatus,
    criticalIssuesCount: entity.criticalIssuesCount,
    errorIssuesCount: entity.errorIssuesCount,
    warningIssuesCount: entity.warningIssuesCount,
    totalIssuesCount: entity.totalIssuesCount,
    executionTimeMs: entity.executionTimeMs,
    ruleCountExecuted: entity.ruleCountExecuted
  };
}

// Map backend issue to frontend ValidationIssue
export function mapBackendIssue(entity: BackendIssueEntity): ValidationIssue {
  let rowData: Record<string, string> = {};
  try {
    if (entity.rowDataJson) {
      rowData = JSON.parse(entity.rowDataJson);
    }
  } catch {
    rowData = {};
  }

  return {
    issueId: entity.issueId,
    runId: entity.runId,
    datasetId: entity.datasetId,
    rowNumber: entity.rowNumber,
    columnName: entity.columnName,
    ruleId: entity.ruleId,
    ruleName: entity.ruleName,
    ruleType: entity.ruleType as RuleType,
    severity: entity.severity as Severity,
    foundValue: entity.foundValue,
    expectedCondition: entity.expectedCondition,
    errorMessage: entity.errorMessage,
    simpleProblem: entity.errorMessage,
    simpleFix: `Fix the invalid value in column '${entity.columnName}'`,
    resolutionStatus: (entity.resolutionStatus || 'OPEN') as ResolutionStatus,
    rowData,
    category: entity.category
  };
}

// API Methods
export const api = {
  async checkHealth(): Promise<BackendHealth | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async fetchDatasets(): Promise<Dataset[]> {
    const res = await fetch(`${API_BASE_URL}/datasets`);
    if (!res.ok) throw new Error('Failed to fetch datasets from backend');
    const data: BackendDatasetEntity[] = await res.json();
    return data.map(mapBackendDataset);
  },

  async uploadCsvFile(file: File, pipelineType = 'BATCH', sourceSystem = 'CSV_UPLOAD'): Promise<Dataset> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('pipelineType', pipelineType);
    formData.append('sourceSystem', sourceSystem);

    const res = await fetch(`${API_BASE_URL}/datasets/upload`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.message || err.error || 'Failed to upload CSV file');
    }

    const savedEntity: BackendDatasetEntity = await res.json();
    return mapBackendDataset(savedEntity);
  },

  async updateDatasetRecords(datasetId: string, records: Record<string, string>[], columns?: string[]): Promise<void> {
    const payload: Record<string, any> = {
      rawDataJson: JSON.stringify(records),
      rowCount: records.length
    };
    if (columns) {
      payload.columnsJson = JSON.stringify(columns);
    }
    await fetch(`${API_BASE_URL}/datasets/${datasetId}/records`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },

  async deleteDataset(datasetId: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/datasets/${datasetId}`, {
        method: 'DELETE'
      });
    } catch {
      // Backend may be offline; silently fallback
    }
  },

  async fetchRules(): Promise<ValidationRule[]> {
    const res = await fetch(`${API_BASE_URL}/rules`);
    if (!res.ok) throw new Error('Failed to fetch validation rules from backend');
    const data: BackendRuleEntity[] = await res.json();
    return data.map(mapBackendRule);
  },

  async toggleRule(ruleId: string): Promise<ValidationRule> {
    const res = await fetch(`${API_BASE_URL}/rules/${ruleId}/toggle`, {
      method: 'PUT'
    });
    if (!res.ok) throw new Error('Failed to toggle rule');
    const updated: BackendRuleEntity = await res.json();
    return mapBackendRule(updated);
  },

  async saveRule(rule: ValidationRule): Promise<ValidationRule> {
    const payload: BackendRuleEntity = {
      ruleId: rule.ruleId,
      ruleName: rule.ruleName,
      columnName: rule.columnName,
      ruleType: rule.ruleType,
      parameter: rule.parameter || (rule.referenceList ? rule.referenceList.join(',') : undefined),
      severity: rule.severity,
      enabled: rule.enabled,
      category: rule.category,
      description: rule.description,
      secondColumn: rule.crossFieldConfig?.secondColumn,
      operator: rule.crossFieldConfig?.operator
    };

    const res = await fetch(`${API_BASE_URL}/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to save rule');
    const saved: BackendRuleEntity = await res.json();
    return mapBackendRule(saved);
  },

  async deleteRule(ruleId: string): Promise<void> {
    await fetch(`${API_BASE_URL}/rules/${ruleId}`, {
      method: 'DELETE'
    });
  },

  async executeValidation(
    datasetId: string, 
    ruleIds?: string[], 
    datasetName = 'Active Dataset'
  ): Promise<{ run: ValidationRun; issues: ValidationIssue[] }> {
    const res = await fetch(`${API_BASE_URL}/validation/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ datasetId, ruleIds })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Validation execution failed' }));
      throw new Error(err.message || err.error || 'Failed to execute validation on backend');
    }

    const data = await res.json();
    const run = mapBackendRun(data.run, datasetName);
    const issues = (data.issues || []).map(mapBackendIssue);

    return { run, issues };
  },

  async fetchRuns(datasetId?: string, datasetsMap?: Map<string, string>): Promise<ValidationRun[]> {
    const url = datasetId 
      ? `${API_BASE_URL}/validation/runs?datasetId=${encodeURIComponent(datasetId)}`
      : `${API_BASE_URL}/validation/runs`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data: BackendRunEntity[] = await res.json();
    return data.map(r => {
      const name = datasetsMap?.get(r.datasetId) || 'Dataset ' + r.datasetId.substring(0, 8);
      return mapBackendRun(r, name);
    });
  },

  async fetchRunIssues(runId: string): Promise<ValidationIssue[]> {
    const res = await fetch(`${API_BASE_URL}/validation/runs/${runId}/issues`);
    if (!res.ok) return [];
    const data: BackendIssueEntity[] = await res.json();
    return data.map(mapBackendIssue);
  },

  async fetchAuditHistory(): Promise<ResolutionHistory[]> {
    const res = await fetch(`${API_BASE_URL}/audit/history`);
    if (!res.ok) return [];
    return await res.json();
  },

  async recordResolution(history: ResolutionHistory): Promise<ResolutionHistory> {
    const res = await fetch(`${API_BASE_URL}/audit/resolutions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(history)
    });
    if (!res.ok) throw new Error('Failed to record resolution');
    return await res.json();
  },

  async updateResolution(history: ResolutionHistory): Promise<ResolutionHistory> {
    const res = await fetch(`${API_BASE_URL}/audit/resolutions/${history.resolutionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(history)
    });
    if (!res.ok) throw new Error('Failed to update resolution');
    return await res.json();
  },

  async deleteResolution(resolutionId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/audit/resolutions/${resolutionId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete resolution');
  },

  async deleteRun(runId: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/validation/runs/${runId}`, {
        method: 'DELETE'
      });
    } catch {
      // Backend may be offline; silently fallback
    }
  }
};

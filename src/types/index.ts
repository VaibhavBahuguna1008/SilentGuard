export type RuleType = 
  | 'REQUIRED' 
  | 'UNIQUE' 
  | 'MIN_VALUE' 
  | 'MAX_VALUE' 
  | 'FORMAT' 
  | 'ALLOWED_VALUES' 
  | 'CROSS_FIELD' 
  | 'REFERENTIAL_INTEGRITY'
  | 'CHECK_CONSTRAINT';

export type ColumnDataType = 
  | 'STRING' 
  | 'NUMBER' 
  | 'EMAIL' 
  | 'DATE' 
  | 'BOOLEAN' 
  | 'ALLOWED_VALUES' 
  | 'MULTI_VALUED'
  | 'IDENTIFIER';

export type Severity = 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO';

export type ResolutionStatus = 'OPEN' | 'IN_REVIEW' | 'FIXED_IN_SOURCE' | 'FALSE_POSITIVE' | 'WAIVED';

export type DatasetStatus = 'uploaded' | 'validating' | 'validated' | 'error';

export interface ValidationRule {
  ruleId: string;
  ruleName: string;
  columnName: string;
  ruleType: RuleType;
  parameter?: string; // e.g. "0" for min value, "Active,Inactive,Pending" for allowed values, regex pattern, or reference list
  severity: Severity;
  enabled: boolean;
  description: string;
  category: 'Missing Data' | 'Uniqueness' | 'Data Format' | 'Range & Boundaries' | 'Relationship Logic' | 'Referential' | 'Atomic / Normalization';
  // Optional second column for cross-field rules (e.g. comparison operator, target column)
  crossFieldConfig?: {
    secondColumn: string;
    operator: 'GREATER_THAN' | 'GREATER_EQUAL' | 'LESS_THAN' | 'LESS_EQUAL' | 'EQUALS' | 'NOT_EQUALS' | 'CONDITIONAL_REQUIRED';
    conditionalValue?: string;
  };
  referenceList?: string[]; // for referential integrity
  dataType?: ColumnDataType;
  isMultiValued?: boolean;
  delimiter?: string; // e.g. ",", ";", "|"
  domainRoot?: string; // e.g. "@example.com" or "example.com"
}

export interface Dataset {
  datasetId: string;
  fileName: string;
  uploadedBy: string;
  uploadedById?: string; // Employee ID or User ID who uploaded this table
  uploadedByEmail?: string;
  isPreset?: boolean; // True for standard benchmark presets available to all
  uploadTime: string;
  fileType: string;
  rowCount: number;
  columns: string[];
  status: DatasetStatus;
  rawData: Record<string, string>[];
  originalCsv: string;
  sourceSystem?: string;
  reportedSuccess?: boolean; // Demonstrates the Silent Failure principle: ETL reported HTTP 200 / Success
}

export interface ValidationIssue {
  issueId: string;
  runId: string;
  datasetId: string;
  rowNumber: number; // 1-indexed row number in the CSV
  columnName: string;
  ruleId: string;
  ruleName: string;
  ruleType: RuleType;
  severity: Severity;
  foundValue: string;
  expectedCondition: string;
  errorMessage: string;
  simpleProblem?: string; // Clear plain-English problem (e.g. "Salary cannot be negative (-5000)")
  simpleFix?: string; // Clear plain-English fix (e.g. "Enter a positive salary, such as 50000")
  resolutionStatus: ResolutionStatus;
  rowData: Record<string, string>;
  category: string;
}

export interface FieldDefinition {
  columnName: string;
  displayName: string;
  plainMeaning: string;
  acceptableValues: string;
  exampleGoodValue: string;
  whyItMatters: string;
}

export interface ResolutionHistory {
  resolutionId: string;
  issueId: string;
  resolvedBy: string;
  resolutionComment: string;
  resolutionStatus: ResolutionStatus;
  updatedAt: string;
}

export interface ValidationRun {
  runId: string;
  runNumber: number;
  datasetId: string;
  datasetName: string;
  startedAt: string;
  completedAt: string;
  totalRecords: number;
  passedRecords: number;
  failedRecords: number;
  healthScore: number; // 0 - 100
  runStatus: 'PASSED' | 'FAILED' | 'WARNING';
  criticalIssuesCount: number;
  errorIssuesCount: number;
  warningIssuesCount: number;
  totalIssuesCount: number;
  executionTimeMs: number;
  ruleCountExecuted: number;
  executedBy?: string; // Employee ID or name of user who triggered the run
  executedById?: string;
  executedByEmail?: string;
}

export interface DepartmentReference {
  id: string;
  code: string;
  name: string;
  division: string;
  costCenter: string;
  headOfDepartment: string;
  active: boolean;
}

export interface RulePreset {
  id: string;
  name: string;
  domain: string;
  description: string;
  expectedColumns: string[];
  rules: ValidationRule[];
}

export type SemanticDomainType = 
  | 'DEPARTMENT_CODE' 
  | 'MONETARY_AMOUNT' 
  | 'PERSONNEL_ID' 
  | 'PHYSICAL_QUANTITY' 
  | 'EMAIL_RFC' 
  | 'STATUS_ENUM' 
  | 'DATE_CHRONO' 
  | 'GENERIC_IDENTIFIER';

export interface ColumnSemanticDomain {
  columnName: string;
  domainType: SemanticDomainType;
  domainLabel: string;
  scopeNamespace: string;
  unitOrFormat: string;
  description: string;
  exampleValues: string[];
}

export interface ColumnDisambiguationEvaluation {
  columnName: string;
  domainType: SemanticDomainType;
  domainLabel: string;
  scopeNamespace: string;
  isValid: boolean;
  verdict: 'VALID' | 'INVALID' | 'SUSPICIOUS' | 'UNMAPPED';
  reasoning: string;
  semanticMeaning?: string;
  activeRuleName?: string;
  expectedRuleCondition?: string;
}

export interface ValueDisambiguationResult {
  testedValue: string;
  evaluations: ColumnDisambiguationEvaluation[];
}

export type UserRole = 'ADMIN' | 'STEWARD' | 'VIEWER';

export interface EmployeeUser {
  id: string;
  employeeId: string; // e.g. "MS-ADMIN-001"
  name: string;
  email: string; // e.g. "rajesh.sharma@motherson.com"
  role: UserRole;
  division: string;
  plantLocation?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdDate: string;
  lastLogin?: string;
  avatarColor?: string;
}

export type AuthPermission = 
  | 'upload_data'
  | 'manage_rules'
  | 'resolve_issues'
  | 'manage_users'
  | 'delete_audit'
  | 'export_reports'
  | 'view_data';



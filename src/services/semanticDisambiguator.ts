import { 
  Dataset, 
  ValidationRule, 
  ValueDisambiguationResult, 
  ColumnDisambiguationEvaluation, 
  SemanticDomainType,
  ColumnSemanticDomain
} from '../types';
import { MASTER_DEPARTMENT_CATALOG } from '../data/mockDatasets';

export function inferColumnSemanticDomain(
  columnName: string, 
  rules: ValidationRule[] = []
): ColumnSemanticDomain {
  const colLower = columnName.toLowerCase();
  const rule = rules.find(r => r.columnName === columnName && r.enabled);

  if (colLower.includes('dept') || rule?.ruleType === 'REFERENTIAL_INTEGRITY') {
    return {
      columnName,
      domainType: 'DEPARTMENT_CODE',
      domainLabel: 'Enterprise Department Identifier',
      scopeNamespace: 'hr.organizational_hierarchy',
      unitOrFormat: 'Numeric Code (10, 20, 30, ... 160)',
      description: 'Foreign key to approved corporate business units in the department directory.',
      exampleValues: ['10 (Eng)', '20 (Sales)', '30 (Finance)', '40 (HR)', '120 (Customer Success)']
    };
  }

  if (colLower.includes('salary') || colLower.includes('amount') || colLower.includes('price') || colLower.includes('cost')) {
    return {
      columnName,
      domainType: 'MONETARY_AMOUNT',
      domainLabel: 'Monetary Compensation / Value',
      scopeNamespace: 'finance.payroll_ledger',
      unitOrFormat: 'Currency (USD / EUR / INR)',
      description: 'Numerical monetary amount. Governed by minimum wage and positive currency boundaries.',
      exampleValues: ['45000', '52000', '75000', '1250.00']
    };
  }

  if (colLower.includes('email') || rule?.parameter?.includes('@')) {
    return {
      columnName,
      domainType: 'EMAIL_RFC',
      domainLabel: 'RFC-5322 Corporate Email',
      scopeNamespace: 'identity.electronic_mail',
      unitOrFormat: 'name@domain.com',
      description: 'Unique corporate electronic contact address complying with standard email syntax.',
      exampleValues: ['amit@example.com', 'priya@corp.com', 'rahul@example.com']
    };
  }

  if (colLower.includes('qty') || colLower.includes('quantity') || colLower.includes('count')) {
    return {
      columnName,
      domainType: 'PHYSICAL_QUANTITY',
      domainLabel: 'Physical Inventory / Batch Quantity',
      scopeNamespace: 'manufacturing.inventory_units',
      unitOrFormat: 'Integer (Units / Pieces)',
      description: 'Manufactured component or material count. Must be non-negative integer.',
      exampleValues: ['75', '120', '150', '500']
    };
  }

  if (colLower.includes('status') || rule?.ruleType === 'ALLOWED_VALUES') {
    return {
      columnName,
      domainType: 'STATUS_ENUM',
      domainLabel: 'Controlled Lifecycle State',
      scopeNamespace: 'workflow.lifecycle_state',
      unitOrFormat: 'Categorical Whitelist',
      description: 'Discrete state tokens representing the lifecycle of the business record.',
      exampleValues: ['Approved', 'Pending', 'Shipped', 'Quality_Check']
    };
  }

  if (colLower.includes('date')) {
    return {
      columnName,
      domainType: 'DATE_CHRONO',
      domainLabel: 'ISO-8601 Calendar Date',
      scopeNamespace: 'temporal.calendar_date',
      unitOrFormat: 'YYYY-MM-DD',
      description: 'Chronological timestamp or date boundary subject to sequential workflow order.',
      exampleValues: ['2026-09-01', '2026-10-15', '2026-11-01']
    };
  }

  if (colLower.includes('id') || colLower.includes('key') || colLower.includes('code') || colLower.includes('num')) {
    return {
      columnName,
      domainType: 'PERSONNEL_ID',
      domainLabel: 'Primary Identity Reference',
      scopeNamespace: 'identity.surrogate_key',
      unitOrFormat: 'Alphanumeric Key',
      description: 'Unique identifier distinguishing individual records across systems.',
      exampleValues: ['101', '102', 'MTH-8821', 'ORD-5001']
    };
  }

  return {
    columnName,
    domainType: 'GENERIC_IDENTIFIER',
    domainLabel: 'General Attribute',
    scopeNamespace: 'general.attribute',
    unitOrFormat: 'String / Text',
    description: 'Descriptive or informational text attribute.',
    exampleValues: ['Amit Sharma', 'Batch-A', 'USD']
  };
}

export function disambiguateValueAcrossColumns(
  testValue: string,
  dataset: Dataset,
  rules: ValidationRule[] = []
): ValueDisambiguationResult {
  const trimmed = testValue.trim();
  const evaluations: ColumnDisambiguationEvaluation[] = [];

  for (const col of dataset.columns) {
    const domain = inferColumnSemanticDomain(col, rules);
    const applicableRules = rules.filter(r => r.columnName === col && r.enabled);
    const primaryRule = applicableRules[0];

    let isValid = true;
    let verdict: ColumnDisambiguationEvaluation['verdict'] = 'VALID';
    let reasoning = '';
    let semanticMeaning: string | undefined = undefined;

    switch (domain.domainType) {
      case 'DEPARTMENT_CODE': {
        const dept = MASTER_DEPARTMENT_CATALOG.find(d => d.code === trimmed);
        if (dept) {
          isValid = true;
          verdict = 'VALID';
          semanticMeaning = `Approved Department: "${dept.name}" (Division: ${dept.division}, Cost Center: ${dept.costCenter})`;
          reasoning = `The value '${trimmed}' is recognized as an authoritative department code in the enterprise HR directory.`;
        } else {
          isValid = false;
          verdict = 'INVALID';
          semanticMeaning = `Unregistered Department Code: '${trimmed}'`;
          reasoning = `The value '${trimmed}' does not exist in the 16-department registry [10, 20, 30... 160].`;
        }
        break;
      }

      case 'MONETARY_AMOUNT': {
        const num = parseFloat(trimmed);
        if (isNaN(num)) {
          isValid = false;
          verdict = 'INVALID';
          semanticMeaning = `Not a valid currency number`;
          reasoning = `'${trimmed}' cannot be parsed as a numeric monetary currency value.`;
        } else {
          semanticMeaning = `$${num.toLocaleString()} Monetary Value`;
          // Check min value rule if present
          const minRule = applicableRules.find(r => r.ruleType === 'MIN_VALUE');
          const minThreshold = minRule ? parseFloat(minRule.parameter || '1') : 1;

          if (num < minThreshold) {
            isValid = false;
            verdict = 'INVALID';
            reasoning = `Value '${trimmed}' violates minimum financial threshold of ${minThreshold}.`;
          } else if (num < 1000 && col.toLowerCase().includes('salary')) {
            // Enterprise context: 120 salary is suspicious in professional payroll!
            isValid = false;
            verdict = 'SUSPICIOUS';
            reasoning = `While technically numeric, a salary of '${trimmed}' is extremely low/abnormal for enterprise monthly payroll. Likely missing trailing zeroes or corrupted unit.`;
          } else {
            isValid = true;
            verdict = 'VALID';
            reasoning = `Valid positive currency amount satisfying financial limits.`;
          }
        }
        break;
      }

      case 'PHYSICAL_QUANTITY': {
        const num = parseInt(trimmed, 10);
        if (isNaN(num)) {
          isValid = false;
          verdict = 'INVALID';
          semanticMeaning = `Invalid non-integer quantity`;
          reasoning = `'${trimmed}' is not a valid discrete inventory unit count.`;
        } else if (num <= 0) {
          isValid = false;
          verdict = 'INVALID';
          semanticMeaning = `${num} units`;
          reasoning = `Production quantities cannot be negative or zero in dispatch transfers.`;
        } else {
          isValid = true;
          verdict = 'VALID';
          semanticMeaning = `${num} physical units / parts`;
          reasoning = `Valid positive physical quantity count for production/dispatch.`;
        }
        break;
      }

      case 'STATUS_ENUM': {
        const allowedRule = applicableRules.find(r => r.ruleType === 'ALLOWED_VALUES');
        const allowedTokens = allowedRule?.parameter 
          ? allowedRule.parameter.split(',').map(s => s.trim().toLowerCase())
          : ['approved', 'pending', 'shipped', 'quality_check'];

        if (allowedTokens.includes(trimmed.toLowerCase())) {
          isValid = true;
          verdict = 'VALID';
          semanticMeaning = `Permitted Lifecycle State: '${trimmed}'`;
          reasoning = `Matches approved workflow whitelist tokens.`;
        } else {
          isValid = false;
          verdict = 'INVALID';
          semanticMeaning = `Illegal status code: '${trimmed}'`;
          reasoning = `Column expects discrete text states (${allowedTokens.join(', ')}), not numeric or unrecognized value '${trimmed}'.`;
        }
        break;
      }

      case 'EMAIL_RFC': {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (emailRegex.test(trimmed)) {
          isValid = true;
          verdict = 'VALID';
          semanticMeaning = `Valid Electronic Mail Address`;
          reasoning = `Conforms to RFC-5322 corporate email structure.`;
        } else {
          isValid = false;
          verdict = 'INVALID';
          semanticMeaning = `Malformed Email Syntax`;
          reasoning = `Value '${trimmed}' lacks '@' symbol, domain root, or username prefix.`;
        }
        break;
      }

      case 'DATE_CHRONO': {
        const isDate = !isNaN(Date.parse(trimmed)) && /^\d{4}-\d{2}-\d{2}/.test(trimmed);
        if (isDate) {
          isValid = true;
          verdict = 'VALID';
          semanticMeaning = `Calendar Date (${new Date(trimmed).toLocaleDateString()})`;
          reasoning = `Valid ISO-8601 calendar date.`;
        } else {
          isValid = false;
          verdict = 'INVALID';
          semanticMeaning = `Invalid Date String`;
          reasoning = `Value '${trimmed}' is not in expected YYYY-MM-DD chronological format.`;
        }
        break;
      }

      case 'PERSONNEL_ID': {
        semanticMeaning = `Record Identifier #${trimmed}`;
        // Check uniqueness in active dataset
        const existingCount = dataset.rawData.filter(r => (r[col] || '').trim() === trimmed).length;
        if (existingCount > 0) {
          isValid = true;
          verdict = 'SUSPICIOUS';
          reasoning = `Value '${trimmed}' is a syntactically valid ID, but already appears ${existingCount} time(s) in '${col}' (Uniqueness risk).`;
        } else {
          isValid = true;
          verdict = 'VALID';
          reasoning = `Valid unassigned identifier sequence.`;
        }
        break;
      }

      default: {
        semanticMeaning = `Text attribute: "${trimmed}"`;
        isValid = trimmed !== '';
        verdict = isValid ? 'VALID' : 'INVALID';
        reasoning = isValid ? 'Acceptable string value.' : 'Field is empty.';
      }
    }

    evaluations.push({
      columnName: col,
      domainType: domain.domainType,
      domainLabel: domain.domainLabel,
      scopeNamespace: domain.scopeNamespace,
      isValid,
      verdict,
      reasoning,
      semanticMeaning,
      activeRuleName: primaryRule?.ruleName,
      expectedRuleCondition: primaryRule?.parameter || primaryRule?.description
    });
  }

  return {
    testedValue: trimmed,
    evaluations
  };
}

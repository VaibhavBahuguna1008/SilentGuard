import { Dataset, ValidationRule, ValidationIssue, ValidationRun } from '../types';

export function runValidation(
  dataset: Dataset,
  rules: ValidationRule[],
  runNumber: number = 1
): { run: ValidationRun; issues: ValidationIssue[] } {
  const startTime = performance.now();
  const runId = `run-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const issues: ValidationIssue[] = [];
  const rows = dataset.rawData;
  const activeRules = rules.filter(r => r.enabled);
  const datasetColumnsSet = new Set(dataset.columns);

  // Schema drift detection: verify expected columns exist
  for (const rule of activeRules) {
    if (!datasetColumnsSet.has(rule.columnName)) {
      issues.push({
        issueId: `drift-${rule.ruleId}-${Date.now()}`,
        runId,
        datasetId: dataset.datasetId,
        rowNumber: 1,
        columnName: rule.columnName,
        ruleId: rule.ruleId,
        ruleName: rule.ruleName,
        ruleType: rule.ruleType,
        severity: 'CRITICAL',
        foundValue: '<MISSING HEADER>',
        expectedCondition: `Dataset must provide column '${rule.columnName}'`,
        errorMessage: `Schema Drift: Configured rule '${rule.ruleName}' expects column '${rule.columnName}', but it is absent from dataset columns [${dataset.columns.join(', ')}].`,
        resolutionStatus: 'OPEN',
        rowData: rows[0] || {},
        category: 'Missing Data'
      });
    }

    if (rule.ruleType === 'CROSS_FIELD' && rule.crossFieldConfig) {
      const secondCol = rule.crossFieldConfig.secondColumn;
      if (!datasetColumnsSet.has(secondCol)) {
        issues.push({
          issueId: `drift-cross-${rule.ruleId}-${Date.now()}`,
          runId,
          datasetId: dataset.datasetId,
          rowNumber: 1,
          columnName: secondCol,
          ruleId: rule.ruleId,
          ruleName: rule.ruleName,
          ruleType: rule.ruleType,
          severity: 'CRITICAL',
          foundValue: '<MISSING SECOND COLUMN>',
          expectedCondition: `Relational column '${secondCol}' must exist`,
          errorMessage: `Schema Inconsistency: Cross-field rule '${rule.ruleName}' compares with '${secondCol}', which does not exist in dataset.`,
          resolutionStatus: 'OPEN',
          rowData: rows[0] || {},
          category: 'Relationship Logic'
        });
      }
    }
  }

  // Check unmapped columns for anomalies
  const ruleTargetColumns = new Set(activeRules.map(r => r.columnName));
  const newColumns = dataset.columns.filter(col => !ruleTargetColumns.has(col));

  for (const newCol of newColumns) {
    let emptyCount = 0;
    for (const row of rows) {
      const val = row[newCol] ? String(row[newCol]).trim() : '';
      if (val === '') emptyCount++;
    }

    // Warn if an unexpected column is completely empty
    if (rows.length > 0 && emptyCount === rows.length) {
      issues.push({
        issueId: `newcol-empty-${newCol}`,
        runId,
        datasetId: dataset.datasetId,
        rowNumber: 1,
        columnName: newCol,
        ruleId: 'dyn-col-empty',
        ruleName: 'New Column Fully Empty',
        ruleType: 'REQUIRED',
        severity: 'WARNING',
        foundValue: '<ALL ROWS EMPTY>',
        expectedCondition: `Newly occurred column '${newCol}' should contain data or be pruned`,
        errorMessage: `Dynamic Schema Alert: Newly detected column '${newCol}' is unmapped and 100% empty across all ${rows.length} records.`,
        resolutionStatus: 'OPEN',
        rowData: rows[0] || {},
        category: 'Missing Data'
      });
    }

    // Check for irregular header formatting (spaces, special symbols)
    if (/\s|[^a-zA-Z0-9_-]/.test(newCol)) {
      issues.push({
        issueId: `newcol-name-${newCol}`,
        runId,
        datasetId: dataset.datasetId,
        rowNumber: 1,
        columnName: newCol,
        ruleId: 'dyn-col-name',
        ruleName: 'Irregular Column Identifier',
        ruleType: 'FORMAT',
        severity: 'INFO',
        foundValue: newCol,
        expectedCondition: 'Column headers should use snake_case or camelCase without whitespace',
        errorMessage: `Column header '${newCol}' contains whitespace or non-standard characters which may cause downstream ETL failure.`,
        resolutionStatus: 'OPEN',
        rowData: rows[0] || {},
        category: 'Data Format'
      });
    }
  }

  // Pre-calculate frequencies for UNIQUE rules for existing columns
  const validUniqueRules = activeRules.filter(r => r.ruleType === 'UNIQUE' && datasetColumnsSet.has(r.columnName));
  const columnValueFrequencies: Record<string, Record<string, number>> = {};
  for (const rule of validUniqueRules) {
    const col = rule.columnName;
    columnValueFrequencies[col] = {};
    for (const row of rows) {
      const rawVal = row[col] ? String(row[col]).trim() : '';
      if (rawVal !== '') {
        columnValueFrequencies[col][rawVal] = (columnValueFrequencies[col][rawVal] || 0) + 1;
      }
    }
  }

  // Iterate over each record for rules that have matching columns
  rows.forEach((row, rowIndex) => {
    const rowNumber = rowIndex + 1; // 1-indexed

    for (const rule of activeRules) {
      const colName = rule.columnName;
      // Skip if column does not exist in dataset (handled in schema drift above)
      if (!datasetColumnsSet.has(colName)) continue;

      const rawValue = row[colName] !== undefined ? String(row[colName]) : '';
      const trimmedValue = rawValue.trim();

      let isViolation = false;
      let errorMessage = '';
      let expectedCondition = '';

      let simpleProblem = '';
      let simpleFix = '';

      switch (rule.ruleType) {
        case 'REQUIRED': {
          expectedCondition = 'Must be filled in (cannot be empty)';
          if (trimmedValue === '') {
            isViolation = true;
            simpleProblem = `${colName} is missing or blank`;
            simpleFix = colName === 'employee_id' 
              ? 'Enter a valid employee ID (e.g. 104)' 
              : colName === 'email' 
              ? 'Enter work email (e.g. user@example.com)'
              : colName === 'supplier_code'
              ? 'Enter an approved supplier code (e.g. SUP-IND-01)'
              : `Fill in a non-empty ${colName}`;
            errorMessage = `${colName} is required but left blank. Every record must have this field filled.`;
          }
          break;
        }

        case 'UNIQUE': {
          expectedCondition = 'Must be unique (no duplicates in this column)';
          if (trimmedValue !== '') {
            const count = columnValueFrequencies[colName]?.[trimmedValue] || 0;
            if (count > 1) {
              isViolation = true;
              simpleProblem = `Duplicate ${colName} ('${trimmedValue}')`;
              simpleFix = `Change this ${colName} so every record has its own distinct number`;
              errorMessage = `'${trimmedValue}' is used ${count} times in '${colName}'. Two different records cannot share the same ID.`;
            }
          }
          break;
        }

        case 'MIN_VALUE': {
          const minBound = parseFloat(rule.parameter || '0');
          expectedCondition = `Number must be >= ${minBound}`;
          if (trimmedValue !== '') {
            const numVal = parseFloat(trimmedValue);
            if (isNaN(numVal)) {
              isViolation = true;
              simpleProblem = `'${trimmedValue}' is not a number`;
              simpleFix = `Enter a valid numeric amount`;
              errorMessage = `Expected a number in '${colName}', but found text '${trimmedValue}'.`;
            } else if (numVal < minBound) {
              isViolation = true;
              if (colName.toLowerCase().includes('salary')) {
                simpleProblem = `Salary cannot be negative (${trimmedValue})`;
                simpleFix = `Enter a positive pay amount, such as 50,000`;
                errorMessage = `Salary is entered as a negative number (${trimmedValue}). Compensation must be greater than zero.`;
              } else if (colName.toLowerCase().includes('quantity') || colName.toLowerCase().includes('qty')) {
                simpleProblem = `Quantity cannot be negative or zero (${trimmedValue})`;
                simpleFix = `Enter at least 1 unit or more (e.g. 100)`;
                errorMessage = `Production quantity must be 1 unit or more. Found '${trimmedValue}'.`;
              } else {
                simpleProblem = `Number is too low (${trimmedValue} < ${minBound})`;
                simpleFix = `Increase value to at least ${minBound} or higher`;
                errorMessage = `Value '${trimmedValue}' is below the minimum allowed bound of ${minBound}.`;
              }
            }
          }
          break;
        }

        case 'MAX_VALUE': {
          const maxBound = parseFloat(rule.parameter || '100');
          expectedCondition = `Number must be <= ${maxBound}`;
          if (trimmedValue !== '') {
            const numVal = parseFloat(trimmedValue);
            if (isNaN(numVal)) {
              isViolation = true;
              simpleProblem = `'${trimmedValue}' is not a number`;
              simpleFix = `Enter a valid numeric amount`;
              errorMessage = `Expected a number in '${colName}', but found text '${trimmedValue}'.`;
            } else if (numVal > maxBound) {
              isViolation = true;
              simpleProblem = `Number exceeds maximum limit (${trimmedValue} > ${maxBound})`;
              simpleFix = `Reduce number to ${maxBound} or below`;
              errorMessage = `Value '${trimmedValue}' exceeds the maximum allowed limit of ${maxBound}.`;
            }
          }
          break;
        }

        case 'FORMAT': {
          expectedCondition = `Must match standard format: ${rule.parameter || 'format'}`;
          if (trimmedValue !== '' && rule.parameter) {
            try {
              const regex = new RegExp(rule.parameter);
              if (!regex.test(trimmedValue)) {
                isViolation = true;
                if (colName.toLowerCase().includes('email')) {
                  simpleProblem = `Invalid email address ('${trimmedValue}')`;
                  simpleFix = `Use format name@company.com (needs '@' and domain)`;
                  errorMessage = `'${trimmedValue}' is not a real email address because it is missing '@' or a domain name.`;
                } else if (colName.toLowerCase().includes('date')) {
                  simpleProblem = `Invalid date format ('${trimmedValue}')`;
                  simpleFix = `Use calendar date format YYYY-MM-DD (e.g. 2026-10-15)`;
                  errorMessage = `'${trimmedValue}' must be formatted as YYYY-MM-DD.`;
                } else {
                  simpleProblem = `Format pattern mismatch in '${colName}'`;
                  simpleFix = `Correct text format to match standard`;
                  errorMessage = `'${trimmedValue}' does not conform to the expected format rule.`;
                }
              }
            } catch {
              // Ignore invalid regex syntax silently
            }
          }
          break;
        }

        case 'ALLOWED_VALUES': {
          const allowed = (rule.parameter || '')
            .split(',')
            .map(s => s.trim().toLowerCase())
            .filter(Boolean);
          expectedCondition = `Must be one of: [${rule.parameter}]`;
          if (trimmedValue !== '' && allowed.length > 0) {
            if (!allowed.includes(trimmedValue.toLowerCase())) {
              isViolation = true;
              simpleProblem = `Unrecognized ${colName} ('${trimmedValue}')`;
              simpleFix = `Choose from approved options: ${rule.parameter}`;
              errorMessage = `'${trimmedValue}' is not allowed. You must select one of: ${rule.parameter}.`;
            }
          }
          break;
        }

        case 'CROSS_FIELD': {
          if (rule.crossFieldConfig) {
            const { secondColumn, operator } = rule.crossFieldConfig;
            if (datasetColumnsSet.has(secondColumn)) {
              const secondVal = row[secondColumn] !== undefined ? String(row[secondColumn]).trim() : '';
              expectedCondition = `'${colName}' must be ${operator} '${secondColumn}'`;

              if (trimmedValue && secondVal) {
                const isDate1 = !isNaN(Date.parse(trimmedValue)) && trimmedValue.includes('-');
                const isDate2 = !isNaN(Date.parse(secondVal)) && secondVal.includes('-');

                if (isDate1 && isDate2) {
                  const d1 = new Date(trimmedValue).getTime();
                  const d2 = new Date(secondVal).getTime();
                  if (operator === 'GREATER_EQUAL' && d1 < d2) {
                    isViolation = true;
                    simpleProblem = `Delivery date (${trimmedValue}) is before manufacturing date (${secondVal})`;
                    simpleFix = `Set delivery date to be on or after ${secondVal}`;
                    errorMessage = `Delivery date (${trimmedValue}) cannot be earlier than manufacturing date (${secondVal}). An item cannot be delivered before it is built.`;
                  } else if (operator === 'GREATER_THAN' && d1 <= d2) {
                    isViolation = true;
                    simpleProblem = `'${colName}' is not after '${secondColumn}'`;
                    simpleFix = `Adjust date to be after ${secondVal}`;
                    errorMessage = `'${colName}' (${trimmedValue}) must be after '${secondColumn}' (${secondVal}).`;
                  }
                }
              }
            }
          }
          break;
        }

        case 'REFERENTIAL_INTEGRITY': {
          const refs = rule.referenceList || (rule.parameter ? rule.parameter.split(',').map(s => s.trim()) : []);
          expectedCondition = colName.toLowerCase().includes('dept')
            ? `Must be an approved department code: [${refs.slice(0, 6).join(', ')}...]`
            : `Must be in approved reference list: [${refs.slice(0, 6).join(', ')}...]`;
          if (trimmedValue !== '' && refs.length > 0) {
            if (!refs.includes(trimmedValue)) {
              isViolation = true;
              if (colName.toLowerCase().includes('dept')) {
                simpleProblem = `Department code '${trimmedValue}' does not exist`;
                simpleFix = `Change to an approved department: 10 (Engineering), 20 (Sales), 30 (Finance), or 40 (HR)`;
                errorMessage = `Department code '${trimmedValue}' is not in the enterprise directory. Choose an active department code (e.g. 10 to 160).`;
              } else {
                simpleProblem = `Code '${trimmedValue}' is not in approved list`;
                simpleFix = `Select an approved code from: ${refs.slice(0, 4).join(', ')}`;
                errorMessage = `'${trimmedValue}' is not in the approved reference catalog for ${colName}.`;
              }
            }
          }
          break;
        }
      }

      if (isViolation) {
        issues.push({
          issueId: `iss-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          runId,
          datasetId: dataset.datasetId,
          rowNumber,
          columnName: colName,
          ruleId: rule.ruleId,
          ruleName: rule.ruleName,
          ruleType: rule.ruleType,
          severity: rule.severity,
          foundValue: trimmedValue || '<EMPTY>',
          expectedCondition,
          errorMessage,
          simpleProblem: simpleProblem || `${colName} has invalid data`,
          simpleFix: simpleFix || `Correct the value in this cell`,
          resolutionStatus: 'OPEN',
          rowData: { ...row },
          category: rule.category
        });
      }
    }
  });

  const endTime = performance.now();
  const executionTimeMs = Math.round(endTime - startTime);

  // Group failed rows
  const failedRowNumbers = new Set(issues.filter(i => i.severity === 'CRITICAL' || i.severity === 'ERROR').map(i => i.rowNumber));
  const failedRecords = failedRowNumbers.size;
  const passedRecords = Math.max(0, dataset.rowCount - failedRecords);

  const criticalIssuesCount = issues.filter(i => i.severity === 'CRITICAL').length;
  const errorIssuesCount = issues.filter(i => i.severity === 'ERROR').length;
  const warningIssuesCount = issues.filter(i => i.severity === 'WARNING').length;
  const totalIssuesCount = issues.length;

  // Compute health score (0 - 100%)
  let healthScore = 100;
  if (dataset.rowCount > 0) {
    const rawPenalty = (criticalIssuesCount * 25 + errorIssuesCount * 12 + warningIssuesCount * 4) / dataset.rowCount;
    healthScore = Math.max(0, Math.min(100, Math.round(100 - rawPenalty * 10)));
  }

  let runStatus: 'PASSED' | 'FAILED' | 'WARNING' = 'PASSED';
  if (criticalIssuesCount > 0 || errorIssuesCount > 0) {
    runStatus = 'FAILED';
  } else if (warningIssuesCount > 0) {
    runStatus = 'WARNING';
  }

  const run: ValidationRun = {
    runId,
    runNumber,
    datasetId: dataset.datasetId,
    datasetName: dataset.fileName,
    startedAt: new Date(Date.now() - executionTimeMs).toISOString(),
    completedAt: new Date().toISOString(),
    totalRecords: dataset.rowCount,
    passedRecords,
    failedRecords,
    healthScore,
    runStatus,
    criticalIssuesCount,
    errorIssuesCount,
    warningIssuesCount,
    totalIssuesCount,
    executionTimeMs,
    ruleCountExecuted: activeRules.length
  };

  return { run, issues };
}

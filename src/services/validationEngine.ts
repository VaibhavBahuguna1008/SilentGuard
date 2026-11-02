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

  // Duplicate / Colliding Column Detection in Dataset Schema
  const seenLowerCols: Record<string, string[]> = {};
  for (const col of dataset.columns) {
    const lower = col.toLowerCase();
    if (!seenLowerCols[lower]) seenLowerCols[lower] = [];
    seenLowerCols[lower].push(col);
  }
  for (const [lower, matchedCols] of Object.entries(seenLowerCols)) {
    if (matchedCols.length > 1) {
      issues.push({
        issueId: `duplicate-col-${lower}-${Date.now()}`,
        runId,
        datasetId: dataset.datasetId,
        rowNumber: 1,
        columnName: matchedCols[0],
        ruleId: 'schema-duplicate-column',
        ruleName: 'Duplicate Column Collision',
        ruleType: 'UNIQUE',
        severity: 'CRITICAL',
        foundValue: matchedCols.join(', '),
        expectedCondition: 'All column identifiers in dataset schema must be unique',
        errorMessage: `Schema Collision: Found duplicate/colliding columns [${matchedCols.join(', ')}]. Choose one to keep, rename, or merge.`,
        simpleProblem: `Duplicate columns detected (${matchedCols.join(', ')})`,
        simpleFix: 'Use the Duplicate Column Resolver to pick, merge, or rename one of the duplicate columns',
        resolutionStatus: 'OPEN',
        rowData: rows[0] || {},
        category: 'Uniqueness'
      });
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

  // Pre-compile regexes for FORMAT and CHECK_CONSTRAINT rules to maximize execution throughput on large datasets
  const compiledRegexMap = new Map<string, RegExp | null>();
  for (const rule of activeRules) {
    if (rule.parameter && rule.parameter !== 'ATOMIC_1NF' && (rule.ruleType === 'FORMAT' || rule.ruleType === 'CHECK_CONSTRAINT')) {
      try {
        compiledRegexMap.set(rule.ruleId, new RegExp(rule.parameter));
      } catch {
        compiledRegexMap.set(rule.ruleId, null);
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

        case 'CHECK_CONSTRAINT':
        case 'FORMAT': {
          expectedCondition = rule.domainRoot 
            ? `Must be email with domain: ${rule.domainRoot}` 
            : `Must match format constraint: ${rule.parameter || 'format'}`;

          if (trimmedValue !== '') {
            // Check for 1NF atomic violation if non-atomic multi-valued items appear in a scalar column
            if (!rule.isMultiValued && (trimmedValue.includes(',') || trimmedValue.includes(';')) && (rule.category === 'Atomic / Normalization' || rule.parameter === 'ATOMIC_1NF')) {
              isViolation = true;
              simpleProblem = `Non-atomic multi-valued entry in scalar column ('${trimmedValue}')`;
              simpleFix = `Enable 'Multi-Valued' option for this column or normalize into single values`;
              errorMessage = `1NF Normalization Violation: Multi-valued list detected in scalar column '${colName}'. First Normal Form requires atomic scalar values unless explicitly declared multi-valued.`;
              break;
            }

            const itemsToCheck = rule.isMultiValued 
              ? trimmedValue.split(rule.delimiter || ',').map(s => s.trim()).filter(Boolean)
              : [trimmedValue];

            for (const item of itemsToCheck) {
              // 1. Domain root check constraint (e.g. @company.com or specific root)
              if (rule.domainRoot) {
                const normalizedRoot = rule.domainRoot.startsWith('@') ? rule.domainRoot.toLowerCase() : `@${rule.domainRoot.toLowerCase()}`;
                if (!item.toLowerCase().endsWith(normalizedRoot)) {
                  isViolation = true;
                  simpleProblem = `'${item}' violates domain check constraint (needs ${normalizedRoot})`;
                  simpleFix = `Change email domain suffix to ${normalizedRoot}`;
                  errorMessage = `Domain Check Constraint: '${item}' in '${colName}' does not belong to authorized domain '${normalizedRoot}'.`;
                  break;
                }
              }

              // 2. Regex format constraint
              if (rule.parameter && rule.parameter !== 'ATOMIC_1NF') {
                const regex = compiledRegexMap.get(rule.ruleId);
                if (regex && !regex.test(item)) {
                  isViolation = true;
                  if (colName.toLowerCase().includes('email')) {
                    simpleProblem = `Invalid email syntax in '${item}'`;
                    simpleFix = `Use format name@company.com (needs '@' and valid domain root)`;
                    errorMessage = `'${item}' is not a valid email address conforming to standard RFC syntax.`;
                  } else if (colName.toLowerCase().includes('date')) {
                    simpleProblem = `Invalid date format ('${item}')`;
                    simpleFix = `Use calendar date format YYYY-MM-DD (e.g. 2026-10-15)`;
                    errorMessage = `'${item}' must be formatted as YYYY-MM-DD.`;
                  } else {
                    simpleProblem = `Format constraint violation in '${item}'`;
                    simpleFix = `Format text to satisfy check condition`;
                    errorMessage = `'${item}' does not conform to the check constraint pattern '${rule.parameter}'.`;
                  }
                  break;
                }
              }
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
            const items = rule.isMultiValued
              ? trimmedValue.split(rule.delimiter || ',').map(s => s.trim()).filter(Boolean)
              : [trimmedValue];

            for (const item of items) {
              if (!allowed.includes(item.toLowerCase())) {
                isViolation = true;
                simpleProblem = `Unrecognized ${colName} value ('${item}')`;
                simpleFix = `Choose from approved options: ${rule.parameter}`;
                errorMessage = `'${item}' in '${colName}' is not an approved option. Allowed values: [${rule.parameter}].`;
                break;
              }
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

  // Compute realistic, graduated health score (0 - 100%)
  // Avoids wild swings to 0 or 100 by combining clean record pass-rate with weighted defect density
  let healthScore = 100;
  if (dataset.rowCount > 0) {
    if (totalIssuesCount === 0) {
      healthScore = 100;
    } else if (passedRecords === 0) {
      healthScore = 0;
    } else {
      // Base ratio of records that are completely clean
      const passRatio = passedRecords / dataset.rowCount;

      // Weighted defect density (Critical: 2.5x, Error: 1.0x, Warning: 0.2x)
      const weightedDefects = (criticalIssuesCount * 2.5) + (errorIssuesCount * 1.0) + (warningIssuesCount * 0.2);
      const defectDensity = weightedDefects / dataset.rowCount;

      // Density deduction capped at 30% to anchor primarily on pass-rate
      const densityDeduction = Math.min(30, defectDensity * 20);

      // Composite continuous score
      const calculated = Math.round(passRatio * (100 - densityDeduction));
      healthScore = Math.max(1, Math.min(99, calculated));
    }
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

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  X, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Sliders, 
  Mail, 
  Hash, 
  Calendar, 
  ToggleLeft, 
  ListFilter, 
  ShieldCheck, 
  HelpCircle,
  Copy,
  GitMerge,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import { ColumnDataType, ValidationRule, Severity } from '../types';

export interface AddColumnResult {
  columnName: string;
  defaultValue: string;
  dataType: ColumnDataType;
  rules: ValidationRule[];
  duplicateResolution?: 'OVERWRITE' | 'DISAMBIGUATE' | 'MERGE';
  resolvedColumnName?: string;
}

interface AddColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingColumns: string[];
  onAddColumn: (result: AddColumnResult) => void;
}

export const AddColumnModal: React.FC<AddColumnModalProps> = ({
  isOpen,
  onClose,
  existingColumns,
  onAddColumn,
}) => {
  const [colName, setColName] = useState('');
  const [dataType, setDataType] = useState<ColumnDataType>('STRING');
  const [defaultVal, setDefaultVal] = useState('');
  
  // Constraints toggles & values
  const [isRequired, setIsRequired] = useState(false);
  const [isUnique, setIsUnique] = useState(false);
  const [hasFormatCheck, setHasFormatCheck] = useState(false);
  const [formatPattern, setFormatPattern] = useState('');
  const [hasDomainCheck, setHasDomainCheck] = useState(false);
  const [domainRoot, setDomainRoot] = useState('@example.com');
  const [hasMinVal, setHasMinVal] = useState(false);
  const [minVal, setMinVal] = useState('0');
  const [hasMaxVal, setHasMaxVal] = useState(false);
  const [maxVal, setMaxVal] = useState('100000');
  const [hasAllowedValues, setHasAllowedValues] = useState(false);
  const [allowedValues, setAllowedValues] = useState('Active, Inactive, Pending');
  const [severity, setSeverity] = useState<Severity>('ERROR');

  // Multi-valued attribute settings
  const [isMultiValued, setIsMultiValued] = useState(false);
  const [delimiter, setDelimiter] = useState(',');
  const [enforce1NFAtomic, setEnforce1NFAtomic] = useState(false);

  // Auto-detection tracking
  const [inferredNotice, setInferredNotice] = useState<string | null>(null);
  const [manuallyTouched, setManuallyTouched] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Duplicate Resolution State
  const [duplicateResolutionChoice, setDuplicateResolutionChoice] = useState<'DISAMBIGUATE' | 'OVERWRITE' | 'MERGE'>('DISAMBIGUATE');
  const [disambiguatedName, setDisambiguatedName] = useState('');

  // Check if column collides with existing columns
  const collision = useMemo(() => {
    const trimmed = colName.trim();
    if (!trimmed) return null;
    const lower = trimmed.toLowerCase();
    const match = existingColumns.find(c => c.toLowerCase() === lower);
    return match ? { original: match, exact: match === trimmed } : null;
  }, [colName, existingColumns]);

  // Compute default disambiguated name
  useEffect(() => {
    if (collision) {
      let counter = 2;
      let candidate = `${colName.trim()}_${counter}`;
      while (existingColumns.some(c => c.toLowerCase() === candidate.toLowerCase())) {
        counter++;
        candidate = `${colName.trim()}_${counter}`;
      }
      setDisambiguatedName(candidate);
    }
  }, [collision, colName, existingColumns]);

  // Automatic semantic & constraint inference as the user types
  useEffect(() => {
    if (manuallyTouched || !colName.trim()) return;

    const lower = colName.trim().toLowerCase();

    // 1. Email detection
    if (lower.includes('email') || lower.includes('mail')) {
      setDataType('EMAIL');
      setIsRequired(true);
      setHasFormatCheck(true);
      setFormatPattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$');
      setHasDomainCheck(true);
      setDomainRoot('@example.com');
      setDefaultVal('user@example.com');
      setInferredNotice('Detected Email: Auto-applied RFC-5322 regex and Domain Root check constraint.');
      return;
    }

    // 2. Monetary / Salary / Amount
    if (lower.includes('salary') || lower.includes('amount') || lower.includes('price') || lower.includes('cost') || lower.includes('revenue')) {
      setDataType('NUMBER');
      setIsRequired(true);
      setHasMinVal(true);
      setMinVal('0');
      setDefaultVal('50000');
      setInferredNotice('Detected Monetary Value: Auto-applied non-negative minimum bound constraint (>= 0).');
      return;
    }

    // 3. Physical Quantity
    if (lower.includes('quantity') || lower.includes('qty') || lower.includes('count') || lower.includes('stock')) {
      setDataType('NUMBER');
      setIsRequired(true);
      setHasMinVal(true);
      setMinVal('1');
      setDefaultVal('100');
      setInferredNotice('Detected Inventory Quantity: Auto-applied positive minimum threshold (>= 1).');
      return;
    }

    // 4. Date
    if (lower.includes('date') || lower.includes('time') || lower.includes('created_at') || lower.includes('hire_date')) {
      setDataType('DATE');
      setIsRequired(true);
      setHasFormatCheck(true);
      setFormatPattern('^\\d{4}-\\d{2}-\\d{2}$');
      setDefaultVal('2026-10-15');
      setInferredNotice('Detected Calendar Date: Auto-applied ISO-8601 YYYY-MM-DD format constraint.');
      return;
    }

    // 5. Categorical / Status
    if (lower.includes('status') || lower.includes('tier') || lower.includes('stage') || lower.includes('priority')) {
      setDataType('ALLOWED_VALUES');
      setIsRequired(true);
      setHasAllowedValues(true);
      setAllowedValues('Active, Pending, Inactive, Approved');
      setDefaultVal('Active');
      setInferredNotice('Detected Controlled State: Auto-applied allowed enum values whitelist.');
      return;
    }

    // 6. Multi-Valued Attributes (skills, tags, roles, phone_numbers)
    if (lower.includes('skills') || lower.includes('tags') || lower.includes('roles') || lower.includes('categories') || lower.includes('hobbies') || lower.includes('phones')) {
      setDataType('MULTI_VALUED');
      setIsMultiValued(true);
      setDelimiter(',');
      setDefaultVal('Tag1, Tag2');
      setInferredNotice('Detected Multi-Valued Attribute: Enabled delimited item validation.');
      return;
    }

    // 7. Identity Keys / ID
    if (lower.endsWith('_id') || lower === 'id' || lower.includes('uuid') || lower.includes('code') || lower.includes('batch_id')) {
      setDataType('IDENTIFIER');
      setIsRequired(true);
      setIsUnique(true);
      setDefaultVal('');
      setInferredNotice('Detected Unique Identifier: Auto-applied NOT NULL and UNIQUE integrity constraints.');
      return;
    }

    // Reset notice if no specific pattern
    setInferredNotice(null);
  }, [colName, manuallyTouched]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = colName.trim();
    if (!trimmed) return;

    let finalColName = trimmed;
    let duplicateResolution: 'OVERWRITE' | 'DISAMBIGUATE' | 'MERGE' | undefined = undefined;

    if (collision) {
      if (duplicateResolutionChoice === 'DISAMBIGUATE') {
        finalColName = disambiguatedName.trim() || `${trimmed}_2`;
        duplicateResolution = 'DISAMBIGUATE';
      } else if (duplicateResolutionChoice === 'OVERWRITE') {
        finalColName = collision.original;
        duplicateResolution = 'OVERWRITE';
      } else if (duplicateResolutionChoice === 'MERGE') {
        finalColName = collision.original;
        duplicateResolution = 'MERGE';
      }
    }

    // Build the rules for this new column
    const generatedRules: ValidationRule[] = [];

    // 1. Required constraint
    if (isRequired) {
      generatedRules.push({
        ruleId: `rule-req-${finalColName}-${Date.now()}`,
        ruleName: `${finalColName} Mandatory (NOT NULL)`,
        columnName: finalColName,
        ruleType: 'REQUIRED',
        severity,
        enabled: true,
        category: 'Missing Data',
        description: `Enforces that ${finalColName} is populated for every record.`,
        dataType
      });
    }

    // 2. Unique constraint
    if (isUnique) {
      generatedRules.push({
        ruleId: `rule-uniq-${finalColName}-${Date.now()}`,
        ruleName: `${finalColName} Uniqueness Constraint`,
        columnName: finalColName,
        ruleType: 'UNIQUE',
        severity: 'CRITICAL',
        enabled: true,
        category: 'Uniqueness',
        description: `Ensures no two records share duplicate values in ${finalColName}.`,
        dataType
      });
    }

    // 3. Email Check Constraint & Domain Root
    if (dataType === 'EMAIL' || hasDomainCheck || (hasFormatCheck && formatPattern)) {
      const isEmail = dataType === 'EMAIL' || hasDomainCheck;
      generatedRules.push({
        ruleId: `rule-fmt-${finalColName}-${Date.now()}`,
        ruleName: isEmail ? `${finalColName} Email & Domain Check` : `${finalColName} Format Check Constraint`,
        columnName: finalColName,
        ruleType: 'FORMAT',
        parameter: formatPattern.trim() || '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
        severity,
        enabled: true,
        category: 'Data Format',
        description: isEmail
          ? `Validates RFC email syntax${hasDomainCheck ? ` and enforces domain root '${domainRoot}'` : ''}.`
          : `Validates format pattern '${formatPattern}'.`,
        domainRoot: hasDomainCheck ? domainRoot.trim() : undefined,
        isMultiValued,
        delimiter,
        dataType
      });
    }

    // 4. Numeric Bounds
    if (hasMinVal && minVal.trim()) {
      generatedRules.push({
        ruleId: `rule-min-${finalColName}-${Date.now()}`,
        ruleName: `${finalColName} Minimum Bound (>= ${minVal})`,
        columnName: finalColName,
        ruleType: 'MIN_VALUE',
        parameter: minVal.trim(),
        severity,
        enabled: true,
        category: 'Range & Boundaries',
        description: `Requires ${finalColName} to be greater than or equal to ${minVal}.`,
        dataType
      });
    }

    if (hasMaxVal && maxVal.trim()) {
      generatedRules.push({
        ruleId: `rule-max-${finalColName}-${Date.now()}`,
        ruleName: `${finalColName} Maximum Bound (<= ${maxVal})`,
        columnName: finalColName,
        ruleType: 'MAX_VALUE',
        parameter: maxVal.trim(),
        severity,
        enabled: true,
        category: 'Range & Boundaries',
        description: `Requires ${finalColName} to be less than or equal to ${maxVal}.`,
        dataType
      });
    }

    // 5. Allowed Enum Values
    if (hasAllowedValues && allowedValues.trim()) {
      generatedRules.push({
        ruleId: `rule-allowed-${finalColName}-${Date.now()}`,
        ruleName: `${finalColName} Controlled Whitelist`,
        columnName: finalColName,
        ruleType: 'ALLOWED_VALUES',
        parameter: allowedValues.trim(),
        severity,
        enabled: true,
        category: 'Data Format',
        description: `Restricts ${finalColName} to: [${allowedValues}].`,
        isMultiValued,
        delimiter,
        dataType
      });
    }

    // 6. 1NF Normalization Atomic Check
    if (enforce1NFAtomic && !isMultiValued) {
      generatedRules.push({
        ruleId: `rule-1nf-${finalColName}-${Date.now()}`,
        ruleName: `${finalColName} 1NF Atomic Scalar Check`,
        columnName: finalColName,
        ruleType: 'FORMAT',
        parameter: 'ATOMIC_1NF',
        severity: 'WARNING',
        enabled: true,
        category: 'Atomic / Normalization',
        description: `Enforces First Normal Form (1NF) by flagging multi-valued delimited elements in scalar column.`,
        dataType
      });
    }

    onAddColumn({
      columnName: trimmed,
      resolvedColumnName: finalColName,
      defaultValue: defaultVal,
      dataType,
      rules: generatedRules,
      duplicateResolution
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
      <div className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Sticky Header - Always visible at top */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-[#242630] bg-white dark:bg-[#131418] shrink-0 z-20">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-200 dark:bg-red-600/20 dark:text-red-500 dark:border-transparent">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Add Column to Schema</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-transparent font-mono font-bold">
                  Dynamic Evolution
                </span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400">
                Configure data type, automatic check constraints, duplicate resolution, and multi-valued handling.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition cursor-pointer"
            title="Close / Cancel (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0 text-xs">
          <div className="overflow-y-auto p-4 sm:p-6 space-y-5 flex-1 pr-3">
            {/* Column Name Input */}
            <div>
              <label className="block text-slate-700 dark:text-zinc-300 font-semibold mb-1">
                Column Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. email, work_email, salary, hire_date, skills, status..."
                value={colName}
                onChange={(e) => {
                  setColName(e.target.value);
                  setManuallyTouched(false);
                }}
                className="w-full bg-white dark:bg-[#0b0c0e] border border-slate-200 dark:border-[#242630] rounded-xl px-3.5 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/30 font-mono text-xs shadow-2xs"
              />
            </div>

          {/* Duplicate Column Collision Alert & Resolver */}
          {collision && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-2.5">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-semibold text-xs text-amber-300">
                  Duplicate Column Detected: '{collision.original}' already exists in dataset!
                </span>
              </div>
              <p className="text-[11px] text-zinc-300">
                Choose how to resolve the collision between the existing column and this new column:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {/* Option 1: Disambiguate */}
                <button
                  type="button"
                  onClick={() => setDuplicateResolutionChoice('DISAMBIGUATE')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    duplicateResolutionChoice === 'DISAMBIGUATE'
                      ? 'bg-red-600/20 border-red-500 text-white shadow'
                      : 'bg-[#0b0c0e] border-[#242630] text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 font-bold mb-1">
                    <Copy className="w-3.5 h-3.5 text-red-500" />
                    <span>Disambiguate</span>
                  </div>
                  <p className="text-[10px] text-zinc-400">
                    Rename with suffix: <code className="text-red-400 font-mono">{disambiguatedName}</code>
                  </p>
                </button>

                {/* Option 2: Overwrite */}
                <button
                  type="button"
                  onClick={() => setDuplicateResolutionChoice('OVERWRITE')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    duplicateResolutionChoice === 'OVERWRITE'
                      ? 'bg-red-600/30 border-red-500 text-white shadow'
                      : 'bg-[#0b0c0e] border-[#242630] text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 font-bold mb-1">
                    <RefreshCw className="w-3.5 h-3.5 text-red-400" />
                    <span>Overwrite</span>
                  </div>
                  <p className="text-[10px] text-zinc-400">
                    Replace existing column with new schema &amp; values.
                  </p>
                </button>

                {/* Option 3: Merge / Coalesce */}
                <button
                  type="button"
                  onClick={() => setDuplicateResolutionChoice('MERGE')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    duplicateResolutionChoice === 'MERGE'
                      ? 'bg-emerald-600/30 border-emerald-500 text-white shadow'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 font-bold mb-1">
                    <GitMerge className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Merge (Coalesce)</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Fill missing/blank cells with new default value.
                  </p>
                </button>
              </div>

              {duplicateResolutionChoice === 'DISAMBIGUATE' && (
                <div className="pt-1">
                  <label className="block text-[11px] text-slate-400 font-medium mb-1">
                    Custom Disambiguated Name:
                  </label>
                  <input
                    type="text"
                    value={disambiguatedName}
                    onChange={(e) => setDisambiguatedName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono text-xs"
                  />
                </div>
              )}
            </div>
          )}

          {/* Smart Auto-Inference Notice */}
          {inferredNotice && (
            <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/30 text-red-200 flex items-start space-x-2.5">
              <Sparkles className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold text-xs text-red-300">Automatic Constraint Identification:</span>
                <p className="text-[11px] text-zinc-300 mt-0.5">{inferredNotice}</p>
              </div>
            </div>
          )}

          {/* Data Type Selector */}
          <div>
            <label className="block text-zinc-300 font-semibold mb-1.5">
              Column Data Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { type: 'STRING' as ColumnDataType, label: 'Text / String', icon: FileSpreadsheet },
                { type: 'EMAIL' as ColumnDataType, label: 'Email Address', icon: Mail },
                { type: 'NUMBER' as ColumnDataType, label: 'Number / Decimal', icon: Hash },
                { type: 'DATE' as ColumnDataType, label: 'Calendar Date', icon: Calendar },
                { type: 'BOOLEAN' as ColumnDataType, label: 'Boolean (T/F)', icon: ToggleLeft },
                { type: 'ALLOWED_VALUES' as ColumnDataType, label: 'Categorical Enum', icon: ListFilter },
                { type: 'MULTI_VALUED' as ColumnDataType, label: 'Multi-Valued List', icon: Layers },
                { type: 'IDENTIFIER' as ColumnDataType, label: 'Unique ID', icon: ShieldCheck },
              ].map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setDataType(type);
                    setManuallyTouched(true);
                    if (type === 'EMAIL') {
                      setHasFormatCheck(true);
                      setFormatPattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$');
                      setHasDomainCheck(true);
                    }
                    if (type === 'MULTI_VALUED') {
                      setIsMultiValued(true);
                    }
                    if (type === 'NUMBER') {
                      setHasMinVal(true);
                    }
                    if (type === 'DATE') {
                      setHasFormatCheck(true);
                      setFormatPattern('^\\d{4}-\\d{2}-\\d{2}$');
                    }
                    if (type === 'ALLOWED_VALUES') {
                      setHasAllowedValues(true);
                    }
                    if (type === 'IDENTIFIER') {
                      setIsRequired(true);
                      setIsUnique(true);
                    }
                  }}
                  className={`p-2 rounded-xl border flex items-center space-x-2 text-left transition cursor-pointer ${
                    dataType === type
                      ? 'bg-[#e31b23] text-white border-red-500 shadow-sm'
                      : 'bg-[#0b0c0e] text-zinc-300 border-[#242630] hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[11px] font-medium truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Constraints & Check Constraints Section */}
          <div className="bg-[#0e0f13] border border-[#242630] rounded-xl p-4 space-y-3.5">
            <h4 className="text-xs font-bold text-zinc-200 flex items-center space-x-1.5">
              <Sliders className="w-3.5 h-3.5 text-red-500" />
              <span>Configured Constraints &amp; Validation Checks</span>
            </h4>

            {/* Basic Completeness & Uniqueness Toggles */}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                  className="rounded border-[#242630] text-red-600 accent-red-600 bg-[#0b0c0e] cursor-pointer"
                />
                <span className="text-zinc-300 font-medium text-[11px]">NOT NULL (Required field)</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isUnique}
                  onChange={(e) => setIsUnique(e.target.checked)}
                  className="rounded border-[#242630] text-red-600 accent-red-600 bg-[#0b0c0e] cursor-pointer"
                />
                <span className="text-zinc-300 font-medium text-[11px]">UNIQUE (No duplicates)</span>
              </label>
            </div>

            {/* Email & Domain Root Check Constraint */}
            {(dataType === 'EMAIL' || colName.toLowerCase().includes('email')) && (
              <div className="p-3 rounded-xl bg-[#0b0c0e] border border-red-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-red-400 text-[11px] flex items-center space-x-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email Check Constraint &amp; Domain Root Validation</span>
                  </span>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasDomainCheck}
                      onChange={(e) => setHasDomainCheck(e.target.checked)}
                      className="rounded border-zinc-700 text-red-600 bg-zinc-900 focus:ring-red-600"
                    />
                    <span className="text-[10px] text-zinc-400">Enforce Specific Domain Root</span>
                  </label>
                </div>

                {hasDomainCheck && (
                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-0.5">
                      Required Domain Root (e.g. @corp.com, @example.com):
                    </label>
                    <input
                      type="text"
                      value={domainRoot}
                      onChange={(e) => setDomainRoot(e.target.value)}
                      placeholder="@company.com"
                      className="w-full bg-[#0b0c0e] border border-[#242630] rounded-lg px-2.5 py-1 text-white font-mono text-xs focus:outline-none focus:border-red-600"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Custom Format Pattern / Regex */}
            {hasFormatCheck && (
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Format Regex Pattern:
                </label>
                <input
                  type="text"
                  value={formatPattern}
                  onChange={(e) => setFormatPattern(e.target.value)}
                  placeholder="Regex pattern (e.g. ^\d{4}-\d{2}-\d{2}$)"
                  className="w-full bg-[#0b0c0e] border border-[#242630] rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-red-600"
                />
              </div>
            )}

            {/* Numeric Range Bounds */}
            {(dataType === 'NUMBER' || hasMinVal || hasMaxVal) && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="flex items-center space-x-1.5 text-[11px] text-zinc-300 mb-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasMinVal}
                      onChange={(e) => setHasMinVal(e.target.checked)}
                      className="rounded border-zinc-700 text-red-600 bg-zinc-900 focus:ring-red-600"
                    />
                    <span>Minimum Value Bound (&gt;=)</span>
                  </label>
                  {hasMinVal && (
                    <input
                      type="number"
                      value={minVal}
                      onChange={(e) => setMinVal(e.target.value)}
                      className="w-full bg-[#0b0c0e] border border-[#242630] rounded-lg px-2.5 py-1 text-white font-mono text-xs focus:outline-none focus:border-red-600"
                    />
                  )}
                </div>

                <div>
                  <label className="flex items-center space-x-1.5 text-[11px] text-zinc-300 mb-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasMaxVal}
                      onChange={(e) => setHasMaxVal(e.target.checked)}
                      className="rounded border-zinc-700 text-red-600 bg-zinc-900 focus:ring-red-600"
                    />
                    <span>Maximum Value Bound (&lt;=)</span>
                  </label>
                  {hasMaxVal && (
                    <input
                      type="number"
                      value={maxVal}
                      onChange={(e) => setMaxVal(e.target.value)}
                      className="w-full bg-[#0b0c0e] border border-[#242630] rounded-lg px-2.5 py-1 text-white font-mono text-xs focus:outline-none focus:border-red-600"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Allowed Values Enum */}
            {(dataType === 'ALLOWED_VALUES' || hasAllowedValues) && (
              <div className="pt-1">
                <label className="block text-[11px] text-zinc-300 mb-1">
                  Allowed Options (Comma-Separated Whitelist):
                </label>
                <input
                  type="text"
                  value={allowedValues}
                  onChange={(e) => setAllowedValues(e.target.value)}
                  placeholder="e.g. Active, Inactive, Pending"
                  className="w-full bg-[#0b0c0e] border border-[#242630] rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-red-600"
                />
              </div>
            )}

            {/* Multi-Valued Attribute Configuration & 1NF Normalization */}
            <div className="pt-2 border-t border-[#242630] space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="flex items-center space-x-2 cursor-pointer font-semibold text-zinc-200 text-[11px]">
                    <input
                      type="checkbox"
                      checked={isMultiValued}
                      onChange={(e) => {
                        setIsMultiValued(e.target.checked);
                        if (e.target.checked) setEnforce1NFAtomic(false);
                      }}
                      className="rounded border-zinc-700 text-red-600 bg-zinc-900 focus:ring-red-600"
                    />
                    <span>Allow Multi-Valued Attribute (Lists / Sets)</span>
                  </label>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    Permits delimited items (e.g. <code className="text-red-400 font-mono">React, Java, SQL</code>). Constraints validate each individual item.
                  </p>
                </div>

                {isMultiValued && (
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] text-zinc-400">Delimiter:</span>
                    <select
                      value={delimiter}
                      onChange={(e) => setDelimiter(e.target.value)}
                      className="bg-[#0b0c0e] border border-[#242630] rounded-lg px-2 py-0.5 text-white text-xs font-mono"
                    >
                      <option value=",">Comma (,)</option>
                      <option value=";">Semicolon (;)</option>
                      <option value="|">Pipe (|)</option>
                    </select>
                  </div>
                )}
              </div>

              {!isMultiValued && (
                <label className="flex items-center space-x-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={enforce1NFAtomic}
                    onChange={(e) => setEnforce1NFAtomic(e.target.checked)}
                    className="rounded border-zinc-700 text-red-600 bg-zinc-900 focus:ring-red-600"
                  />
                  <span className="text-[10px] text-zinc-300">
                    Enforce First Normal Form (1NF) Atomic Check (Flag multi-valued comma lists as quality violations)
                  </span>
                </label>
              )}
            </div>
          </div>

            {/* Initial Default Value */}
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">
                Default Initial Value for Existing Records (Optional)
              </label>
              <input
                type="text"
                placeholder="Leave empty to test missing/blank cell detection..."
                value={defaultVal}
                onChange={(e) => setDefaultVal(e.target.value)}
                className="w-full bg-[#0b0c0e] border border-[#242630] rounded-xl px-3.5 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-red-600 font-mono text-xs"
              />
            </div>

            {/* Rule Severity Classification */}
            <div className="bg-[#0e0f13] border border-[#242630] rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-zinc-300 font-semibold text-[11px]">
                  Constraint Severity Classification
                </label>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                  severity === 'CRITICAL'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : severity === 'ERROR'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-zinc-700/30 text-zinc-300 border border-zinc-600/30'
                }`}>
                  {severity} Level
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 mb-2">
                Defines the penalty weight and blocking behavior if records violate this column's constraints:
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSeverity('CRITICAL')}
                  className={`p-2 rounded-lg border text-left cursor-pointer transition ${
                    severity === 'CRITICAL'
                      ? 'bg-rose-500/20 border-rose-500 text-white shadow-sm'
                      : 'bg-[#0b0c0e] border-[#242630] text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="block font-bold text-rose-400 text-[11px]">CRITICAL</span>
                  <span className="text-[9px] text-zinc-400 block mt-0.5">Halts ingest / Primary Key corruptions</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSeverity('ERROR')}
                  className={`p-2 rounded-lg border text-left cursor-pointer transition ${
                    severity === 'ERROR'
                      ? 'bg-amber-500/20 border-amber-500 text-white shadow-sm'
                      : 'bg-[#0b0c0e] border-[#242630] text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="block font-bold text-amber-400 text-[11px]">ERROR</span>
                  <span className="text-[9px] text-zinc-400 block mt-0.5">Domain syntax or business defects</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSeverity('WARNING')}
                  className={`p-2 rounded-lg border text-left cursor-pointer transition ${
                    severity === 'WARNING'
                      ? 'bg-red-500/20 border-red-500 text-white shadow-sm'
                      : 'bg-[#0b0c0e] border-[#242630] text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="block font-bold text-red-400 text-[11px]">WARNING</span>
                  <span className="text-[9px] text-zinc-400 block mt-0.5">Non-blocking / 1NF anomaly warnings</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sticky Form Actions Footer - Always visible at bottom */}
          <div className="flex items-center justify-between p-3.5 sm:px-6 border-t border-[#242630] bg-[#0e0f13] shrink-0 z-20">
            <span className="text-[10px] text-zinc-400 hidden sm:inline">
              Press <kbd className="px-1.5 py-0.5 rounded bg-[#14151a] border border-[#242630] font-mono text-zinc-300">Esc</kbd> to cancel
            </span>
            <div className="flex items-center space-x-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer font-medium text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#e31b23] hover:bg-[#c41219] text-white font-semibold shadow-md shadow-red-950/40 transition flex items-center space-x-1.5 cursor-pointer text-xs border border-red-500/30"
              >
                <Plus className="w-4 h-4" />
                <span>Add Column &amp; Activate Constraints</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

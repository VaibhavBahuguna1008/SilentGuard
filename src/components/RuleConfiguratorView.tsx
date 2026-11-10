import React, { useState } from 'react';
import { 
  Sliders, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertTriangle, 
  BookOpen, 
  ShieldCheck, 
  Sparkles, 
  Building2,
  X,
  Search,
  Check,
  Layers,
  ArrowRight,
  Info,
  Database,
  FileText,
  HelpCircle,
  Hash
} from 'lucide-react';
import { ValidationRule, RuleType, Severity, Dataset, DepartmentReference, FieldDefinition } from '../types';
import { RULE_PRESETS, MASTER_DEPARTMENT_CATALOG, getFieldDefinition, GENERIC_DATA_DICTIONARY } from '../data/mockDatasets';

interface RuleConfiguratorViewProps {
  dataset: Dataset;
  rules: ValidationRule[];
  onToggleRule: (ruleId: string) => void;
  onAddRule: (rule: ValidationRule) => void;
  onDeleteRule: (ruleId: string) => void;
  onApplyPreset: (presetId: string) => void;
  onRunValidation: () => void;
  onUpdateRuleReferenceList?: (ruleId: string, newList: string[]) => void;
}

export const RuleConfiguratorView: React.FC<RuleConfiguratorViewProps> = ({
  dataset,
  rules,
  onToggleRule,
  onAddRule,
  onDeleteRule,
  onApplyPreset,
  onRunValidation,
  onUpdateRuleReferenceList
}) => {
  const [subTab, setSubTab] = useState<'rules' | 'dictionary' | 'departments'>('rules');
  const [dictSearchTerm, setDictSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Department directory state (init with 16 enterprise departments)
  const [departments, setDepartments] = useState<DepartmentReference[]>(MASTER_DEPARTMENT_CATALOG);
  const [deptSearchTerm, setDeptSearchTerm] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDivision, setNewDeptDivision] = useState('Product & Tech');

  // New Rule Form State
  const [ruleName, setRuleName] = useState('');
  const [columnName, setColumnName] = useState(dataset.columns[0] || '');
  const [ruleType, setRuleType] = useState<RuleType>('REQUIRED');
  const [parameter, setParameter] = useState('');
  const [severity, setSeverity] = useState<Severity>('ERROR');
  const [description, setDescription] = useState('');
  const [crossSecondCol, setCrossSecondCol] = useState(dataset.columns[1] || dataset.columns[0] || '');
  const [crossOperator, setCrossOperator] = useState<'GREATER_THAN' | 'GREATER_EQUAL' | 'LESS_THAN' | 'LESS_EQUAL' | 'EQUALS'>('GREATER_EQUAL');

  const categories = ['ALL', 'Missing Data', 'Uniqueness', 'Data Format', 'Range & Boundaries', 'Relationship Logic', 'Referential'];

  // Check for dynamic schema drift and newly occurring columns
  const datasetColsSet = new Set(dataset.columns);
  const ruleTargetCols = new Set(rules.map(r => r.columnName));
  const unmappedColumns = dataset.columns.filter(c => !ruleTargetCols.has(c));

  const filteredRules = rules.filter(r => {
    if (selectedCategory === 'ALL') return true;
    return r.category === selectedCategory;
  });

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;

    let cat: ValidationRule['category'] = 'Data Format';
    if (ruleType === 'REQUIRED') cat = 'Missing Data';
    else if (ruleType === 'UNIQUE') cat = 'Uniqueness';
    else if (ruleType === 'MIN_VALUE' || ruleType === 'MAX_VALUE') cat = 'Range & Boundaries';
    else if (ruleType === 'CROSS_FIELD') cat = 'Relationship Logic';
    else if (ruleType === 'REFERENTIAL_INTEGRITY') cat = 'Referential';

    const newRule: ValidationRule = {
      ruleId: `rule-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ruleName: ruleName.trim(),
      columnName,
      ruleType,
      parameter: parameter.trim() || undefined,
      severity,
      enabled: true,
      description: description.trim() || `Validation condition for ${columnName}`,
      category: cat,
      crossFieldConfig: ruleType === 'CROSS_FIELD' ? {
        secondColumn: crossSecondCol,
        operator: crossOperator
      } : undefined,
      referenceList: ruleType === 'REFERENTIAL_INTEGRITY' 
        ? (parameter.trim() ? parameter.split(',').map((s: string) => s.trim()) : departments.map((d: DepartmentReference) => d.code))
        : undefined
    };

    onAddRule(newRule);
    setIsAddModalOpen(false);
    setRuleName('');
    setParameter('');
    setDescription('');
  };

  // Add new department to referential registry
  const handleAddNewDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptCode.trim() || !newDeptName.trim()) return;

    const trimmedCode = newDeptCode.trim();
    if (departments.some((d: DepartmentReference) => d.code === trimmedCode)) return;

    const newDept: DepartmentReference = {
      id: `dept-${trimmedCode}`,
      code: trimmedCode,
      name: newDeptName.trim(),
      division: newDeptDivision,
      costCenter: `CC-NEW-${trimmedCode}`,
      headOfDepartment: 'Appointed Director',
      active: true
    };

    const updatedDepts = [...departments, newDept];
    setDepartments(updatedDepts);

    // If onUpdateRuleReferenceList exists, update the department referential rule
    const deptRule = rules.find(r => r.ruleType === 'REFERENTIAL_INTEGRITY' && r.columnName === 'department_id');
    if (deptRule && onUpdateRuleReferenceList) {
      onUpdateRuleReferenceList(deptRule.ruleId, updatedDepts.map((d: DepartmentReference) => d.code));
    }

    setNewDeptCode('');
    setNewDeptName('');
  };

  const filteredDepts = departments.filter((d: DepartmentReference) => 
    d.name.toLowerCase().includes(deptSearchTerm.toLowerCase()) ||
    d.code.includes(deptSearchTerm) ||
    d.division.toLowerCase().includes(deptSearchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Preset Loader */}
      <div className="bg-[#131418]/90 border border-[#242630] rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-red-500" />
              <span>Configurable Quality Rules</span>
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/30 font-mono">
              {rules.filter(r => r.enabled).length} of {rules.length} Active
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            Motherson quality assurance engine enforcing mandatory presence, uniqueness, format patterns, numeric boundaries, cross-field chronology, and expanded enterprise referential integrity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Department Directory Quick Launcher */}
          <button
            onClick={() => setIsDeptModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 text-zinc-200 border border-[#2e303d] hover:border-red-600/50 hover:bg-[#1a1b22] transition shadow-sm cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5 text-red-500" />
            <span>Department Registry ({departments.length})</span>
          </button>

          {/* Preset Selector */}
          <div className="flex items-center space-x-1.5 bg-[#0e0f13] border border-[#242630] rounded-xl px-2.5 py-1.5 text-xs">
            <BookOpen className="w-3.5 h-3.5 text-red-500" />
            <span className="text-zinc-400">Preset:</span>
            <select
              onChange={(e) => {
                if (e.target.value) onApplyPreset(e.target.value);
              }}
              defaultValue=""
              aria-label="Load standard rule preset"
              className="bg-transparent text-zinc-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="" disabled className="bg-[#121317]">
                Load Preset Template...
              </option>
              {RULE_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id} className="bg-[#121317] text-zinc-200">
                  {preset.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#e31b23] hover:bg-[#c41219] text-white transition shadow-sm shadow-red-950/50 cursor-pointer border border-red-500/30"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom Rule</span>
          </button>
        </div>
      </div>

      {/* Unmapped columns alert */}
      {unmappedColumns.length > 0 && (
        <div className="p-4 rounded-xl bg-[#0e0f13] border border-red-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-red-500/20 text-red-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white">
                Dynamic Schema Event: {unmappedColumns.length} New or Unchecked Column{unmappedColumns.length > 1 ? 's' : ''} Detected
              </span>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Columns in dataset: <span className="font-mono text-red-400 font-semibold">{unmappedColumns.join(', ')}</span> currently have no active validation rules.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setColumnName(unmappedColumns[0]);
              setRuleName(`Validate ${unmappedColumns[0]}`);
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#e31b23] hover:bg-[#c41219] text-white transition cursor-pointer self-start sm:self-auto shrink-0 border border-red-500/30"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Configure Rule for &lsquo;{unmappedColumns[0]}&rsquo;</span>
          </button>
        </div>
      )}

      {/* Sub-view Navigation Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#242630] pb-3">
        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => setSubTab('rules')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center space-x-1.5 cursor-pointer ${
              subTab === 'rules'
                ? 'bg-[#e31b23] text-white shadow-sm'
                : 'bg-white dark:bg-[#121318] text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#242630] shadow-2xs'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Validation Rules ({rules.length})</span>
          </button>

          <button
            onClick={() => setSubTab('dictionary')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center space-x-1.5 cursor-pointer text-xs ${
              subTab === 'dictionary'
                ? 'bg-[#e31b23] text-white shadow-sm'
                : 'bg-white dark:bg-[#121318] text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#242630] shadow-2xs'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Field Meanings &amp; Data Dictionary ({dataset.columns.length})</span>
          </button>

          <button
            onClick={() => setSubTab('departments')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center space-x-1.5 cursor-pointer text-xs ${
              subTab === 'departments'
                ? 'bg-[#e31b23] text-white shadow-sm'
                : 'bg-white dark:bg-[#121318] text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#242630] shadow-2xs'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Department Registry ({departments.length})</span>
          </button>
        </div>

        <div className="text-xs text-slate-600 dark:text-zinc-400">
          Active Dataset: <span className="font-semibold text-slate-900 dark:text-zinc-200">{dataset.fileName}</span>
        </div>
      </div>

      {/* VIEW 1: ACTIVE VALIDATION RULES */}
      {subTab === 'rules' && (
        <div className="space-y-5">
          {/* Category Pills Filter */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-[#e31b23] text-white shadow-sm font-semibold border border-red-500/30'
                    : 'bg-white dark:bg-[#121318] text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200 dark:border-[#242630] shadow-2xs'
                }`}
              >
                {cat} {cat !== 'ALL' && `(${rules.filter(r => r.category === cat).length})`}
              </button>
            ))}
          </div>

          {/* Deterministic Severity Classification Standard Guide */}
          <div className="bg-white dark:bg-[#0e0f13] border border-slate-200 dark:border-[#242630] rounded-2xl p-4 text-xs shadow-sm">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200 dark:border-[#242630]">
              <span className="font-bold text-slate-900 dark:text-zinc-200 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-red-600 dark:text-red-500" />
                <span>Deterministic Severity Classification Standard</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                How SilentGuard isolates defects
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-[11px]">
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-rose-500/10 border border-red-200 dark:border-rose-500/25">
                <span className="font-bold text-red-700 dark:text-rose-300 block mb-1">CRITICAL</span>
                <p className="text-slate-700 dark:text-slate-300 text-[10px] leading-relaxed">
                  <strong>Fatal Ingest Barriers:</strong> Missing surrogate primary keys, duplicate IDs in UNIQUE columns, missing schema headers, negative monetary salaries.
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25">
                <span className="font-bold text-amber-800 dark:text-amber-300 block mb-1">ERROR</span>
                <p className="text-slate-700 dark:text-slate-300 text-[10px] leading-relaxed">
                  <strong>Business Logic Defects:</strong> Malformed email syntax / domain root check failures, unapproved department IDs, delivery before manufacturing dates.
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/25">
                <span className="font-bold text-blue-800 dark:text-blue-300 block mb-1">WARNING</span>
                <p className="text-slate-700 dark:text-slate-300 text-[10px] leading-relaxed">
                  <strong>Suspicious Anomalies:</strong> Non-atomic multi-valued lists (1NF violations) in scalar fields, unmapped completely empty columns, near-boundary values.
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/40">
                <span className="font-bold text-slate-700 dark:text-slate-400 block mb-1">INFO</span>
                <p className="text-slate-600 dark:text-slate-400 text-[10px] leading-relaxed">
                  <strong>Informational Notices:</strong> Column header formatting suggestions, whitespace trimming advisories, non-standard capitalization.
                </p>
              </div>
            </div>
          </div>

          {/* Rules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRules.map((rule) => {
              const isColumnMissingInDataset = !datasetColsSet.has(rule.columnName);
              const fieldDef = getFieldDefinition(rule.columnName);

              return (
                <div
                  key={rule.ruleId}
                  className={`rounded-2xl border transition p-4 flex flex-col justify-between ${
                    isColumnMissingInDataset
                      ? 'bg-red-50 dark:bg-rose-950/20 border-red-300 dark:border-rose-500/50 shadow-sm'
                      : rule.enabled
                      ? 'bg-white dark:bg-[#131418] border-slate-200 dark:border-[#242630] hover:border-slate-300 dark:hover:border-zinc-700 shadow-sm'
                      : 'bg-slate-50 dark:bg-[#0b0c0e] border-slate-200 dark:border-[#242630]/60 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          rule.severity === 'CRITICAL'
                            ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30'
                            : rule.severity === 'ERROR'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
                            : 'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30'
                        }`}>
                          {rule.severity}
                        </span>
                        <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-transparent">
                          {rule.ruleType}
                        </span>
                      </div>

                      {/* Toggle Switch */}
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={() => onToggleRule(rule.ruleId)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-slate-200 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#e31b23]"></div>
                      </label>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                      {rule.ruleName}
                    </h4>

                    {isColumnMissingInDataset && (
                      <div className="my-1.5 p-1.5 rounded-lg bg-red-50 dark:bg-red-500/20 border border-red-200 dark:border-red-500/30 text-[11px] text-red-700 dark:text-red-300 flex items-center space-x-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Schema Drift: Column absent from active file</span>
                      </div>
                    )}

                    <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-2 mb-3">
                      {rule.description}
                    </p>

                    {/* Generic Field Meaning Callout on the Card */}
                    <div className="mb-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#0e0f13] border border-slate-200 dark:border-[#242630] text-xs">
                      <div className="flex items-center space-x-1.5 text-red-600 dark:text-red-400 font-semibold text-[11px]">
                        <Info className="w-3.5 h-3.5 text-red-600 dark:text-red-500 shrink-0" />
                        <span>Field Meaning ({fieldDef.displayName}):</span>
                      </div>
                      <p className="text-slate-700 dark:text-zinc-300 text-[11px] mt-0.5 leading-relaxed">
                        {fieldDef.plainMeaning}
                      </p>
                      <div className="mt-1 text-[10px] text-slate-500 dark:text-zinc-400">
                        <span className="font-semibold text-slate-700 dark:text-zinc-500">Valid format/values:</span> {fieldDef.acceptableValues}
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs font-mono bg-slate-50 dark:bg-[#0e0f13] p-2.5 rounded-xl border border-slate-200 dark:border-[#242630]">
                      <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                        <span>Target Column:</span>
                        <span className="text-[#e31b23] dark:text-red-400 font-bold">{rule.columnName}</span>
                      </div>
                      {rule.parameter && (
                        <div className="flex justify-between text-zinc-400">
                          <span>Condition / Param:</span>
                          <span className="text-zinc-200 truncate max-w-[140px]" title={rule.parameter}>
                            {rule.parameter}
                          </span>
                        </div>
                      )}
                      {rule.crossFieldConfig && (
                        <div className="flex justify-between text-zinc-400">
                          <span>Comparison:</span>
                          <span className="text-zinc-200">
                            {rule.crossFieldConfig.operator} {rule.crossFieldConfig.secondColumn}
                          </span>
                        </div>
                      )}
                      {rule.referenceList && (
                        <div>
                          <div className="flex justify-between text-zinc-400 mb-1">
                            <span>Registry Scope:</span>
                            <span className="text-emerald-400 font-bold">
                              {rule.referenceList.length} Approved Codes
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pt-1">
                            {rule.referenceList.map((code) => (
                              <span key={code} className="px-1.5 py-0.2 rounded text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700">
                                {code}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#242630] flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500">{rule.category}</span>
                    <div className="flex items-center space-x-2">
                      {rule.ruleType === 'REFERENTIAL_INTEGRITY' && (
                        <button
                          onClick={() => setSubTab('departments')}
                          className="text-xs text-red-400 hover:text-red-300 cursor-pointer"
                        >
                          View Directory &rarr;
                        </button>
                      )}
                      <button
                        onClick={() => onDeleteRule(rule.ruleId)}
                        className="p-1 text-zinc-500 hover:text-red-400 transition cursor-pointer"
                        title="Remove Rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: GENERIC DATA DICTIONARY & FIELD MEANINGS */}
      {subTab === 'dictionary' && (
        <div className="space-y-6">
          {/* Header Explanation */}
          <div className="p-5 rounded-2xl bg-[#131418]/90 border border-red-500/30">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 rounded-xl bg-red-600/20 text-red-400 shrink-0 mt-0.5">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-white">
                  Dataset Field Dictionary: Plain-English Meanings &amp; Acceptable Data Standards
                </h4>
                <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                  Every field in your dataset corresponds to a specific real-world entity. Even when different fields contain the exact same numeric value (such as <span className="font-mono font-bold text-amber-300 bg-amber-400/10 px-1 py-0.5 rounded">120</span>), each field has distinct boundaries for what makes that number valid or invalid.
                </p>
              </div>
            </div>

            {/* Cross-Field Disambiguation Callout: Why value 120 means different things */}
            <div className="mt-4 p-4 rounded-xl bg-[#0e0f13] border border-[#242630]">
              <div className="flex items-center space-x-2 text-xs font-bold text-amber-400 mb-2">
                <Hash className="w-4 h-4" />
                <span>Example: How the Same Number (120) Differs Across Fields</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-[#14151a] border border-[#242630]">
                  <span className="font-mono text-red-400 font-bold block">department_id = 120</span>
                  <p className="text-[11px] text-zinc-300 mt-1">
                    Represents <strong className="text-emerald-400">Customer Success &amp; Tier-3 Support</strong> in the 16-department corporate registry.
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-[#14151a] border border-[#242630]">
                  <span className="font-mono text-red-400 font-bold block">quantity = 120</span>
                  <p className="text-[11px] text-zinc-300 mt-1">
                    Represents <strong className="text-emerald-400">120 physical units</strong> manufactured or shipped in this production lot.
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-[#14151a] border border-[#242630]">
                  <span className="font-mono text-red-400 font-bold block">total_amount = 120</span>
                  <p className="text-[11px] text-zinc-300 mt-1">
                    Represents <strong className="text-emerald-400">$120.00 USD</strong> invoice value for customer purchases.
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-[#14151a] border border-[#242630]">
                  <span className="font-mono text-red-400 font-bold block">salary = 120</span>
                  <p className="text-[11px] text-zinc-300 mt-1">
                    Represents <strong className="text-rose-400">$120/month</strong> (an abnormally low wage that triggers data validation review).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Search dictionary fields */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-full max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search field meanings, acceptable values, or examples..."
                value={dictSearchTerm}
                onChange={(e) => setDictSearchTerm(e.target.value)}
                className="w-full bg-[#0b0c0e] border border-[#242630] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/30"
              />
            </div>

            <div className="text-xs text-zinc-400">
              Showing {dataset.columns.length} columns in current active schema
            </div>
          </div>

          {/* All Columns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dataset.columns
              .map(col => getFieldDefinition(col))
              .filter(def => {
                if (!dictSearchTerm.trim()) return true;
                const term = dictSearchTerm.toLowerCase();
                return (
                  def.columnName.toLowerCase().includes(term) ||
                  def.displayName.toLowerCase().includes(term) ||
                  def.plainMeaning.toLowerCase().includes(term) ||
                  def.acceptableValues.toLowerCase().includes(term)
                );
              })
              .map(def => {
                const colRules = rules.filter(r => r.columnName === def.columnName && r.enabled);

                return (
                  <div
                    key={def.columnName}
                    className="p-5 rounded-2xl bg-[#131418]/90 border border-[#242630] hover:border-red-600/40 transition flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-sm font-bold text-red-400">
                              {def.columnName}
                            </span>
                            <span className="text-xs text-zinc-400 font-sans">
                              ({def.displayName})
                            </span>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#14151a] text-zinc-300 border border-[#242630]">
                          {colRules.length} rule{colRules.length !== 1 ? 's' : ''} active
                        </span>
                      </div>

                      {/* Plain-English Meaning */}
                      <div className="mt-3">
                        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                          What this field means:
                        </span>
                        <p className="text-xs text-zinc-200 mt-1 leading-relaxed">
                          {def.plainMeaning}
                        </p>
                      </div>

                      {/* What makes values valid */}
                      <div className="mt-3 p-2.5 rounded-xl bg-[#0e0f13] border border-[#242630] space-y-2 text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                            Acceptable Values &amp; Numbers:
                          </span>
                          <span className="text-zinc-300 font-mono text-[11px]">
                            {def.acceptableValues}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                            Example of a Good Value:
                          </span>
                          <span className="text-emerald-400 font-mono font-bold text-[11px]">
                            {def.exampleGoodValue}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                            Why it matters:
                          </span>
                          <span className="text-zinc-400 text-[11px]">
                            {def.whyItMatters}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-[#242630] flex items-center justify-between text-xs">
                      <div className="flex flex-wrap gap-1">
                        {colRules.map(r => (
                          <span key={r.ruleId} className="px-2 py-0.5 rounded text-[10px] bg-red-500/10 text-red-300 border border-red-500/30 font-mono">
                            {r.ruleType}
                          </span>
                        ))}
                      </div>

                      <button
                        onClick={() => {
                          setColumnName(def.columnName);
                          setRuleName(`Rule for ${def.displayName}`);
                          setIsAddModalOpen(true);
                        }}
                        className="inline-flex items-center space-x-1 text-xs text-red-400 hover:text-red-300 font-semibold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Rule</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* VIEW 3: ENTERPRISE DEPARTMENT REGISTRY */}
      {subTab === 'departments' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#131418]/90 border border-[#242630] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-red-500" />
                <span>Enterprise Department Referential Registry</span>
              </h4>
              <p className="text-xs text-zinc-400 mt-1">
                Approved master directory for referential integrity checking on <code className="text-red-400 font-mono">department_id</code>. Records with unknown department numbers (such as 99) are flagged as referential violations.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 rounded-full text-xs font-mono bg-red-500/20 text-red-300 border border-red-500/30">
                {departments.length} Approved Departments
              </span>
            </div>
          </div>

          {/* Search & Add Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search department code or title..."
                value={deptSearchTerm}
                onChange={(e) => setDeptSearchTerm(e.target.value)}
                className="w-full bg-[#0b0c0e] border border-[#242630] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/30"
              />
            </div>

            <form onSubmit={handleAddNewDepartment} className="flex items-center gap-2 w-full sm:w-auto text-xs">
              <input
                type="text"
                required
                placeholder="Code (e.g. 170)"
                value={newDeptCode}
                onChange={(e) => setNewDeptCode(e.target.value)}
                className="w-28 bg-[#0b0c0e] border border-[#242630] rounded-xl px-2.5 py-2 text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-red-600"
              />
              <input
                type="text"
                required
                placeholder="Department Name..."
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                className="w-48 bg-[#0b0c0e] border border-[#242630] rounded-xl px-2.5 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-red-600"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-[#e31b23] hover:bg-[#c41219] text-white font-semibold transition cursor-pointer shrink-0 border border-red-500/30"
              >
                Add Unit
              </button>
            </form>
          </div>

          {/* Departments Table */}
          <div className="bg-[#131418]/90 border border-[#242630] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#0b0c0e] text-zinc-400 font-mono text-[11px] border-b border-[#242630] sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4">Code</th>
                    <th className="py-2.5 px-4">Department Title</th>
                    <th className="py-2.5 px-4">Division</th>
                    <th className="py-2.5 px-4">Cost Center</th>
                    <th className="py-2.5 px-4">Department Head</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#242630] text-zinc-300 font-mono">
                  {filteredDepts.map((d: DepartmentReference) => (
                    <tr key={d.code} className="hover:bg-zinc-800/40 transition">
                      <td className="py-2.5 px-4 font-bold text-red-400">
                        {d.code}
                      </td>
                      <td className="py-2.5 px-4 font-sans font-medium text-white">
                        {d.name}
                      </td>
                      <td className="py-2.5 px-4 font-sans text-slate-400">
                        {d.division}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400">
                        {d.costCenter}
                      </td>
                      <td className="py-2.5 px-4 font-sans text-slate-400">
                        {d.headOfDepartment}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Department directory modal */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#131418] border border-[#242630] rounded-3xl max-w-4xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col justify-between">
            {/* Header */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#242630]">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-red-600/20 border border-red-500/30 text-red-500">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center space-x-2">
                      <span>Enterprise Department Referential Registry</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-red-500/20 text-red-300 border border-red-500/30">
                        {departments.length} Approved Units
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Full enterprise master lookup. Values in <code className="text-red-400 font-mono">department_id</code> must match one of these approved codes.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsDeptModalOpen(false)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Controls: Search & Add */}
              <div className="my-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search departments or codes..."
                    value={deptSearchTerm}
                    onChange={(e) => setDeptSearchTerm(e.target.value)}
                    className="w-full bg-[#0b0c0e] border border-[#242630] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/30"
                  />
                </div>

                {/* Add new department inline */}
                <form onSubmit={handleAddNewDepartment} className="flex items-center gap-2 w-full sm:w-auto text-xs">
                  <input
                    type="text"
                    required
                    placeholder="Code (e.g. 170)"
                    value={newDeptCode}
                    onChange={(e) => setNewDeptCode(e.target.value)}
                    className="w-24 bg-[#0b0c0e] border border-[#242630] rounded-xl px-2.5 py-1.5 text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-red-600"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Department Name"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    className="w-44 bg-[#0b0c0e] border border-[#242630] rounded-xl px-2.5 py-1.5 text-white placeholder-zinc-500 focus:outline-none focus:border-red-600"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-[#e31b23] hover:bg-[#c41219] text-white font-semibold flex items-center space-x-1 cursor-pointer border border-red-500/30"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Unit</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Department Table (Expanded Size) */}
            <div className="overflow-y-auto max-h-[420px] rounded-2xl border border-[#242630] bg-[#0b0c0e]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#0e0f13] text-zinc-300 font-mono text-[11px] border-b border-[#242630] sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">Dept Code</th>
                    <th className="py-2.5 px-3">Department Title</th>
                    <th className="py-2.5 px-3">Division</th>
                    <th className="py-2.5 px-3">Cost Center</th>
                    <th className="py-2.5 px-3">Leadership Head</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#242630] text-zinc-300 font-mono">
                  {filteredDepts.map((d: DepartmentReference) => (
                    <tr key={d.code} className="hover:bg-zinc-800/40 transition">
                      <td className="py-2.5 px-3 font-bold text-red-400">
                        {d.code}
                      </td>
                      <td className="py-2.5 px-3 font-sans font-medium text-white">
                        {d.name}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-400">
                        {d.division}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-400">
                        {d.costCenter}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-400 font-sans">
                        {d.headOfDepartment}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                          <Check className="w-3 h-3" />
                          <span>Approved</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="pt-4 mt-3 border-t border-[#242630] flex items-center justify-between text-xs text-zinc-400">
              <span>
                Showing {filteredDepts.length} of {departments.length} authorized business units in registry
              </span>
              <button
                onClick={() => setIsDeptModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Rule Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131418] border border-[#242630] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-white mb-1 flex items-center space-x-2">
              <Plus className="w-4 h-4 text-red-500" />
              <span>Define New Quality Rule</span>
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Configure deterministic validation logic for a dataset column.
            </p>

            <form onSubmit={handleCreateRule} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Valid Postal Code, Positive Inventory..."
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="w-full bg-[#0b0c0e] border border-[#242630] rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Target Column</label>
                  <select
                    value={columnName}
                    onChange={(e) => setColumnName(e.target.value)}
                    className="w-full bg-[#0b0c0e] border border-[#242630] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-600 cursor-pointer"
                  >
                    {dataset.columns.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Rule Type</label>
                  <select
                    value={ruleType}
                    onChange={(e) => setRuleType(e.target.value as RuleType)}
                    className="w-full bg-[#0b0c0e] border border-[#242630] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-600 cursor-pointer"
                  >
                    <option value="REQUIRED">REQUIRED (Cannot be empty)</option>
                    <option value="UNIQUE">UNIQUE (No duplicates)</option>
                    <option value="MIN_VALUE">MIN_VALUE (Lower bound)</option>
                    <option value="MAX_VALUE">MAX_VALUE (Upper bound)</option>
                    <option value="FORMAT">FORMAT (Regex pattern)</option>
                    <option value="ALLOWED_VALUES">ALLOWED_VALUES (Whitelist)</option>
                    <option value="CROSS_FIELD">CROSS_FIELD (Relational check)</option>
                    <option value="REFERENTIAL_INTEGRITY">REFERENTIAL_INTEGRITY (FK lookup)</option>
                  </select>
                </div>
              </div>

              {(ruleType === 'MIN_VALUE' || ruleType === 'MAX_VALUE') && (
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Numeric Bound Threshold
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 0, 1, 1000"
                    value={parameter}
                    onChange={(e) => setParameter(e.target.value)}
                    className="w-full bg-[#0b0c0e] border border-[#242630] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-600 font-mono"
                  />
                </div>
              )}

              {ruleType === 'FORMAT' && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-zinc-300 font-medium">Regular Expression Pattern</label>
                    <span className="text-[10px] text-red-400">RFC format standard</span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
                    value={parameter}
                    onChange={(e) => setParameter(e.target.value)}
                    className="w-full bg-[#0b0c0e] border border-[#242630] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-600 font-mono"
                  />
                </div>
              )}

              {ruleType === 'ALLOWED_VALUES' && (
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Allowed Values (Comma-separated)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Active, Inactive, Pending, Archived"
                    value={parameter}
                    onChange={(e) => setParameter(e.target.value)}
                    className="w-full bg-[#0b0c0e] border border-[#242630] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-600 font-mono"
                  />
                </div>
              )}

              {ruleType === 'REFERENTIAL_INTEGRITY' && (
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Approved Reference Data Values (Comma-separated or leave empty for full department registry)
                  </label>
                  <input
                    type="text"
                    placeholder={`Defaults to all ${departments.length} departments: ${departments.slice(0, 5).map((d: DepartmentReference) => d.code).join(', ')}...`}
                    value={parameter}
                    onChange={(e) => setParameter(e.target.value)}
                    className="w-full bg-[#0b0c0e] border border-[#242630] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-600 font-mono"
                  />
                </div>
              )}

              {ruleType === 'CROSS_FIELD' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-[#0e0f13] rounded-xl border border-[#242630]">
                  <div>
                    <label className="block text-zinc-400 mb-1">Condition Operator</label>
                    <select
                      value={crossOperator}
                      onChange={(e) => setCrossOperator(e.target.value as any)}
                      className="w-full bg-[#0b0c0e] border border-[#242630] rounded-lg px-2 py-1.5 text-white"
                    >
                      <option value="GREATER_EQUAL">&gt;= (Greater or Equal)</option>
                      <option value="GREATER_THAN">&gt; (Greater Than)</option>
                      <option value="LESS_EQUAL">&lt;= (Less or Equal)</option>
                      <option value="LESS_THAN">&lt; (Less Than)</option>
                      <option value="EQUALS">== (Equals)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Compare With Column</label>
                    <select
                      value={crossSecondCol}
                      onChange={(e) => setCrossSecondCol(e.target.value)}
                      className="w-full bg-[#0b0c0e] border border-[#242630] rounded-lg px-2 py-1.5 text-white"
                    >
                      {dataset.columns.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Severity Classification</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as Severity)}
                    className="w-full bg-[#0b0c0e] border border-[#242630] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-600 font-mono text-xs"
                  >
                    <option value="CRITICAL">CRITICAL (Halts processing / Fatal PK or missing identity)</option>
                    <option value="ERROR">ERROR (Business defect / Format or domain check violation)</option>
                    <option value="WARNING">WARNING (Anomaly / 1NF non-atomic multi-value warning)</option>
                    <option value="INFO">INFO (Notice / Formatting recommendation)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Description</label>
                  <input
                    type="text"
                    placeholder="Short explanation for audit log"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[#0b0c0e] border border-[#242630] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-[#242630]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#e31b23] hover:bg-[#c41219] text-white font-semibold shadow-md shadow-red-950/50 transition cursor-pointer border border-red-500/30"
                >
                  Save &amp; Activate Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

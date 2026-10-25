import React, { useState } from 'react';
import { 
  X, 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Search, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight,
  Sliders,
  Database,
  Layers,
  Building2,
  DollarSign,
  User,
  Mail,
  Calendar,
  Package
} from 'lucide-react';
import { Dataset, ValidationRule } from '../types';
import { disambiguateValueAcrossColumns } from '../services/semanticDisambiguator';

interface ContextualDisambiguatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset;
  rules: ValidationRule[];
  initialValue?: string;
}

export const ContextualDisambiguatorModal: React.FC<ContextualDisambiguatorModalProps> = ({
  isOpen,
  onClose,
  dataset,
  rules,
  initialValue = '120'
}) => {
  if (!isOpen) return null;

  const [testValue, setTestValue] = useState<string>(initialValue);

  const disambiguationResult = disambiguateValueAcrossColumns(
    testValue || '120',
    dataset,
    rules
  );

  const sampleValues = ['120', '10', '102', '0', '-5000', 'Approved', 'priya@example.com'];

  const getDomainIcon = (domainType: string) => {
    switch (domainType) {
      case 'DEPARTMENT_CODE': return <Building2 className="w-4 h-4 text-indigo-400" />;
      case 'MONETARY_AMOUNT': return <DollarSign className="w-4 h-4 text-emerald-400" />;
      case 'PERSONNEL_ID': return <User className="w-4 h-4 text-blue-400" />;
      case 'EMAIL_RFC': return <Mail className="w-4 h-4 text-cyan-400" />;
      case 'PHYSICAL_QUANTITY': return <Package className="w-4 h-4 text-amber-400" />;
      case 'DATE_CHRONO': return <Calendar className="w-4 h-4 text-purple-400" />;
      default: return <Database className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-slate-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-600/30">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-white">
                    Contextual Value Disambiguator &amp; Domain Scoper
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Semantic Column Resolver
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  How SilentGuard recognizes what a shared value (like &lsquo;120&rsquo;) means across different columns.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Core Concept Banner */}
          <div className="my-4 p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 text-xs">
            <div className="flex items-start space-x-3">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-white">
                  Why does a value like &lsquo;120&rsquo; behave differently in different fields?
                </span>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Raw primitive values have <strong>no universal meaning</strong>. The value <code className="text-indigo-300 font-mono font-bold">120</code> in <code className="text-indigo-300 font-mono font-bold">department_id</code> maps to <em>Customer Success</em>, whereas in <code className="text-indigo-300 font-mono font-bold">salary</code> it indicates a sub-minimum wage error, and in <code className="text-indigo-300 font-mono font-bold">status</code> it is illegal. SilentGuard enforces <strong>Column-Scoped Semantic Domains</strong> so rules never bleed into unrelated fields.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Value Tester & Presets */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center space-x-2 flex-1">
              <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Test Value:</span>
              <div className="relative flex-1 max-w-xs">
                <input
                  type="text"
                  value={testValue}
                  onChange={(e) => setTestValue(e.target.value)}
                  placeholder="Enter a value to test (e.g. 120)..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
              <span className="text-slate-500 text-[11px]">Quick samples:</span>
              {sampleValues.map((v) => (
                <button
                  key={v}
                  onClick={() => setTestValue(v)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition cursor-pointer ${
                    testValue === v
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Column-by-Column Evaluation Grid */}
        <div className="overflow-y-auto max-h-[440px] pr-1 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {disambiguationResult.evaluations.map((ev) => (
              <div
                key={ev.columnName}
                className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                  ev.verdict === 'VALID'
                    ? 'bg-slate-900/90 border-emerald-500/30'
                    : ev.verdict === 'INVALID'
                    ? 'bg-slate-900/90 border-rose-500/40'
                    : 'bg-slate-900/90 border-amber-500/40'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                        {getDomainIcon(ev.domainType)}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">
                          Column: <span className="text-indigo-400 font-mono">{ev.columnName}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          Domain: {ev.domainLabel}
                        </span>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      ev.verdict === 'VALID'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : ev.verdict === 'INVALID'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {ev.verdict} in this field
                    </span>
                  </div>

                  {/* Contextual Meaning */}
                  {ev.semanticMeaning && (
                    <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 my-2 text-xs font-mono">
                      <span className="text-slate-500 text-[10px] block">INTERPRETED SEMANTIC MEANING:</span>
                      <span className={`font-semibold ${
                        ev.verdict === 'VALID' ? 'text-emerald-300' : 'text-slate-200'
                      }`}>
                        {ev.semanticMeaning}
                      </span>
                    </div>
                  )}

                  {/* Reasoning */}
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {ev.reasoning}
                  </p>
                </div>

                {/* Scope & Governing Rule */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Scope: {ev.scopeNamespace}</span>
                  {ev.activeRuleName && (
                    <span className="text-indigo-300 truncate max-w-[150px]" title={ev.activeRuleName}>
                      [{ev.activeRuleName}]
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 mt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>
              Values are strictly isolated to their column schema contract. No cross-field contamination.
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

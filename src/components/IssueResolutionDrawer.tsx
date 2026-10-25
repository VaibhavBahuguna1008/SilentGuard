import React, { useState } from 'react';
import { 
  X, 
  ShieldAlert, 
  CheckCircle, 
  Clock, 
  User, 
  MessageSquare, 
  AlertTriangle,
  History,
  Send
} from 'lucide-react';
import { ValidationIssue, ResolutionStatus, ResolutionHistory } from '../types';
import { getFieldDefinition, MASTER_DEPARTMENT_CATALOG } from '../data/mockDatasets';

interface IssueResolutionDrawerProps {
  issue: ValidationIssue | null;
  onClose: () => void;
  resolutionHistories: ResolutionHistory[];
  onUpdateResolution: (issueId: string, status: ResolutionStatus, comment: string) => void;
}

export const IssueResolutionDrawer: React.FC<IssueResolutionDrawerProps> = ({
  issue,
  onClose,
  resolutionHistories,
  onUpdateResolution
}) => {
  if (!issue) return null;

  const [selectedStatus, setSelectedStatus] = useState<ResolutionStatus>(issue.resolutionStatus);
  const [comment, setComment] = useState('');

  const issueHistories = resolutionHistories.filter(h => h.issueId === issue.issueId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    onUpdateResolution(issue.issueId, selectedStatus, comment.trim());
    setComment('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-xl bg-[#0f172a] border-l border-slate-800 h-full overflow-y-auto p-6 shadow-2xl flex flex-col justify-between">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase ${
                issue.severity === 'CRITICAL'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : issue.severity === 'ERROR'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              }`}>
                {issue.severity}
              </span>
              <span className="text-xs font-mono text-slate-400">
                {issue.issueId}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Title & Core Details with Plain-English Badges */}
          <div className="mt-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <span>{issue.ruleName}</span>
            </h3>

            {/* Plain English "What's Wrong" Callout */}
            <div className="mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300 block">
                    What is Wrong:
                  </span>
                  <p className="text-sm font-semibold text-white mt-0.5">
                    {issue.simpleProblem || issue.errorMessage}
                  </p>
                  <p className="text-xs text-rose-300/80 mt-1">
                    {issue.errorMessage}
                  </p>
                </div>
              </div>
            </div>

            {/* Plain English "How to Fix" Callout */}
            <div className="mt-2.5 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 block">
                    Recommended Fix:
                  </span>
                  <p className="text-xs font-semibold text-emerald-100 mt-0.5">
                    {issue.simpleFix || 'Correct this cell to conform to data quality expectations'}
                  </p>
                </div>
              </div>
            </div>

            {/* Field Meaning & Business Purpose */}
            {(() => {
              const fieldDef = getFieldDefinition(issue.columnName);
              return (
                <div className="mt-3 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                  <div className="flex items-center space-x-1.5 text-indigo-300 font-bold mb-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                    <span>Field Meaning ({fieldDef.displayName}):</span>
                  </div>
                  <p className="text-slate-300">
                    {fieldDef.plainMeaning}
                  </p>
                  <div className="mt-2 pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Valid values:</span>
                      <span className="text-slate-300 font-mono">{fieldDef.acceptableValues}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Good example:</span>
                      <span className="text-emerald-400 font-mono font-bold">{fieldDef.exampleGoodValue}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Technical Specs */}
          <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-mono">
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px]">RECORD POSITION</span>
              <span className="text-white font-bold">Row #{issue.rowNumber}</span>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px]">TARGET COLUMN</span>
              <span className="text-indigo-400 font-bold">{issue.columnName}</span>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px]">OBSERVED CELL VALUE</span>
              <span className="text-rose-300 font-bold font-mono">{issue.foundValue}</span>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px]">RULE CATEGORY</span>
              <span className="text-slate-300">{issue.category}</span>
            </div>
          </div>

          {/* Number Context & Disambiguation Card if value is a number or contains digits */}
          {(!isNaN(parseFloat(issue.foundValue)) || issue.foundValue.includes('-')) && (
            <div className="mt-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
              <span className="text-amber-400 font-bold block mb-1">
                Number Explanation in Context:
              </span>
              <p className="text-slate-300 text-[11px]">
                {issue.columnName.toLowerCase().includes('salary') && `In the 'salary' field, '${issue.foundValue}' represents monthly compensation. Because pay cannot be negative, '-5000' is flagged as corrupt. Real employee pay must be a positive number (e.g. 52,000).`}
                {issue.columnName.toLowerCase().includes('quantity') && `In the 'quantity' field, '${issue.foundValue}' represents physical manufactured parts. Negative or zero counts cannot be shipped. Change to actual production quantity (e.g. 120 units).`}
                {issue.columnName.toLowerCase().includes('dept') && `In the 'department_id' field, '${issue.foundValue}' is interpreted as a department code. Code 99 does not exist in the company directory. Use an approved code like 10, 20, 30, 40, or 120.`}
                {issue.columnName.toLowerCase().includes('emp') && `In the 'employee_id' field, '${issue.foundValue}' is an identification badge number. Worker IDs must be unique across all employee records.`}
                {!issue.columnName.toLowerCase().includes('salary') && !issue.columnName.toLowerCase().includes('quantity') && !issue.columnName.toLowerCase().includes('dept') && !issue.columnName.toLowerCase().includes('emp') && `In '${issue.columnName}', '${issue.foundValue}' violates the configured constraints for this column.`}
              </p>
            </div>
          )}

          <div className="mt-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-xs font-mono">
            <span className="text-slate-500 block text-[10px]">EXPECTED CONDITION</span>
            <span className="text-emerald-400">{issue.expectedCondition}</span>
          </div>

          {issue.ruleType === 'REFERENTIAL_INTEGRITY' && (
            <div className="mt-3 bg-indigo-950/20 p-3 rounded-xl border border-indigo-500/30 text-xs">
              <span className="text-indigo-300 font-bold block mb-1.5 flex items-center space-x-1">
                <span>Enterprise Department Registry ({MASTER_DEPARTMENT_CATALOG.length} Departments):</span>
              </span>
              <p className="text-slate-400 text-[11px] mb-2">
                Replace invalid code <code className="text-rose-400 font-mono font-bold">{issue.foundValue}</code> with an approved department:
              </p>
              <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-1 text-[11px] font-mono">
                {MASTER_DEPARTMENT_CATALOG.map(d => (
                  <button
                    key={d.code}
                    type="button"
                    onClick={() => {
                      setComment(`Recommend updating department_id from '${issue.foundValue}' to '${d.code}' (${d.name}) in source HRIS.`);
                      setSelectedStatus('IN_REVIEW');
                    }}
                    className="p-1 rounded bg-slate-900 border border-slate-800 hover:border-indigo-500 text-left text-slate-300 hover:text-white cursor-pointer transition truncate"
                  >
                    <span className="text-indigo-400 font-bold mr-1">{d.code}:</span>
                    <span>{d.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Full Row Context snapshot */}
          <div className="mt-5">
            <h4 className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider font-mono">
              Complete Record Snapshot
            </h4>
            <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 space-y-1.5 font-mono text-xs max-h-40 overflow-y-auto">
              {Object.entries(issue.rowData).map(([key, val]) => (
                <div key={key} className="flex justify-between py-1 border-b border-slate-900 last:border-none">
                  <span className={`text-slate-400 ${key === issue.columnName ? 'text-indigo-400 font-bold' : ''}`}>
                    {key}:
                  </span>
                  <span className={`text-right truncate max-w-[200px] ${key === issue.columnName ? 'text-rose-300 font-bold' : 'text-slate-200'}`}>
                    {val === '' ? '<EMPTY>' : val}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Resolution Audit Timeline */}
          <div className="mt-6">
            <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center space-x-1.5 font-mono">
              <History className="w-3.5 h-3.5 text-indigo-400" />
              <span>Resolution Audit History ({issueHistories.length})</span>
            </h4>

            {issueHistories.length === 0 ? (
              <p className="text-xs text-slate-500 italic bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                No resolution notes recorded yet. Status currently {issue.resolutionStatus}.
              </p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {issueHistories.map(h => (
                  <div key={h.resolutionId} className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span className="font-semibold text-slate-300 flex items-center space-x-1">
                        <User className="w-3 h-3 text-indigo-400" />
                        <span>{h.resolvedBy}</span>
                      </span>
                      <span className="font-mono">{new Date(h.updatedAt).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300">
                        {h.resolutionStatus}
                      </span>
                    </div>
                    <p className="text-slate-300 text-xs">{h.resolutionComment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Resolution Action Form */}
        <div className="mt-6 pt-4 border-t border-slate-800">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Update Resolution Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as ResolutionStatus)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer font-mono"
              >
                <option value="OPEN">OPEN (Unaddressed Exception)</option>
                <option value="IN_REVIEW">IN_REVIEW (Under QA Review)</option>
                <option value="FIXED_IN_SOURCE">FIXED_IN_SOURCE (Corrected in upstream file/source)</option>
                <option value="FALSE_POSITIVE">FALSE_POSITIVE (Rule exception verified)</option>
                <option value="WAIVED">WAIVED (Accepted business exception)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Audit Trail Comment / Action Log
              </label>
              <textarea
                required
                rows={3}
                placeholder="Detail the remedial action taken (e.g., 'Corrected salary to 52000 in SAP HR batch, confirmed with Priyanka')."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Record Resolution in Audit Log</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

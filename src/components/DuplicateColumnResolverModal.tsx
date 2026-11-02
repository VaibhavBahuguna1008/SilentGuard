import React, { useState, useMemo } from 'react';
import { 
  X, 
  GitMerge, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Layers, 
  Copy, 
  ShieldCheck,
  Columns
} from 'lucide-react';
import { Dataset } from '../types';

interface DuplicateColumnResolverModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset;
  initialColA?: string;
  initialColB?: string;
  onResolve: (updatedRecords: Record<string, string>[], updatedColumns: string[]) => void;
}

export const DuplicateColumnResolverModal: React.FC<DuplicateColumnResolverModalProps> = ({
  isOpen,
  onClose,
  dataset,
  initialColA,
  initialColB,
  onResolve
}) => {
  const [colA, setColA] = useState<string>(initialColA || dataset.columns[0] || '');
  const [colB, setColB] = useState<string>(
    initialColB || dataset.columns[1] || dataset.columns[0] || ''
  );
  const [resolutionMode, setResolutionMode] = useState<'KEEP_A' | 'KEEP_B' | 'MERGE_COALESCE' | 'RENAME_B'>('MERGE_COALESCE');
  const [renameValue, setRenameValue] = useState<string>(`${colB}_disambiguated`);

  // Detect potential duplicate/colliding columns in dataset
  const potentialDuplicates = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const c of dataset.columns) {
      // Normalize: lower case and strip trailing _2, _copy, etc.
      const normalized = c.toLowerCase().replace(/(_\d+|_copy|_backup)$/, '');
      if (!map.has(normalized)) map.set(normalized, []);
      map.get(normalized)!.push(c);
    }
    const dups: Array<{ key: string; columns: string[] }> = [];
    for (const [key, cols] of map.entries()) {
      if (cols.length > 1) dups.push({ key, columns: cols });
    }
    return dups;
  }, [dataset.columns]);

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Statistics for Col A and Col B
  const stats = useMemo(() => {
    if (!colA || !colB || colA === colB) return null;

    let filledA = 0;
    let filledB = 0;
    let exactMatches = 0;
    let conflicting = 0;
    let aEmptyBHas = 0;
    let bEmptyAHas = 0;

    dataset.rawData.forEach(row => {
      const valA = (row[colA] || '').trim();
      const valB = (row[colB] || '').trim();

      if (valA !== '') filledA++;
      if (valB !== '') filledB++;

      if (valA !== '' && valB !== '') {
        if (valA === valB) exactMatches++;
        else conflicting++;
      } else if (valA === '' && valB !== '') {
        aEmptyBHas++;
      } else if (valB === '' && valA !== '') {
        bEmptyAHas++;
      }
    });

    return {
      totalRows: dataset.rowCount,
      filledA,
      filledB,
      exactMatches,
      conflicting,
      aEmptyBHas,
      bEmptyAHas
    };
  }, [colA, colB, dataset.rawData, dataset.rowCount]);

  if (!isOpen) return null;

  const handleApplyResolution = () => {
    if (!colA || !colB || colA === colB) return;

    let updatedCols = [...dataset.columns];
    let updatedRecords: Record<string, string>[] = [];

    if (resolutionMode === 'KEEP_A') {
      // Drop Col B
      updatedCols = updatedCols.filter(c => c !== colB);
      updatedRecords = dataset.rawData.map(row => {
        const copy = { ...row };
        delete copy[colB];
        return copy;
      });
    } else if (resolutionMode === 'KEEP_B') {
      // Drop Col A
      updatedCols = updatedCols.filter(c => c !== colA);
      updatedRecords = dataset.rawData.map(row => {
        const copy = { ...row };
        delete copy[colA];
        return copy;
      });
    } else if (resolutionMode === 'MERGE_COALESCE') {
      // Coalesce: Keep Col A, fill any empty cells from Col B, then drop Col B
      updatedCols = updatedCols.filter(c => c !== colB);
      updatedRecords = dataset.rawData.map(row => {
        const copy = { ...row };
        const valA = (copy[colA] || '').trim();
        const valB = (copy[colB] || '').trim();
        if (valA === '' && valB !== '') {
          copy[colA] = valB;
        }
        delete copy[colB];
        return copy;
      });
    } else if (resolutionMode === 'RENAME_B') {
      // Rename Col B
      const newName = renameValue.trim() || `${colB}_alt`;
      updatedCols = updatedCols.map(c => c === colB ? newName : c);
      updatedRecords = dataset.rawData.map(row => {
        const copy = { ...row };
        copy[newName] = copy[colB];
        delete copy[colB];
        return copy;
      });
    }

    onResolve(updatedRecords, updatedCols);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Sticky Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-[#0f172a] shrink-0 z-20">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Columns className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Duplicate &amp; Colliding Columns Resolver</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                  Schema Integrity
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Compare two identical or duplicate columns side-by-side, inspect value discrepancies, and choose a resolution strategy.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Close / Cancel (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-1 pr-3 space-y-4">

        {/* Potential Duplicates Quick Selectors */}
        {potentialDuplicates.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-300 block mb-1.5">
              Detected Similar / Colliding Column Pairs:
            </span>
            <div className="flex flex-wrap gap-2">
              {potentialDuplicates.map(({ key, columns }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setColA(columns[0]);
                    setColB(columns[1]);
                    setRenameValue(`${columns[1]}_distinct`);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 text-[11px] font-mono cursor-pointer transition"
                >
                  {columns.join(' ↔ ')}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Column Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
            <label className="block text-xs font-bold text-indigo-300 mb-1">
              Primary Column (Column A)
            </label>
            <select
              value={colA}
              onChange={(e) => setColA(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono text-xs cursor-pointer focus:outline-none focus:border-indigo-500"
            >
              {dataset.columns.map(c => (
                <option key={c} value={c} disabled={c === colB}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
            <label className="block text-xs font-bold text-amber-300 mb-1">
              Secondary / Colliding Column (Column B)
            </label>
            <select
              value={colB}
              onChange={(e) => {
                setColB(e.target.value);
                setRenameValue(`${e.target.value}_distinct`);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono text-xs cursor-pointer focus:outline-none focus:border-amber-500"
            >
              {dataset.columns.map(c => (
                <option key={c} value={c} disabled={c === colA}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Statistics & Comparison Bar */}
        {stats && (
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 mb-5 space-y-3">
            <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
              <span className="font-semibold text-slate-300">Comparison Metrics across {stats.totalRows} Records:</span>
              <span className="text-[11px] text-slate-400 font-mono">
                {colA} vs {colB}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Exact Matches</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">{stats.exactMatches}</span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Conflicting Values</span>
                <span className="text-sm font-bold text-rose-400 font-mono">{stats.conflicting}</span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Col A Empty, Col B Has</span>
                <span className="text-sm font-bold text-indigo-400 font-mono">{stats.aEmptyBHas}</span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Col B Empty, Col A Has</span>
                <span className="text-sm font-bold text-amber-400 font-mono">{stats.bEmptyAHas}</span>
              </div>
            </div>

            {/* Sample Table Preview */}
            <div className="overflow-x-auto max-h-36 border border-slate-800 rounded-lg text-[11px]">
              <table className="w-full text-left font-mono">
                <thead className="bg-slate-900 text-slate-400 text-[10px]">
                  <tr>
                    <th className="py-1 px-2.5">Row</th>
                    <th className="py-1 px-2.5 text-indigo-300">{colA}</th>
                    <th className="py-1 px-2.5 text-amber-300">{colB}</th>
                    <th className="py-1 px-2.5 text-slate-400">Match Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {dataset.rawData.slice(0, 5).map((row, idx) => {
                    const vA = (row[colA] || '').trim();
                    const vB = (row[colB] || '').trim();
                    const isSame = vA === vB && vA !== '';
                    const isConflict = vA !== '' && vB !== '' && vA !== vB;
                    return (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        <td className="py-1 px-2.5 text-slate-500">#{idx + 1}</td>
                        <td className="py-1 px-2.5 truncate max-w-[140px]">{vA || <span className="text-slate-600">&lt;empty&gt;</span>}</td>
                        <td className="py-1 px-2.5 truncate max-w-[140px]">{vB || <span className="text-slate-600">&lt;empty&gt;</span>}</td>
                        <td className="py-1 px-2.5">
                          {isSame && <span className="text-emerald-400 text-[10px]">Identical</span>}
                          {isConflict && <span className="text-rose-400 text-[10px]">Conflict</span>}
                          {!isSame && !isConflict && <span className="text-amber-400 text-[10px]">One Empty</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Resolution Options */}
        <div className="space-y-2.5 mb-6 text-xs">
          <label className="block text-slate-300 font-bold">
            Select Resolution Action:
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Merge / Coalesce */}
            <button
              type="button"
              onClick={() => setResolutionMode('MERGE_COALESCE')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                resolutionMode === 'MERGE_COALESCE'
                  ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-sm'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-bold text-emerald-400 mb-1">
                <GitMerge className="w-4 h-4" />
                <span>Merge (COALESCE)</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Keep <span className="font-mono text-indigo-300">{colA}</span> as primary, backfill empty cells from <span className="font-mono text-amber-300">{colB}</span>, then discard {colB}.
              </p>
            </button>

            {/* Rename B */}
            <button
              type="button"
              onClick={() => setResolutionMode('RENAME_B')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                resolutionMode === 'RENAME_B'
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-bold text-indigo-400 mb-1">
                <Copy className="w-4 h-4" />
                <span>Rename {colB} (Disambiguate)</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Retain both columns by giving {colB} a distinct unique name.
              </p>
            </button>

            {/* Keep A, Drop B */}
            <button
              type="button"
              onClick={() => setResolutionMode('KEEP_A')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                resolutionMode === 'KEEP_A'
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-bold text-slate-200 mb-1">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>Keep {colA}, Drop {colB}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Discard {colB} completely and keep {colA} as the authoritative source.
              </p>
            </button>

            {/* Keep B, Drop A */}
            <button
              type="button"
              onClick={() => setResolutionMode('KEEP_B')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                resolutionMode === 'KEEP_B'
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-bold text-slate-200 mb-1">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Keep {colB}, Drop {colA}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Discard {colA} completely and keep {colB} as the authoritative source.
              </p>
            </button>
          </div>

          {resolutionMode === 'RENAME_B' && (
            <div className="pt-2">
              <label className="block text-[11px] text-slate-400 mb-1">
                New Name for {colB}:
              </label>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Sticky Actions Footer */}
        <div className="flex items-center justify-between p-3.5 sm:px-6 border-t border-slate-800 bg-[#0b1120] shrink-0 z-20">
          <span className="text-[10px] text-slate-400 hidden sm:inline">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-slate-300">Esc</kbd> to cancel
          </span>
          <div className="flex items-center space-x-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyResolution}
              disabled={!colA || !colB || colA === colB}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold shadow-md shadow-indigo-600/30 transition flex items-center space-x-1.5 cursor-pointer text-xs"
            >
              <GitMerge className="w-4 h-4" />
              <span>Apply Column Resolution</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

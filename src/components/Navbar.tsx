import React from 'react';
import { 
  ShieldCheck, 
  UploadCloud, 
  Play, 
  BarChart3, 
  Table2, 
  Sliders, 
  History, 
  FileDown,
  Database,
  Activity
} from 'lucide-react';
import { Dataset, ValidationRun } from '../types';
import { BackendHealth } from '../services/api';

const PRESET_DEFINITIONS: Record<string, { label: string; presetId: string; description: string }> = {
  'employee_master_roster.csv': {
    label: 'HR & Employee Master',
    presetId: 'preset-employee',
    description: 'Human Resources & Roster Integrity'
  },
  'motherson_parts_batch_dispatch.csv': {
    label: 'Motherson Automotive Parts',
    presetId: 'preset-motherson-parts',
    description: 'Automotive Manufacturing & Dispatch'
  },
  'financial_orders.csv': {
    label: 'Financial Ledger & Orders',
    presetId: 'preset-financial-orders',
    description: 'Transactions & Currency Validation'
  }
};

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeDataset: Dataset | null;
  latestRun: ValidationRun | null;
  onOpenUpload: () => void;
  onOpenDisambiguator?: () => void;
  onRunValidation: () => void;
  isValidating: boolean;
  totalDatasetsCount: number;
  onSelectDataset: (id: string) => void;
  allDatasets: Dataset[];
  backendHealth?: BackendHealth | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  activeDataset,
  latestRun,
  onOpenUpload,
  onOpenDisambiguator,
  onRunValidation,
  isValidating,
  onSelectDataset,
  allDatasets,
  backendHealth
}) => {
  const issueCount = latestRun?.totalIssuesCount ?? 0;

  // Categorize and deduplicate datasets into Presets vs Uploaded/Database datasets
  const { presetDatasets, customDatasets } = React.useMemo(() => {
    const seenNames = new Set<string>();
    const presetsList: Array<{ datasetId: string; displayLabel: string; presetId: string }> = [];
    const customsList: Array<{ datasetId: string; displayLabel: string }> = [];

    allDatasets.forEach((ds) => {
      const nameKey = ds.fileName.trim().toLowerCase();
      if (seenNames.has(nameKey)) return;
      seenNames.add(nameKey);

      const matchedPreset = Object.entries(PRESET_DEFINITIONS).find(
        ([key]) => key.toLowerCase() === nameKey
      )?.[1];

      if (matchedPreset) {
        presetsList.push({
          datasetId: ds.datasetId,
          displayLabel: `✨ ${matchedPreset.label} (${ds.rowCount.toLocaleString()} rows)`,
          presetId: matchedPreset.presetId
        });
      } else {
        customsList.push({
          datasetId: ds.datasetId,
          displayLabel: `📁 ${ds.fileName} (${ds.rowCount.toLocaleString()} rows)`
        });
      }
    });

    // Ensure activeDataset is present
    if (activeDataset && !seenNames.has(activeDataset.fileName.trim().toLowerCase())) {
      const activeNameKey = activeDataset.fileName.trim().toLowerCase();
      const matchedPreset = Object.entries(PRESET_DEFINITIONS).find(
        ([key]) => key.toLowerCase() === activeNameKey
      )?.[1];

      if (matchedPreset) {
        presetsList.unshift({
          datasetId: activeDataset.datasetId,
          displayLabel: `✨ ${matchedPreset.label} (${activeDataset.rowCount.toLocaleString()} rows)`,
          presetId: matchedPreset.presetId
        });
      } else {
        customsList.unshift({
          datasetId: activeDataset.datasetId,
          displayLabel: `📁 ${activeDataset.fileName} (${activeDataset.rowCount.toLocaleString()} rows)`
        });
      }
    }

    return { presetDatasets: presetsList, customDatasets: customsList };
  }, [allDatasets, activeDataset]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, badge: issueCount > 0 ? issueCount : null },
    { id: 'explorer', label: 'Records & Exceptions', icon: Table2 },
    { id: 'rules', label: 'Rules & Dictionary', icon: Sliders },
    { id: 'history', label: 'Run History', icon: History },
    { id: 'export', label: 'Reports & Audit', icon: FileDown },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0b0f17]/95 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main top header */}
        <div className="flex items-center justify-between h-14">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/30">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-base tracking-tight text-white">
                Silent<span className="text-indigo-400">Guard</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                data quality engine
              </span>
            </div>

            {/* Backend connection badge */}
            <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono border border-slate-800 bg-slate-900/80">
              <span className={`w-2 h-2 rounded-full ${backendHealth ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              <span className="text-slate-300">
                {backendHealth ? 'PostgreSQL 16 Connected' : 'Connecting to API...'}
              </span>
            </div>
          </div>

          {/* Quick switcher and primary actions */}
          <div className="flex items-center gap-2">
            {(presetDatasets.length > 0 || customDatasets.length > 0) && (
              <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs shadow-sm">
                <Database className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <select
                  value={activeDataset?.datasetId || ''}
                  onChange={(e) => onSelectDataset(e.target.value)}
                  aria-label="Select active dataset or preset"
                  className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer max-w-[170px] sm:max-w-[230px] md:max-w-[270px] truncate"
                >
                  {presetDatasets.length > 0 && (
                    <optgroup label="✨ Enterprise Presets" className="bg-slate-900 text-indigo-400 font-semibold">
                      {presetDatasets.map((opt) => (
                        <option key={opt.datasetId} value={opt.datasetId} className="bg-slate-900 text-slate-200 font-normal">
                          {opt.displayLabel}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {customDatasets.length > 0 && (
                    <optgroup label="📂 Database & Uploaded Files" className="bg-slate-900 text-slate-400 font-semibold">
                      {customDatasets.map((opt) => (
                        <option key={opt.datasetId} value={opt.datasetId} className="bg-slate-900 text-slate-200 font-normal">
                          {opt.displayLabel}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {activeDataset?.reportedSuccess && (
                  <span 
                    className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" 
                    title="Source ETL reported HTTP 200 OK" 
                  />
                )}
              </div>
            )}

            {onOpenDisambiguator && (
              <button
                onClick={onOpenDisambiguator}
                className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-800 transition cursor-pointer"
                title="Inspect how values like 120 are interpreted across different columns"
              >
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>Value Inspector</span>
              </button>
            )}

            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700/80 text-slate-200 border border-slate-700 transition cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5 text-slate-300" />
              <span>Upload CSV</span>
            </button>

            <button
              onClick={onRunValidation}
              disabled={isValidating || !activeDataset}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Play className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : 'fill-current'}`} />
              <span>{isValidating ? 'Validating...' : 'Validate'}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 border-t border-slate-800/70 pt-0.5 overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 py-2.5 px-3 text-xs font-medium border-b-2 transition cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'text-indigo-400 border-indigo-500 bg-indigo-500/5'
                    : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/30'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge !== null && item.badge !== undefined && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

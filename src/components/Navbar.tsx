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
  Activity,
  Sun,
  Moon
} from 'lucide-react';
import { Dataset, ValidationRun } from '../types';
import { BackendHealth } from '../services/api';
import mothersonLogo from '../assets/motherson-logo.png';

const PRESET_DEFINITIONS: Record<string, { label: string; presetId: string; description: string }> = {
  'motherson_parts_batch_dispatch.csv': {
    label: 'Automotive Parts Dispatch',
    presetId: 'preset-motherson-parts',
    description: 'Automotive Manufacturing & Dispatch'
  },
  'employee_master_roster.csv': {
    label: 'HR & Employee Master',
    presetId: 'preset-employee',
    description: 'Human Resources & Roster Integrity'
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
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
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
  backendHealth,
  theme = 'dark',
  onToggleTheme
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
          displayLabel: `${matchedPreset.label} (${ds.rowCount.toLocaleString()} rows)`,
          presetId: matchedPreset.presetId
        });
      } else {
        customsList.push({
          datasetId: ds.datasetId,
          displayLabel: `${ds.fileName} (${ds.rowCount.toLocaleString()} rows)`
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
          displayLabel: `${matchedPreset.label} (${activeDataset.rowCount.toLocaleString()} rows)`,
          presetId: matchedPreset.presetId
        });
      } else {
        customsList.unshift({
          datasetId: activeDataset.datasetId,
          displayLabel: `${activeDataset.fileName} (${activeDataset.rowCount.toLocaleString()} rows)`
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
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0c0d10]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#22242d] shadow-2xs">
      {/* Top red corporate accent line */}
      <div className="h-[2.5px] w-full bg-gradient-to-r from-red-600 via-red-500 to-red-700" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main top header */}
        <div className="flex items-center justify-between h-14">
          {/* Clean Brand Mark with Official Motherson Identity */}
          <div className="flex items-center gap-3">
            {/* Official Motherson Logo (wordmark + ascending bars) */}
            <div className="flex items-center pr-3 sm:border-r border-slate-200 dark:border-zinc-800" title="Motherson Group Quality Gateway">
              <img
                src={mothersonLogo}
                alt="Motherson"
                className="h-5 sm:h-5.5 w-auto object-contain select-none"
              />
            </div>

            {/* SilentGuard Application Name */}
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 border border-red-200 dark:bg-red-600/10 dark:border-red-500/30 dark:text-red-500 flex items-center justify-center shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white flex items-center">
                Silent<span className="text-[#e31b23] ml-0.5">Guard</span>
              </span>
            </div>

            {/* Subtle backend connection badge */}
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono border border-slate-200 dark:border-[#242630] bg-slate-50 dark:bg-[#121317] text-slate-600 dark:text-zinc-400">
              <span className={`w-1.5 h-1.5 rounded-full ${backendHealth ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span>
                {backendHealth ? 'PostgreSQL 16' : 'Connecting...'}
              </span>
            </div>
          </div>

          {/* Quick switcher and primary actions */}
          <div className="flex items-center gap-2">
            {(presetDatasets.length > 0 || customDatasets.length > 0) && (
              <div className="flex items-center gap-1.5 sm:gap-2 bg-white dark:bg-[#121317] border border-slate-200 dark:border-[#242630] rounded-lg px-2.5 py-1.5 text-xs shadow-2xs">
                <Database className="w-3.5 h-3.5 text-[#e31b23] shrink-0" />
                <select
                  value={activeDataset?.datasetId || ''}
                  onChange={(e) => onSelectDataset(e.target.value)}
                  aria-label="Select active dataset or preset"
                  className="bg-transparent text-slate-800 dark:text-zinc-200 font-medium focus:outline-none cursor-pointer max-w-[170px] sm:max-w-[230px] md:max-w-[270px] truncate"
                >
                  {presetDatasets.length > 0 && (
                    <optgroup label="Standard Presets" className="bg-white dark:bg-[#121317] text-[#e31b23] dark:text-red-400 font-semibold">
                      {presetDatasets.map((opt) => (
                        <option key={opt.datasetId} value={opt.datasetId} className="bg-white dark:bg-[#121317] text-slate-800 dark:text-zinc-200 font-normal">
                          {opt.displayLabel}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {customDatasets.length > 0 && (
                    <optgroup label="Database & Uploaded Files" className="bg-white dark:bg-[#121317] text-slate-600 dark:text-zinc-400 font-semibold">
                      {customDatasets.map((opt) => (
                        <option key={opt.datasetId} value={opt.datasetId} className="bg-white dark:bg-[#121317] text-slate-800 dark:text-zinc-200 font-normal">
                          {opt.displayLabel}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {activeDataset?.reportedSuccess && (
                  <span 
                    className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" 
                    title="Source ETL reported HTTP 200 OK" 
                  />
                )}
              </div>
            )}

            {onOpenDisambiguator && (
              <button
                onClick={onOpenDisambiguator}
                className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-[#121317] hover:bg-slate-50 dark:hover:bg-zinc-800/80 border border-slate-200 dark:border-[#242630] transition cursor-pointer shadow-2xs"
                title="Inspect how values like 120 are interpreted across different columns"
              >
                <Sliders className="w-3.5 h-3.5 text-[#e31b23]" />
                <span>Value Inspector</span>
              </button>
            )}

            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#121317] hover:bg-slate-50 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#242630] transition cursor-pointer shadow-2xs"
            >
              <UploadCloud className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
              <span>Upload CSV</span>
            </button>

            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-200 dark:border-[#242630] bg-white dark:bg-[#121317] hover:bg-slate-50 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer shadow-2xs"
                title={theme === 'light' ? 'Switch to Motherson Dark Theme' : 'Switch to Motherson Light Theme'}
                aria-label="Toggle light or dark theme"
              >
                {theme === 'light' ? (
                  <Moon className="w-4 h-4 text-slate-700" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-400" />
                )}
              </button>
            )}

            <button
              onClick={onRunValidation}
              disabled={isValidating || !activeDataset}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#e31b23] hover:bg-[#c41219] text-white shadow-sm shadow-red-950/30 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border border-red-500/30"
            >
              <Play className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : 'fill-current'}`} />
              <span>{isValidating ? 'Validating...' : 'Validate'}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 border-t border-slate-200 dark:border-[#22242d] pt-1 overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 py-2 px-3 text-xs font-medium border-b-2 transition cursor-pointer whitespace-nowrap rounded-t-lg ${
                  isActive
                    ? 'text-[#e31b23] dark:text-white border-[#e31b23] bg-red-50/60 dark:bg-red-600/10 font-bold'
                    : 'text-slate-600 dark:text-zinc-400 border-transparent hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800/40'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#e31b23]' : 'text-slate-400 dark:text-zinc-400'}`} />
                <span>{item.label}</span>
                {item.badge !== null && item.badge !== undefined && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 border border-red-200 dark:border-red-500/30">
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

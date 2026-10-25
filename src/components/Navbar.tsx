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
          <div className="flex items-center gap-2.5">
            {allDatasets.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
                <Database className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={activeDataset?.datasetId || ''}
                  onChange={(e) => onSelectDataset(e.target.value)}
                  aria-label="Select active dataset"
                  className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer max-w-[150px] sm:max-w-[200px] truncate"
                >
                  {allDatasets.map((ds) => (
                    <option key={ds.datasetId} value={ds.datasetId} className="bg-slate-900 text-slate-200">
                      {ds.fileName} ({ds.rowCount} rows)
                    </option>
                  ))}
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

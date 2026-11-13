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
  Sun,
  Moon,
  Users,
  Trash2
} from 'lucide-react';
import { Dataset, ValidationRun, EmployeeUser } from '../types';
import { ROLE_DETAILS, hasPermission } from '../services/authService';
import mothersonLogo from '../assets/motherson-logo.png';

const PRESET_DEFINITIONS: Record<string, { label: string; presetId: string }> = {
  'motherson_parts_batch_dispatch.csv': {
    label: 'Automotive Parts Dispatch',
    presetId: 'preset-motherson-parts'
  },
  'motherson_parts_batch_dispatch.xlsx': {
    label: 'Automotive Parts Dispatch (.xlsx)',
    presetId: 'preset-motherson-parts'
  },
  'employee_master_roster.csv': {
    label: 'HR & Employee Master',
    presetId: 'preset-employee'
  },
  'financial_orders.csv': {
    label: 'Financial Ledger & Orders',
    presetId: 'preset-financial-orders'
  }
};

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeDataset: Dataset | null;
  latestRun: ValidationRun | null;
  onOpenUpload: () => void;
  onRunValidation: () => void;
  isValidating: boolean;
  totalDatasetsCount: number;
  onSelectDataset: (id: string) => void;
  onDeleteDataset?: (datasetId: string) => void;
  allDatasets: Dataset[];
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  currentUser: EmployeeUser;
  onOpenAccountShowcase: () => void;
  onGoToLanding?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  activeDataset,
  latestRun,
  onOpenUpload,
  onRunValidation,
  isValidating,
  onSelectDataset,
  onDeleteDataset,
  allDatasets,
  theme = 'dark',
  onToggleTheme,
  currentUser,
  onOpenAccountShowcase,
  onGoToLanding
}) => {
  const issueCount = latestRun?.totalIssuesCount ?? 0;
  const canUpload = hasPermission(currentUser, 'upload_data');
  const roleMeta = ROLE_DETAILS[currentUser.role];
  const isAdmin = currentUser.role === 'ADMIN';

  // Categorize and filter datasets:
  // - Standard presets: always available to all users and admin
  // - Uploaded files: Admin sees all; regular employees only see tables they explicitly uploaded!
  const { presetDatasets, customDatasets } = React.useMemo(() => {
    const seenNames = new Set<string>();
    const presetsList: Array<{ datasetId: string; displayLabel: string }> = [];
    const customsList: Array<{ datasetId: string; displayLabel: string }> = [];

    allDatasets.forEach((ds) => {
      const nameKey = ds.fileName.trim().toLowerCase();
      if (seenNames.has(nameKey)) return;
      seenNames.add(nameKey);

      const matchedPreset = Object.entries(PRESET_DEFINITIONS).find(
        ([key]) => key.toLowerCase() === nameKey
      )?.[1];

      if (matchedPreset || ds.isPreset) {
        presetsList.push({
          datasetId: ds.datasetId,
          displayLabel: `${matchedPreset ? matchedPreset.label : ds.fileName} (${ds.rowCount.toLocaleString()} rows)`
        });
      } else {
        // Uploaded custom dataset: check authorization
        const isOwner = (ds.uploadedById && ds.uploadedById.toUpperCase() === currentUser.employeeId.toUpperCase()) ||
                        (ds.uploadedByEmail && ds.uploadedByEmail.toLowerCase() === currentUser.email.toLowerCase()) ||
                        (ds.uploadedBy && (
                          ds.uploadedBy.includes(currentUser.employeeId) || 
                          ds.uploadedBy.includes(currentUser.name)
                        ));

        if (isAdmin || isOwner) {
          const isXlsx = ds.fileName.toLowerCase().endsWith('.xlsx') || ds.fileName.toLowerCase().endsWith('.xls');
          customsList.push({
            datasetId: ds.datasetId,
            displayLabel: `${isXlsx ? '📊 ' : ''}${ds.fileName} (${ds.rowCount.toLocaleString()} rows)`
          });
        }
      }
    });

    return { presetDatasets: presetsList, customDatasets: customsList };
  }, [allDatasets, currentUser, isAdmin]);

  // Main navigation tabs:
  // Only Admin has the ability to see Employee Access & RBAC
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, badge: issueCount > 0 ? issueCount : null },
    { id: 'explorer', label: 'Records & Exceptions', icon: Table2 },
    { id: 'rules', label: 'Rules & Dictionary', icon: Sliders },
    { id: 'history', label: 'Run History', icon: History },
    { id: 'export', label: 'Reports & PDF Audit', icon: FileDown },
    ...(isAdmin ? [{ id: 'users', label: 'Employee Access & RBAC', icon: Users, badge: 'ADMIN' }] : [])
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0c0d10]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#22242d] shadow-2xs">
      {/* Top red corporate accent bar */}
      <div className="h-[2.5px] w-full bg-gradient-to-r from-red-600 via-red-500 to-red-700" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main top header: uncluttered, minimal, elegant */}
        <div className="flex items-center justify-between h-14">
          {/* Brand Mark with Official Motherson Identity */}
          <div className="flex items-center gap-3">
            <div className="flex items-center pr-3 sm:border-r border-slate-200 dark:border-zinc-800" title="Motherson Group Quality Gateway">
              <img
                src={mothersonLogo}
                alt="Motherson"
                className="h-5 sm:h-5.5 w-auto object-contain select-none"
              />
            </div>

            <button
              onClick={onGoToLanding}
              className="flex items-center gap-1.5 cursor-pointer text-left focus:outline-none"
              title="Return to SilentGuard Overview Landing Page"
            >
              <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 border border-red-200 dark:bg-red-600/10 dark:border-red-500/30 dark:text-red-500 flex items-center justify-center shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white flex items-center">
                Silent<span className="text-[#e31b23] ml-0.5">Guard</span>
              </span>
            </button>
          </div>

          {/* Right actions: streamlined, uncrowded */}
          <div className="flex items-center gap-2.5">
            {onGoToLanding && (
              <button
                onClick={onGoToLanding}
                className="hidden xl:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                title="View project overview & team information"
              >
                <span>Project Overview</span>
              </button>
            )}

            {/* Table / Dataset Selector */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-[#121317] border border-slate-200 dark:border-[#242630] rounded-lg px-2.5 py-1.5 text-xs shadow-2xs">
              <Database className="w-3.5 h-3.5 text-[#e31b23] shrink-0" />
              <select
                value={activeDataset?.datasetId || ''}
                onChange={(e) => onSelectDataset(e.target.value)}
                aria-label="Select active dataset"
                className="bg-transparent text-slate-800 dark:text-zinc-200 font-medium focus:outline-none cursor-pointer max-w-[140px] sm:max-w-[180px] md:max-w-[220px] truncate text-xs"
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
                  <optgroup label={isAdmin ? "All Uploaded Tables" : "My Uploaded Tables"} className="bg-white dark:bg-[#121317] text-slate-600 dark:text-zinc-400 font-semibold">
                    {customDatasets.map((opt) => (
                      <option key={opt.datasetId} value={opt.datasetId} className="bg-white dark:bg-[#121317] text-slate-800 dark:text-zinc-200 font-normal">
                        {opt.displayLabel}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>

              {/* Admin-only Delete Button for Custom Uploaded CSV or Excel Files */}
              {isAdmin && activeDataset && !activeDataset.isPreset && onDeleteDataset && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Are you sure you want to permanently delete the uploaded dataset "${activeDataset.fileName}"? This will remove its database table, validation runs, and issues.`)) {
                      onDeleteDataset(activeDataset.datasetId);
                    }
                  }}
                  className="ml-1 p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                  title={`Admin: Delete uploaded dataset "${activeDataset.fileName}"`}
                  aria-label="Delete active uploaded dataset"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Upload Button */}
            <button
              onClick={onOpenUpload}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shadow-2xs ${
                canUpload
                  ? 'bg-white dark:bg-[#121317] hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#242630]'
                  : 'bg-slate-100 dark:bg-zinc-900 text-slate-400 dark:text-zinc-600 border border-slate-200 dark:border-[#242630]'
              }`}
              title={canUpload ? 'Ingest CSV or Excel file' : 'Viewer mode: Quality Steward or Admin credentials required'}
            >
              <UploadCloud className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
              <span>Upload</span>
            </button>

            {/* Validate Button */}
            <button
              onClick={onRunValidation}
              disabled={isValidating || !activeDataset}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#e31b23] hover:bg-[#c41219] text-white shadow-sm shadow-red-950/30 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border border-red-500/30"
              title="Execute quality rules against active dataset"
            >
              <Play className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : 'fill-current'}`} />
              <span>{isValidating ? 'Validating...' : 'Validate'}</span>
            </button>

            {/* Theme Toggle */}
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-200 dark:border-[#242630] bg-white dark:bg-[#121317] hover:bg-slate-50 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 transition cursor-pointer shadow-2xs"
                title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                aria-label="Toggle theme"
              >
                {theme === 'light' ? (
                  <Moon className="w-4 h-4 text-slate-700" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-400" />
                )}
              </button>
            )}

            {/* Authenticated Employee Showcase Button (Does NOT switch user; showcases their account) */}
            <button
              onClick={onOpenAccountShowcase}
              className="group relative flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200/90 dark:border-[#282a36] bg-gradient-to-b from-white to-slate-50 dark:from-[#15171d] dark:to-[#0f1014] hover:border-red-500/40 dark:hover:border-red-500/40 hover:shadow-md transition-all duration-200 cursor-pointer text-left shadow-2xs"
              title="Click to view your authenticated employee profile"
            >
              <div className="relative">
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${currentUser.avatarColor || 'from-red-500 to-rose-600'} text-white font-bold text-[11px] flex items-center justify-center shadow-xs shrink-0 ring-1 ring-black/10 dark:ring-white/10 group-hover:scale-105 transition-transform`}>
                  {currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0f1014]" />
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                    {currentUser.name}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full border font-bold ${roleMeta.badgeClass} ${roleMeta.badgeDarkClass}`}>
                    {roleMeta.label.split(' ')[0]}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 leading-none mt-0.5">
                  {currentUser.employeeId}
                </div>
              </div>
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
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    item.badge === 'ADMIN'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40'
                      : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 border border-red-200 dark:border-red-500/30'
                  }`}>
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

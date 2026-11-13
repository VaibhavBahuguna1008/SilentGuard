import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { DataExplorerView } from './components/DataExplorerView';
import { RuleConfiguratorView } from './components/RuleConfiguratorView';
import { IssueResolutionDrawer } from './components/IssueResolutionDrawer';
import { RunHistoryView } from './components/RunHistoryView';
import { ExportAuditView } from './components/ExportAuditView';
import { UploadModal } from './components/UploadModal';
import { ContextualDisambiguatorModal } from './components/ContextualDisambiguatorModal';
import { UserManagementView } from './components/UserManagementView';
import { AccountShowcaseModal } from './components/AccountShowcaseModal';
import { SignInModal } from './components/SignInModal';
import { LandingPageView } from './components/LandingPageView';
import { LoginPage } from './components/LoginPage';

import { 
  Dataset, 
  ValidationRule, 
  ValidationRun, 
  ValidationIssue, 
  ResolutionHistory, 
  ResolutionStatus,
  EmployeeUser 
} from './types';
import { 
  EMPLOYEE_CSV, 
  DEFAULT_EMPLOYEE_RULES, 
  MOTHERSON_PARTS_CSV, 
  MOTHERSON_PARTS_RULES, 
  FINANCIAL_ORDERS_CSV,
  RULE_PRESETS 
} from './data/mockDatasets';
import { createDatasetFromCsv } from './utils/csvParser';
import { runValidation as clientRunValidation } from './services/validationEngine';
import { api, BackendHealth } from './services/api';
import { authService } from './services/authService';
import mothersonLogo from './assets/motherson-logo.png';

// Baseline demo datasets always available as options to all users and admin
const SEED_DATASETS: Dataset[] = [
  createDatasetFromCsv(
    'employee_master_roster.csv',
    EMPLOYEE_CSV,
    'HR Ops Sync',
    'Workday HCM Cloud',
    true,
    true
  ),
  createDatasetFromCsv(
    'motherson_parts_batch_dispatch.csv',
    MOTHERSON_PARTS_CSV,
    'MES Quality Gateway',
    'Motherson Shopfloor MES',
    true,
    true
  ),
  createDatasetFromCsv(
    'financial_orders.csv',
    FINANCIAL_ORDERS_CSV,
    'Payment Gateway Batch',
    'Stripe Global Ledger',
    true,
    true
  )
];

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [backendHealth, setBackendHealth] = useState<BackendHealth | null>(null);

  // Authenticated Motherson Employee State
  const [currentUser, setCurrentUser] = useState<EmployeeUser>(() => authService.getCurrentUser());
  const [isAccountShowcaseOpen, setIsAccountShowcaseOpen] = useState<boolean>(false);
  const [isSignInOpen, setIsSignInOpen] = useState<boolean>(false);

  // Top-Level Application Page View: 'landing' | 'login' | 'workspace'
  const [pageView, setPageView] = useState<'landing' | 'login' | 'workspace'>('landing');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const auth = localStorage.getItem('silentguard_is_auth');
      return auth !== 'false' && auth !== null;
    } catch {}
    return true;
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('silentguard_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return 'dark';
  });

  useEffect(() => {
    try {
      localStorage.setItem('silentguard_theme', theme);
    } catch {}
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
  }, [theme]);

  const handleToggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  const [datasets, setDatasets] = useState<Dataset[]>(() => {
    return [...SEED_DATASETS];
  });

  const [activeDatasetId, setActiveDatasetId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem('silentguard_active_dataset_id');
      const savedName = localStorage.getItem('silentguard_active_dataset_name');
      if (savedId || savedName) {
        const found = SEED_DATASETS.find(d => 
          (savedId && d.datasetId === savedId) || 
          (savedName && d.fileName.trim().toLowerCase() === savedName.trim().toLowerCase())
        );
        if (found) return found.datasetId;
      }
    } catch {}
    return SEED_DATASETS[0]?.datasetId || '';
  });

  const [rules, setRules] = useState<ValidationRule[]>(() => [...DEFAULT_EMPLOYEE_RULES]);
  const [activePresetId, setActivePresetId] = useState<string>('preset-employee');
  const [runs, setRuns] = useState<ValidationRun[]>([]);
  const [currentIssues, setCurrentIssues] = useState<ValidationIssue[]>([]);
  const [resolutionHistories, setResolutionHistories] = useState<ResolutionHistory[]>([
    {
      resolutionId: 'res-init-1',
      issueId: 'seed-dummy',
      resolvedBy: 'QA Team',
      resolutionComment: 'Initial validation pipeline initialized.',
      resolutionStatus: 'IN_REVIEW',
      updatedAt: new Date(Date.now() - 3600000).toISOString()
    }
  ]);

  const [selectedIssue, setSelectedIssue] = useState<ValidationIssue | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isDisambiguatorOpen, setIsDisambiguatorOpen] = useState<boolean>(false);
  const [disambiguatorValue, setDisambiguatorValue] = useState<string>('120');

  const activeDataset = datasets.find(d => d.datasetId === activeDatasetId) || datasets[0];
  
  // Strictly find run for the active dataset; NEVER fall back to another dataset's run
  const latestRun = runs.find(r => r.datasetId === activeDataset?.datasetId) || null;

  // Filter issues strictly belonging to the active dataset
  const activeDatasetIssues = useMemo(() => {
    if (!activeDataset) return [];
    return currentIssues.filter(i => i.datasetId === activeDataset.datasetId);
  }, [currentIssues, activeDataset?.datasetId]);

  // Enforce RBAC Tab Visibility: Only Admin can access 'users' tab
  useEffect(() => {
    if (activeTab === 'users' && currentUser.role !== 'ADMIN') {
      setActiveTab('dashboard');
    }
  }, [activeTab, currentUser.role]);

  // Ensure active dataset is accessible to current user
  useEffect(() => {
    if (currentUser.role === 'ADMIN') return;

    const currentDs = datasets.find(d => d.datasetId === activeDatasetId);
    if (!currentDs) return;

    const isPreset = currentDs.isPreset || SEED_DATASETS.some(s => s.datasetId === currentDs.datasetId);
    if (isPreset) return;

    const isOwner = (currentDs.uploadedById && currentDs.uploadedById.toUpperCase() === currentUser.employeeId.toUpperCase()) ||
                    (currentDs.uploadedByEmail && currentDs.uploadedByEmail.toLowerCase() === currentUser.email.toLowerCase()) ||
                    (currentDs.uploadedBy && (
                      currentDs.uploadedBy.includes(currentUser.employeeId) || 
                      currentDs.uploadedBy.includes(currentUser.name)
                    ));

    if (!isOwner) {
      const defaultPreset = SEED_DATASETS[0];
      setActiveDatasetId(defaultPreset.datasetId);
      try {
        localStorage.setItem('silentguard_active_dataset_id', defaultPreset.datasetId);
        localStorage.setItem('silentguard_active_dataset_name', defaultPreset.fileName);
      } catch {}
    }
  }, [currentUser, activeDatasetId, datasets]);

  // Initial load from backend (PostgreSQL) - Load metadata only without auto-running validation
  useEffect(() => {
    async function initFromBackend() {
      try {
        const health = await api.checkHealth();
        setBackendHealth(health);

        if (health) {
          const dbDatasets = await api.fetchDatasets();
          const mergedDatasets: Dataset[] = [];
          const seenNames = new Set<string>();

          if (dbDatasets && dbDatasets.length > 0) {
            for (const ds of dbDatasets) {
              const norm = ds.fileName.trim().toLowerCase();
              if (!seenNames.has(norm)) {
                seenNames.add(norm);
                mergedDatasets.push(ds);
              }
            }
          }

          for (const seed of SEED_DATASETS) {
            const norm = seed.fileName.trim().toLowerCase();
            if (!seenNames.has(norm)) {
              seenNames.add(norm);
              mergedDatasets.push(seed);
            }
          }

          setDatasets(mergedDatasets);

          // Restore recent active dataset
          let recentId: string | null = null;
          let recentName: string | null = null;
          try {
            recentId = localStorage.getItem('silentguard_active_dataset_id');
            recentName = localStorage.getItem('silentguard_active_dataset_name');
          } catch {}

          let selected = mergedDatasets.find(d => 
            (recentId && d.datasetId === recentId) || 
            (recentName && d.fileName.trim().toLowerCase() === recentName.trim().toLowerCase())
          );

          if (!selected) {
            selected = mergedDatasets.find(d => d.datasetId === activeDatasetId) || mergedDatasets[0];
          }

          if (selected) {
            setActiveDatasetId(selected.datasetId);
            try {
              localStorage.setItem('silentguard_active_dataset_id', selected.datasetId);
              localStorage.setItem('silentguard_active_dataset_name', selected.fileName);
            } catch {}
          }

          const datasetsMap = new Map<string, string>();
          mergedDatasets.forEach(d => datasetsMap.set(d.datasetId, d.fileName));

          // Fetch rules from PostgreSQL
          const dbRules = await api.fetchRules();
          let effectiveRules = dbRules && dbRules.length > 0 ? dbRules : rules;
          if (selected) {
            const fn = selected.fileName.toLowerCase();
            if (selected.columns.includes('employee_id') || selected.columns.includes('salary') || fn.includes('employee')) {
              effectiveRules = [...DEFAULT_EMPLOYEE_RULES];
              setActivePresetId('preset-employee');
            } else if (selected.columns.includes('part_number') || selected.columns.includes('batch_id') || fn.includes('motherson')) {
              effectiveRules = [...MOTHERSON_PARTS_RULES];
              setActivePresetId('preset-motherson-parts');
            } else if (selected.columns.includes('order_id') || selected.columns.includes('total_amount') || fn.includes('financial')) {
              const finPreset = RULE_PRESETS.find(p => p.id === 'preset-financial-orders');
              if (finPreset) effectiveRules = [...finPreset.rules];
              setActivePresetId('preset-financial-orders');
            }
          }
          setRules(effectiveRules);

          // Fetch runs and issues (if previously executed) without auto-executing new runs
          const dbRuns = await api.fetchRuns(undefined, datasetsMap);
          if (dbRuns && dbRuns.length > 0) {
            setRuns(dbRuns);
            const latestForActive = dbRuns.find(r => r.datasetId === selected?.datasetId);
            if (latestForActive) {
              const issues = await api.fetchRunIssues(latestForActive.runId);
              const cleanIssues = selected ? issues.filter(i => 
                selected.columns.includes(i.columnName) && 
                i.foundValue !== '<MISSING HEADER>' && 
                i.foundValue !== '<MISSING SECOND COLUMN>'
              ) : issues;
              setCurrentIssues(cleanIssues);
            }
          }

          const dbHistory = await api.fetchAuditHistory();
          if (dbHistory && dbHistory.length > 0) {
            setResolutionHistories(dbHistory);
          }
        }
      } catch (err) {
        console.warn('Backend connection notice:', err);
      }
    }

    initFromBackend();
  }, []);

  // Validation execution: ONLY called when user explicitly clicks "Validate"
  const handleExecuteValidation = useCallback(async (customDataset?: Dataset, customRules?: ValidationRule[]) => {
    const targetDataset = customDataset || activeDataset;
    const targetRules = customRules || rules;
    if (!targetDataset) return;

    setIsValidating(true);

    try {
      const activeRuleIds = targetRules.filter(r => r.enabled).map(r => r.ruleId);
      // Try executing on Spring Boot backend
      const result = await api.executeValidation(
        targetDataset.datasetId, 
        activeRuleIds, 
        targetDataset.fileName
      );

      // Cleanse result issues to guarantee accurate column domain isolation
      const cleanIssues = (result.issues || []).filter(i => 
        targetDataset.columns.includes(i.columnName) &&
        i.foundValue !== '<MISSING HEADER>' &&
        i.foundValue !== '<MISSING SECOND COLUMN>'
      );

      const failedRowSet = new Set(cleanIssues.map(i => i.rowNumber));
      const failedCount = failedRowSet.size;
      const passedCount = Math.max(0, targetDataset.rowCount - failedCount);
      const computedScore = targetDataset.rowCount > 0 
        ? Math.round((passedCount / targetDataset.rowCount) * 100) 
        : 100;

      const correctedRun: ValidationRun = {
        ...result.run,
        datasetId: targetDataset.datasetId,
        datasetName: targetDataset.fileName,
        failedRecords: failedCount,
        passedRecords: passedCount,
        healthScore: computedScore,
        runStatus: failedCount === 0 ? 'PASSED' : (computedScore < 70 ? 'FAILED' : 'WARNING'),
        totalIssuesCount: cleanIssues.length,
        criticalIssuesCount: cleanIssues.filter(i => i.severity === 'CRITICAL').length,
        errorIssuesCount: cleanIssues.filter(i => i.severity === 'ERROR').length,
        warningIssuesCount: cleanIssues.filter(i => i.severity === 'WARNING').length,
        executedBy: `${currentUser.name} (${currentUser.employeeId})`,
        executedById: currentUser.employeeId,
        executedByEmail: currentUser.email
      };

      setRuns(prev => [correctedRun, ...prev.filter(r => r.datasetId !== targetDataset.datasetId)]);
      setCurrentIssues(prev => [
        ...cleanIssues,
        ...prev.filter(i => i.datasetId !== targetDataset.datasetId)
      ]);
    } catch (err) {
      console.warn('Using client validation engine:', err);
      // Resilient client-side engine execution
      const nextRunNumber = runs.filter(r => r.datasetId === targetDataset.datasetId).length + 1;
      const { run, issues } = clientRunValidation(targetDataset, targetRules, nextRunNumber);
      
      const cleanIssues = issues.filter(i => 
        targetDataset.columns.includes(i.columnName) &&
        i.foundValue !== '<MISSING HEADER>' &&
        i.foundValue !== '<MISSING SECOND COLUMN>'
      );

      const failedRowSet = new Set(cleanIssues.map(i => i.rowNumber));
      const failedCount = failedRowSet.size;
      const passedCount = Math.max(0, targetDataset.rowCount - failedCount);
      const computedScore = targetDataset.rowCount > 0 
        ? Math.round((passedCount / targetDataset.rowCount) * 100) 
        : 100;

      const correctedRun: ValidationRun = {
        ...run,
        datasetId: targetDataset.datasetId,
        datasetName: targetDataset.fileName,
        failedRecords: failedCount,
        passedRecords: passedCount,
        healthScore: computedScore,
        runStatus: failedCount === 0 ? 'PASSED' : (computedScore < 70 ? 'FAILED' : 'WARNING'),
        totalIssuesCount: cleanIssues.length,
        criticalIssuesCount: cleanIssues.filter(i => i.severity === 'CRITICAL').length,
        errorIssuesCount: cleanIssues.filter(i => i.severity === 'ERROR').length,
        warningIssuesCount: cleanIssues.filter(i => i.severity === 'WARNING').length,
        executedBy: `${currentUser.name} (${currentUser.employeeId})`,
        executedById: currentUser.employeeId,
        executedByEmail: currentUser.email
      };

      setRuns(prev => [correctedRun, ...prev.filter(r => r.datasetId !== targetDataset.datasetId)]);
      setCurrentIssues(prev => [
        ...cleanIssues,
        ...prev.filter(i => i.datasetId !== targetDataset.datasetId)
      ]);
    } finally {
      setIsValidating(false);
    }
  }, [activeDataset, rules, runs]);

  // Switch dataset without auto-running validation
  const handleSelectDataset = async (id: string) => {
    setActiveDatasetId(id);
    const chosen = datasets.find(d => d.datasetId === id);
    if (!chosen) return;

    try {
      localStorage.setItem('silentguard_active_dataset_id', chosen.datasetId);
      localStorage.setItem('silentguard_active_dataset_name', chosen.fileName);
    } catch {}

    // Load matching preset rules for the selected dataset
    let newRules = [...rules];
    let detectedPresetId = '';
    const fn = chosen.fileName.toLowerCase();
    if (chosen.columns.includes('employee_id') || chosen.columns.includes('salary') || fn.includes('employee')) {
      newRules = [...DEFAULT_EMPLOYEE_RULES];
      detectedPresetId = 'preset-employee';
    } else if (chosen.columns.includes('part_number') || chosen.columns.includes('batch_id') || fn.includes('motherson')) {
      newRules = [...MOTHERSON_PARTS_RULES];
      detectedPresetId = 'preset-motherson-parts';
    } else if (chosen.columns.includes('order_id') || chosen.columns.includes('total_amount') || fn.includes('financial')) {
      const finPreset = RULE_PRESETS.find(p => p.id === 'preset-financial-orders');
      if (finPreset) newRules = [...finPreset.rules];
      detectedPresetId = 'preset-financial-orders';
    }
    if (detectedPresetId) setActivePresetId(detectedPresetId);
    setRules(newRules);

    // If an existing run already exists for this dataset, fetch its issues; otherwise leave unvalidated
    const existingRun = runs.find(r => r.datasetId === id);
    if (existingRun) {
      try {
        const issues = await api.fetchRunIssues(existingRun.runId);
        const cleanIssues = issues.filter(i => 
          chosen.columns.includes(i.columnName) && 
          i.foundValue !== '<MISSING HEADER>' && 
          i.foundValue !== '<MISSING SECOND COLUMN>'
        );
        setCurrentIssues(prev => [
          ...cleanIssues,
          ...prev.filter(i => i.datasetId !== id)
        ]);
      } catch (e) {
        console.warn('Could not fetch issues for existing run:', e);
      }
    }
  };

  // Rule configuration changes (do NOT auto-run validation; user clicks Validate)
  const handleToggleRule = async (ruleId: string) => {
    const updated = rules.map(r => r.ruleId === ruleId ? { ...r, enabled: !r.enabled } : r);
    setRules(updated);

    try {
      await api.toggleRule(ruleId);
    } catch (e) {
      console.warn('Rule toggle backend sync failed:', e);
    }
  };

  const handleAddRule = async (newRule: ValidationRule) => {
    const updated = [newRule, ...rules];
    setRules(updated);

    try {
      await api.saveRule(newRule);
    } catch (e) {
      console.warn('Rule save backend sync failed:', e);
    }
  };

  const handleAddMultipleRules = async (newRules: ValidationRule[]) => {
    const updated = [...newRules, ...rules];
    setRules(updated);

    for (const rule of newRules) {
      try {
        await api.saveRule(rule);
      } catch (e) {
        console.warn('Rule save backend sync failed:', e);
      }
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    const updated = rules.filter(r => r.ruleId !== ruleId);
    setRules(updated);

    try {
      await api.deleteRule(ruleId);
    } catch (e) {
      console.warn('Rule delete backend sync failed:', e);
    }
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = RULE_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    setActivePresetId(presetId);
    setRules([...preset.rules]);

    const matchingDataset = datasets.find(d => {
      const name = d.fileName.toLowerCase();
      if (presetId === 'preset-employee') return name.includes('employee');
      if (presetId === 'preset-motherson-parts') return name.includes('motherson') || name.includes('parts');
      if (presetId === 'preset-financial-orders') return name.includes('financial') || name.includes('order');
      return false;
    });

    if (matchingDataset && matchingDataset.datasetId !== activeDatasetId) {
      setActiveDatasetId(matchingDataset.datasetId);
      try {
        localStorage.setItem('silentguard_active_dataset_id', matchingDataset.datasetId);
        localStorage.setItem('silentguard_active_dataset_name', matchingDataset.fileName);
      } catch {}
    }
  };

  const handleUpdateRuleReferenceList = (ruleId: string, newList: string[]) => {
    const updated = rules.map(r => r.ruleId === ruleId ? { ...r, referenceList: newList } : r);
    setRules(updated);
  };

  const handleUpdateDatasetRecords = async (updatedRecords: Record<string, string>[], updatedColumns?: string[]) => {
    const newCols = updatedColumns || activeDataset.columns;
    const updatedDataset: Dataset = {
      ...activeDataset,
      columns: newCols,
      rawData: updatedRecords,
      rowCount: updatedRecords.length,
      status: 'validated'
    };

    setDatasets(prev => prev.map(d => d.datasetId === activeDataset.datasetId ? updatedDataset : d));

    try {
      await api.updateDatasetRecords(activeDataset.datasetId, updatedRecords, newCols);
    } catch (e) {
      console.warn('Dataset update backend sync failed:', e);
    }

    // Revalidate after in-place corrections
    handleExecuteValidation(updatedDataset, rules);
  };

  // Add new uploaded dataset (does NOT auto-run validation; prompts user on dashboard)
  const handleDatasetCreated = (newDataset: Dataset, suggestedPresetId?: string) => {
    const normName = newDataset.fileName.trim().toLowerCase();
    setDatasets(prev => [
      newDataset,
      ...prev.filter(d => d.fileName.trim().toLowerCase() !== normName)
    ]);
    setActiveDatasetId(newDataset.datasetId);

    try {
      localStorage.setItem('silentguard_active_dataset_id', newDataset.datasetId);
      localStorage.setItem('silentguard_active_dataset_name', newDataset.fileName);
    } catch {}

    if (suggestedPresetId) {
      setActivePresetId(suggestedPresetId);
      const preset = RULE_PRESETS.find(p => p.id === suggestedPresetId);
      if (preset) {
        setRules([...preset.rules]);
      }
    }

    setActiveTab('dashboard');
  };

  // Handle Issue Resolution
  const handleUpdateResolution = async (issueId: string, status: ResolutionStatus, comment: string) => {
    setCurrentIssues(prev => prev.map(i => i.issueId === issueId ? { ...i, resolutionStatus: status } : i));

    if (selectedIssue && selectedIssue.issueId === issueId) {
      setSelectedIssue(prev => prev ? { ...prev, resolutionStatus: status } : null);
    }

    const newHistory: ResolutionHistory = {
      resolutionId: `res-${Date.now()}`,
      issueId,
      resolvedBy: `${currentUser.name} (${currentUser.employeeId})`,
      resolutionComment: comment,
      resolutionStatus: status,
      updatedAt: new Date().toISOString()
    };

    setResolutionHistories(prev => [newHistory, ...prev]);

    try {
      await api.recordResolution(newHistory);
    } catch (e) {
      console.warn('Resolution history backend sync failed:', e);
    }
  };

  const handleEditAuditLog = async (resolutionId: string, status: ResolutionStatus, comment: string) => {
    let targetIssueId: string | undefined;

    setResolutionHistories(prev => prev.map(log => {
      if (log.resolutionId === resolutionId) {
        targetIssueId = log.issueId;
        return {
          ...log,
          resolutionStatus: status,
          resolutionComment: comment,
          updatedAt: new Date().toISOString()
        };
      }
      return log;
    }));

    if (targetIssueId) {
      setCurrentIssues(prev => prev.map(i => i.issueId === targetIssueId ? { ...i, resolutionStatus: status } : i));
    }

    try {
      const found = resolutionHistories.find(h => h.resolutionId === resolutionId);
      if (found) {
        await api.updateResolution({
          ...found,
          resolutionStatus: status,
          resolutionComment: comment,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn('Resolution history update backend sync failed:', e);
    }
  };

  const handleDeleteAuditLog = async (resolutionId: string) => {
    // Only Admin can delete audit log history
    if (currentUser.role !== 'ADMIN') {
      alert('Unauthorized: Only System Administrators can delete audit logs.');
      return;
    }

    setResolutionHistories(prev => prev.filter(log => log.resolutionId !== resolutionId));

    try {
      await api.deleteResolution(resolutionId);
    } catch (e) {
      console.warn('Resolution history delete backend sync failed:', e);
    }
  };

  const handleDeleteDataset = async (datasetId: string) => {
    // Only Admin can delete custom datasets
    if (currentUser.role !== 'ADMIN') {
      alert('Unauthorized: Only System Administrators can delete uploaded tables.');
      return;
    }

    const targetDataset = datasets.find(d => d.datasetId === datasetId);
    if (!targetDataset) return;
    if (targetDataset.isPreset) {
      alert('Standard preset datasets cannot be deleted.');
      return;
    }

    // Filter out target dataset
    const remainingDatasets = datasets.filter(d => d.datasetId !== datasetId);
    setDatasets(remainingDatasets);

    // Filter out runs & issues for this dataset
    setRuns(prev => prev.filter(r => r.datasetId !== datasetId));
    setCurrentIssues(prev => prev.filter(i => i.datasetId !== datasetId));

    // If currently active dataset is the one being deleted, fallback to the first preset
    if (activeDatasetId === datasetId) {
      const fallback = remainingDatasets.find(d => d.isPreset) || remainingDatasets[0] || SEED_DATASETS[0];
      if (fallback) {
        handleSelectDataset(fallback.datasetId);
      }
    }

    // Notify backend
    try {
      await api.deleteDataset(datasetId);
    } catch (e) {
      console.warn('Dataset delete backend sync failed:', e);
    }
  };

  const handleDeleteRun = async (runId: string) => {
    // Only Admin can delete validation runs
    if (currentUser.role !== 'ADMIN') {
      alert('Unauthorized: Only System Administrators can delete validation runs.');
      return;
    }

    setRuns(prev => prev.filter(r => r.runId !== runId));

    try {
      await api.deleteRun(runId);
    } catch (e) {
      console.warn('Run delete backend sync failed:', e);
    }
  };

  // 1. Landing Page View
  if (pageView === 'landing') {
    return (
      <LandingPageView
        onGoToLogin={() => setPageView('login')}
        onLaunchApp={() => setPageView('workspace')}
        isAuthenticated={isAuthenticated}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
    );
  }

  // 2. Dedicated Corporate Login Page
  if (pageView === 'login') {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthenticated(true);
          try {
            localStorage.setItem('silentguard_is_auth', 'true');
          } catch {}
          setPageView('workspace');
        }}
        onBackToLanding={() => setPageView('landing')}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
    );
  }

  // 3. Authenticated Platform Workspace
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0c0e] text-slate-900 dark:text-zinc-100 flex flex-col selection:bg-red-600 selection:text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeDataset={activeDataset}
        latestRun={latestRun}
        onOpenUpload={() => setIsUploadOpen(true)}
        onRunValidation={() => handleExecuteValidation()}
        isValidating={isValidating}
        totalDatasetsCount={datasets.length}
        onSelectDataset={handleSelectDataset}
        onDeleteDataset={handleDeleteDataset}
        allDatasets={datasets}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        currentUser={currentUser}
        onOpenAccountShowcase={() => setIsAccountShowcaseOpen(true)}
        onGoToLanding={() => setPageView('landing')}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            activeDataset={activeDataset}
            latestRun={latestRun}
            issues={activeDatasetIssues}
            activeRules={rules.filter(r => r.enabled)}
            onNavigateToTab={setActiveTab}
            onSelectIssue={setSelectedIssue}
            onRunValidation={() => handleExecuteValidation()}
            isValidating={isValidating}
          />
        )}

        {activeTab === 'explorer' && (
          <DataExplorerView
            dataset={activeDataset}
            issues={activeDatasetIssues}
            onSelectIssue={setSelectedIssue}
            onUpdateDatasetRecords={handleUpdateDatasetRecords}
            onRunValidation={() => handleExecuteValidation()}
            onOpenDisambiguatorWithValue={(val) => {
              setDisambiguatorValue(val);
              setIsDisambiguatorOpen(true);
            }}
            onAddMultipleRules={handleAddMultipleRules}
          />
        )}

        {activeTab === 'rules' && (
          <RuleConfiguratorView
            dataset={activeDataset}
            rules={rules}
            onToggleRule={handleToggleRule}
            onAddRule={handleAddRule}
            onDeleteRule={handleDeleteRule}
            onApplyPreset={handleApplyPreset}
            onRunValidation={() => handleExecuteValidation()}
            onUpdateRuleReferenceList={handleUpdateRuleReferenceList}
          />
        )}

        {activeTab === 'history' && (
          <RunHistoryView
            runs={runs}
            allDatasets={datasets}
            currentUser={currentUser}
            onDeleteRun={handleDeleteRun}
          />
        )}

        {activeTab === 'export' && (
          <ExportAuditView
            dataset={activeDataset}
            latestRun={latestRun}
            issues={activeDatasetIssues}
            rules={rules}
            resolutionHistories={resolutionHistories}
            currentUser={currentUser}
            onEditAuditLog={handleEditAuditLog}
            onDeleteAuditLog={handleDeleteAuditLog}
          />
        )}

        {activeTab === 'users' && currentUser.role === 'ADMIN' && (
          <UserManagementView
            currentUser={currentUser}
            onUserChanged={(u) => setCurrentUser(u)}
          />
        )}
      </main>

      <IssueResolutionDrawer
        issue={selectedIssue}
        onClose={() => setSelectedIssue(null)}
        resolutionHistories={resolutionHistories}
        onUpdateResolution={handleUpdateResolution}
      />

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onDatasetCreated={handleDatasetCreated}
        currentUser={currentUser}
      />

      {/* Account Showcase Modal (Opens from Navbar button) */}
      <AccountShowcaseModal
        isOpen={isAccountShowcaseOpen}
        onClose={() => setIsAccountShowcaseOpen(false)}
        currentUser={currentUser}
        onSignOut={() => {
          setIsAccountShowcaseOpen(false);
          setIsAuthenticated(false);
          try {
            localStorage.setItem('silentguard_is_auth', 'false');
          } catch {}
          setPageView('login');
        }}
      />

      {/* Categorized Sign In Modal */}
      <SignInModal
        isOpen={isSignInOpen}
        onClose={() => setIsSignInOpen(false)}
        canDismiss={true}
        onSignIn={(user) => {
          setCurrentUser(user);
          setIsSignInOpen(false);
        }}
      />

      <ContextualDisambiguatorModal
        isOpen={isDisambiguatorOpen}
        onClose={() => setIsDisambiguatorOpen(false)}
        dataset={activeDataset}
        rules={rules}
        initialValue={disambiguatorValue}
      />

      <footer className="border-t border-slate-200 dark:border-[#232530] bg-white dark:bg-[#0e0f13] py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-zinc-400 gap-3">
          <div className="flex items-center space-x-2.5">
            <img
              src={mothersonLogo}
              alt="Motherson"
              className="h-4 w-auto object-contain select-none"
            />
            <span className="text-slate-300 dark:text-zinc-600">|</span>
            <span className="font-semibold text-slate-800 dark:text-zinc-200">SilentGuard</span>
            <span className="text-slate-300 dark:text-zinc-600 hidden md:inline">•</span>
            <span className="text-slate-500 dark:text-zinc-400 hidden md:inline">Automotive &amp; Industrial Quality Gateway</span>
          </div>
          <div className="text-slate-500 dark:text-zinc-500 text-[11px] font-mono">
            Motherson Enterprise Architecture • React, Spring Boot &amp; PostgreSQL 16
          </div>
        </div>
      </footer>
    </div>
  );
}

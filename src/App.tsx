import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { DataExplorerView } from './components/DataExplorerView';
import { RuleConfiguratorView } from './components/RuleConfiguratorView';
import { IssueResolutionDrawer } from './components/IssueResolutionDrawer';
import { RunHistoryView } from './components/RunHistoryView';
import { ExportAuditView } from './components/ExportAuditView';
import { UploadModal } from './components/UploadModal';
import { ContextualDisambiguatorModal } from './components/ContextualDisambiguatorModal';

import { 
  Dataset, 
  ValidationRule, 
  ValidationRun, 
  ValidationIssue, 
  ResolutionHistory, 
  ResolutionStatus 
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

// Baseline demo datasets always available as options
const SEED_DATASETS: Dataset[] = [
  createDatasetFromCsv(
    'employee_master_roster.csv',
    EMPLOYEE_CSV,
    'HR Ops Sync',
    'Workday HCM Cloud',
    true
  ),
  createDatasetFromCsv(
    'motherson_parts_batch_dispatch.csv',
    MOTHERSON_PARTS_CSV,
    'MES Quality Gateway',
    'Motherson Shopfloor MES',
    true
  ),
  createDatasetFromCsv(
    'financial_orders.csv',
    FINANCIAL_ORDERS_CSV,
    'Payment Gateway Batch',
    'Stripe Global Ledger',
    true
  )
];

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [backendHealth, setBackendHealth] = useState<BackendHealth | null>(null);

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
  const latestRun = runs.find(r => r.datasetId === activeDataset?.datasetId) || (runs.length > 0 ? runs[0] : null);

  // Initial load from backend (PostgreSQL)
  useEffect(() => {
    async function initFromBackend() {
      try {
        const health = await api.checkHealth();
        setBackendHealth(health);

        if (health) {
          // Fetch datasets from PostgreSQL
          const dbDatasets = await api.fetchDatasets();
          
          // Merge datasets from PostgreSQL and seed datasets:
          // 1. PostgreSQL datasets take precedence (contain persisted uploads)
          // 2. Any seed dataset not yet in PostgreSQL is preserved so options are never missing
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

          // Restore recent used dataset from localStorage or active state
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

          const effectiveDatasets = mergedDatasets;
          const datasetsMap = new Map<string, string>();
          effectiveDatasets.forEach(d => datasetsMap.set(d.datasetId, d.fileName));

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

          // Fetch runs and audit history
          const dbRuns = await api.fetchRuns(undefined, datasetsMap);
          if (dbRuns && dbRuns.length > 0) {
            setRuns(dbRuns);
            // Fetch issues for the recent active dataset if available
            const latestForActive = dbRuns.find(r => r.datasetId === selected?.datasetId);
            if (latestForActive) {
              const issues = await api.fetchRunIssues(latestForActive.runId);
              setCurrentIssues(issues);
            } else if (selected) {
              handleExecuteValidation(selected, effectiveRules);
            }
          } else if (selected) {
            handleExecuteValidation(selected, effectiveRules);
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

  // Validation execution (Backend with PostgreSQL persistence)
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

      setRuns(prev => [result.run, ...prev]);
      setCurrentIssues(result.issues);
    } catch (err) {
      console.warn('Falling back to client validation engine:', err);
      // Resilient fallback to client-side engine if backend call fails
      const nextRunNumber = runs.filter(r => r.datasetId === targetDataset.datasetId).length + 1;
      const { run, issues } = clientRunValidation(targetDataset, targetRules, nextRunNumber);
      setRuns(prev => [run, ...prev]);
      setCurrentIssues(issues);
    } finally {
      setIsValidating(false);
    }
  }, [activeDataset, rules, runs]);

  // Switch dataset
  const handleSelectDataset = async (id: string) => {
    setActiveDatasetId(id);
    const chosen = datasets.find(d => d.datasetId === id);
    if (!chosen) return;

    try {
      localStorage.setItem('silentguard_active_dataset_id', chosen.datasetId);
      localStorage.setItem('silentguard_active_dataset_name', chosen.fileName);
    } catch {}

    // Load matching preset if applicable
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

    // Look for existing runs for this dataset
    const existingRun = runs.find(r => r.datasetId === id);
    if (existingRun) {
      try {
        const issues = await api.fetchRunIssues(existingRun.runId);
        setCurrentIssues(issues);
      } catch (e) {
        console.warn('Could not fetch issues for existing run:', e);
      }
    } else {
      handleExecuteValidation(chosen, newRules);
    }
  };

  // Rule operations
  const handleToggleRule = async (ruleId: string) => {
    const updated = rules.map(r => r.ruleId === ruleId ? { ...r, enabled: !r.enabled } : r);
    setRules(updated);

    try {
      await api.toggleRule(ruleId);
    } catch (e) {
      console.warn('Rule toggle backend sync failed:', e);
    }

    handleExecuteValidation(activeDataset, updated);
  };

  const handleAddRule = async (newRule: ValidationRule) => {
    const updated = [newRule, ...rules];
    setRules(updated);

    try {
      await api.saveRule(newRule);
    } catch (e) {
      console.warn('Rule save backend sync failed:', e);
    }

    handleExecuteValidation(activeDataset, updated);
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

    handleExecuteValidation(activeDataset, updated);
  };

  const handleDeleteRule = async (ruleId: string) => {
    const updated = rules.filter(r => r.ruleId !== ruleId);
    setRules(updated);

    try {
      await api.deleteRule(ruleId);
    } catch (e) {
      console.warn('Rule delete backend sync failed:', e);
    }

    handleExecuteValidation(activeDataset, updated);
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = RULE_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    setActivePresetId(presetId);
    setRules([...preset.rules]);

    // Align with the corresponding demo dataset if available
    const matchingDataset = datasets.find(d => {
      const name = d.fileName.toLowerCase();
      if (presetId === 'preset-employee') return name.includes('employee');
      if (presetId === 'preset-motherson-parts') return name.includes('motherson') || name.includes('parts');
      if (presetId === 'preset-financial-orders') return name.includes('financial') || name.includes('order');
      return false;
    });

    const targetDataset = matchingDataset || activeDataset;
    if (matchingDataset && matchingDataset.datasetId !== activeDatasetId) {
      setActiveDatasetId(matchingDataset.datasetId);
      try {
        localStorage.setItem('silentguard_active_dataset_id', matchingDataset.datasetId);
        localStorage.setItem('silentguard_active_dataset_name', matchingDataset.fileName);
      } catch {}
    }

    handleExecuteValidation(targetDataset, [...preset.rules]);
  };

  // Update rule reference list (e.g. when department directory expands)
  const handleUpdateRuleReferenceList = (ruleId: string, newList: string[]) => {
    const updated = rules.map(r => r.ruleId === ruleId ? { ...r, referenceList: newList } : r);
    setRules(updated);
    handleExecuteValidation(activeDataset, updated);
  };

  // Dataset in-place correction and dynamic column revalidation
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

    handleExecuteValidation(updatedDataset, rules);
  };

  // Add new uploaded dataset (persisted in PostgreSQL)
  const handleDatasetCreated = (newDataset: Dataset, suggestedPresetId?: string) => {
    // Replace any previous dataset with the same filename to ensure no duplicates
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

    let nextRules = [...rules];
    if (suggestedPresetId) {
      setActivePresetId(suggestedPresetId);
      const preset = RULE_PRESETS.find(p => p.id === suggestedPresetId);
      if (preset) {
        nextRules = [...preset.rules];
        setRules(nextRules);
      }
    }

    handleExecuteValidation(newDataset, nextRules);
    setActiveTab('dashboard');
  };

  // Handle Issue Resolution Comment & Status (persisted to PostgreSQL)
  const handleUpdateResolution = async (issueId: string, status: ResolutionStatus, comment: string) => {
    // Update issue status
    setCurrentIssues(prev => prev.map(i => i.issueId === issueId ? { ...i, resolutionStatus: status } : i));

    if (selectedIssue && selectedIssue.issueId === issueId) {
      setSelectedIssue(prev => prev ? { ...prev, resolutionStatus: status } : null);
    }

    const newHistory: ResolutionHistory = {
      resolutionId: `res-${Date.now()}`,
      issueId,
      resolvedBy: 'Data Steward (QA Team)',
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

  // Edit existing audit log status & comment
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

  // Delete an audit log
  const handleDeleteAuditLog = async (resolutionId: string) => {
    setResolutionHistories(prev => prev.filter(log => log.resolutionId !== resolutionId));

    try {
      await api.deleteResolution(resolutionId);
    } catch (e) {
      console.warn('Resolution history delete backend sync failed:', e);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col selection:bg-indigo-500/30">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeDataset={activeDataset}
        latestRun={latestRun}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenDisambiguator={() => {
          setDisambiguatorValue('120');
          setIsDisambiguatorOpen(true);
        }}
        onRunValidation={() => handleExecuteValidation()}
        isValidating={isValidating}
        totalDatasetsCount={datasets.length}
        onSelectDataset={handleSelectDataset}
        allDatasets={datasets}
        backendHealth={backendHealth}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            activeDataset={activeDataset}
            latestRun={latestRun}
            issues={currentIssues}
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
            issues={currentIssues}
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
          />
        )}

        {activeTab === 'export' && (
          <ExportAuditView
            dataset={activeDataset}
            latestRun={latestRun}
            issues={currentIssues}
            rules={rules}
            resolutionHistories={resolutionHistories}
            onEditAuditLog={handleEditAuditLog}
            onDeleteAuditLog={handleDeleteAuditLog}
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
      />

      <ContextualDisambiguatorModal
        isOpen={isDisambiguatorOpen}
        onClose={() => setIsDisambiguatorOpen(false)}
        dataset={activeDataset}
        rules={rules}
        initialValue={disambiguatorValue}
      />

      <footer className="border-t border-slate-800/80 bg-[#0f172a]/60 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 font-mono">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-400">SilentGuard</span>
            <span>•</span>
            <span>Data Quality &amp; Silent Failure Detection Engine</span>
          </div>
          <div>
            Built with React, Spring Boot &amp; PostgreSQL 16
          </div>
        </div>
      </footer>
    </div>
  );
}

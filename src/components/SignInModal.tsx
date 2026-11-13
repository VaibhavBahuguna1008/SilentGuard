import React, { useState } from 'react';
import { 
  ShieldCheck, 
  UserCheck, 
  Mail, 
  Building2, 
  AlertCircle, 
  ArrowRight,
  Shield,
  Users,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { EmployeeUser, UserRole } from '../types';
import { authService, ROLE_DETAILS } from '../services/authService';

interface SignInModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSignIn: (user: EmployeeUser) => void;
  canDismiss?: boolean;
}

export const SignInModal: React.FC<SignInModalProps> = ({
  isOpen,
  onClose,
  onSignIn,
  canDismiss = false
}) => {
  if (!isOpen) return null;

  const [selectedCategory, setSelectedCategory] = useState<UserRole>('ADMIN');
  const [manualIdentifier, setManualIdentifier] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const employees = authService.getEmployees();

  // Filter employees for the selected category
  const categoryEmployees = employees.filter(
    e => e.role === selectedCategory && e.status === 'ACTIVE'
  );

  const handleSelectEmployee = (user: EmployeeUser) => {
    setErrorMessage(null);
    const loggedIn = authService.setCurrentUser(user.id);
    if (loggedIn) {
      onSignIn(loggedIn);
      if (onClose) onClose();
    } else {
      setErrorMessage('Could not sign in with this account. Please try again.');
    }
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!manualIdentifier.trim()) {
      setErrorMessage('Please enter your Motherson corporate email or employee ID.');
      return;
    }

    const user = authService.login(manualIdentifier);
    if (!user) {
      setErrorMessage('No authorized employee account found with that email or ID. Contact your Motherson Quality Administrator.');
      return;
    }

    if (user.status !== 'ACTIVE') {
      setErrorMessage(`Account for ${user.name} is currently suspended.`);
      return;
    }

    onSignIn(user);
    if (onClose) onClose();
  };

  const categories: Array<{ role: UserRole; title: string; subtitle: string }> = [
    { 
      role: 'ADMIN', 
      title: 'Administrator', 
      subtitle: 'System governance, user onboarding & full rule management' 
    },
    { 
      role: 'STEWARD', 
      title: 'Lead Data Steward', 
      subtitle: 'Data ingestion, rule tuning & defect remediation' 
    },
    { 
      role: 'VIEWER', 
      title: 'Plant Quality Viewer', 
      subtitle: 'Read-only quality audit inspection & report downloads' 
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center pb-5 border-b border-slate-200 dark:border-[#242630]">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-500 border border-red-200 dark:border-red-500/30 flex items-center justify-center mx-auto mb-3 shadow-2xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Motherson SilentGuard Sign-In
          </h3>
          <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1">
            Industrial Quality Gateway • Role-Based Authentication
          </p>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-rose-500/10 border border-red-200 dark:border-rose-500/20 text-red-700 dark:text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Category Tabs */}
        <div className="mt-5">
          <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-2">
            Select Employee Role Category:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.role;
              const count = employees.filter(e => e.role === cat.role && e.status === 'ACTIVE').length;
              return (
                <button
                  key={cat.role}
                  type="button"
                  onClick={() => { setSelectedCategory(cat.role); setErrorMessage(null); }}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                    isSelected
                      ? 'border-red-600 bg-red-50/70 dark:bg-red-950/30 shadow-xs'
                      : 'border-slate-200 dark:border-[#242630] bg-white dark:bg-[#0b0c0e] hover:border-slate-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold block ${isSelected ? 'text-red-700 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                      {cat.title}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                      {count}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 block mt-1 leading-tight line-clamp-2">
                    {cat.subtitle}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Employees in Selected Category */}
        <div className="mt-5 space-y-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block">
            Authorized {ROLE_DETAILS[selectedCategory].label} Accounts:
          </label>

          {categoryEmployees.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0e0f13] text-center text-xs text-slate-500 dark:text-zinc-500 border border-slate-200 dark:border-[#242630]">
              No active employees in this category yet. Sign in as Administrator to onboard new team members.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {categoryEmployees.map((emp) => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => handleSelectEmployee(emp)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-[#242630] bg-slate-50/50 hover:bg-red-50/40 dark:bg-[#0e0f13] dark:hover:bg-zinc-800/60 hover:border-red-500 dark:hover:border-red-500/40 text-left transition cursor-pointer flex items-center justify-between group shadow-2xs"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${emp.avatarColor || 'from-red-500 to-rose-600'} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs`}>
                      {emp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition">
                          {emp.name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                          {emp.employeeId}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono mt-0.5">
                        {emp.email} • {emp.division}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-red-600 dark:text-red-400 group-hover:translate-x-0.5 transition shrink-0">
                    <span>Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Alternative: Enter corporate Email or Employee ID */}
        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-[#242630]">
          <form onSubmit={handleManualLogin} className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
              Or Sign In with Corporate Email / Employee ID:
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. priya.patel@motherson.com or MS-ENG-104"
                  value={manualIdentifier}
                  onChange={(e) => setManualIdentifier(e.target.value)}
                  className="w-full bg-white dark:bg-[#0b0c0e] border border-slate-200 dark:border-[#242630] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-red-600 font-mono shadow-2xs"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#e31b23] hover:bg-[#c41219] text-white transition cursor-pointer shrink-0 border border-red-500/30"
              >
                Sign In
              </button>
            </div>
          </form>
        </div>

        {canDismiss && onClose && (
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-[#242630] flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  UserCheck, 
  Lock, 
  Mail, 
  Building2, 
  MapPin, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight,
  Sparkles,
  LogOut,
  UserPlus
} from 'lucide-react';
import { EmployeeUser, UserRole } from '../types';
import { authService, ROLE_DETAILS, isAuthorizedMothersonEmail } from '../services/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: EmployeeUser;
  onUserChanged: (user: EmployeeUser) => void;
  onOpenOnboardModal?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChanged,
  onOpenOnboardModal
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'switch' | 'login'>('switch');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const employees = authService.getEmployees();

  const handleSelectUser = (user: EmployeeUser) => {
    if (user.status !== 'ACTIVE') {
      setLoginError(`Account for ${user.name} is currently suspended. Contact your administrator.`);
      return;
    }
    const updated = authService.setCurrentUser(user.id);
    if (updated) {
      onUserChanged(updated);
      onClose();
    }
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!loginIdentifier.trim()) {
      setLoginError('Please enter your Motherson corporate email or employee ID.');
      return;
    }

    const user = authService.login(loginIdentifier);
    if (!user) {
      setLoginError('No authorized employee account found. Ensure you are using an authorized @motherson.com credential or ask an Admin to onboard your account.');
      return;
    }

    if (user.status !== 'ACTIVE') {
      setLoginError('This account is suspended. Please contact your Motherson Quality Administrator.');
      return;
    }

    onUserChanged(user);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-[#242630]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 flex items-center justify-center text-red-600 dark:text-red-500">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Motherson Employee Authentication
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Corporate Single Sign-On &amp; Role-Based Access Control
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active User Banner */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-[#0e0f13] border border-slate-200 dark:border-[#242630] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${currentUser.avatarColor || 'from-red-500 to-rose-600'} text-white font-bold text-xs flex items-center justify-center shadow-xs`}>
              {currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">{currentUser.name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${ROLE_DETAILS[currentUser.role].badgeClass} ${ROLE_DETAILS[currentUser.role].badgeDarkClass}`}>
                  {ROLE_DETAILS[currentUser.role].label}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                {currentUser.employeeId} • {currentUser.email}
              </span>
            </div>
          </div>

          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Active Session
          </span>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 dark:border-[#242630] mt-4">
          <button
            onClick={() => { setActiveTab('switch'); setLoginError(null); }}
            className={`py-2 px-4 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'switch'
                ? 'border-red-600 text-red-600 dark:text-red-400'
                : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Switch Configured Profile ({employees.length})
          </button>
          <button
            onClick={() => { setActiveTab('login'); setLoginError(null); }}
            className={`py-2 px-4 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'login'
                ? 'border-red-600 text-red-600 dark:text-red-400'
                : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Motherson Employee Login
          </button>
        </div>

        {loginError && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-rose-500/10 border border-red-200 dark:border-rose-500/20 text-red-700 dark:text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{loginError}</span>
          </div>
        )}

        {/* Switch Profile Tab */}
        {activeTab === 'switch' && (
          <div className="mt-4 space-y-2.5">
            <p className="text-xs text-slate-600 dark:text-zinc-400 mb-2">
              Select any preconfigured Motherson corporate profile to simulate different operational roles:
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {employees.map((emp) => {
                const isSelected = emp.id === currentUser.id;
                const roleMeta = ROLE_DETAILS[emp.role];

                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => handleSelectUser(emp)}
                    className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'border-red-600 bg-red-50/60 dark:bg-red-950/20'
                        : 'border-slate-200 dark:border-[#242630] bg-white dark:bg-[#0e0f13] hover:border-slate-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${emp.avatarColor || 'from-red-500 to-rose-600'} text-white font-bold text-xs flex items-center justify-center shrink-0`}>
                        {emp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{emp.name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${roleMeta.badgeClass} ${roleMeta.badgeDarkClass}`}>
                            {roleMeta.label}
                          </span>
                          {emp.status === 'SUSPENDED' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 font-bold">
                              SUSPENDED
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                          <span>{emp.employeeId}</span>
                          <span className="mx-1.5">•</span>
                          <span>{emp.division}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {isSelected ? (
                        <span className="text-[11px] font-bold text-red-600 dark:text-red-400">Current</span>
                      ) : (
                        <span className="text-xs text-slate-400 group-hover:text-slate-600 dark:text-zinc-500 dark:group-hover:text-zinc-300">
                          Select &rarr;
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {onOpenOnboardModal && (
              <div className="pt-3 border-t border-slate-200 dark:border-[#242630] flex justify-between items-center">
                <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Administrator privileges allow adding custom employees.
                </span>
                <button
                  onClick={() => {
                    onClose();
                    onOpenOnboardModal();
                  }}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Onboard New Employee</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Employee Login Tab */}
        {activeTab === 'login' && (
          <form onSubmit={handleManualLogin} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Motherson Corporate Email or Employee ID
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. priya.patel@motherson.com or MS-ENG-104"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full bg-white dark:bg-[#0b0c0e] border border-slate-200 dark:border-[#242630] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-red-600 shadow-2xs font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-500 mt-1">
                Access is restricted to authorized employees with verified @motherson.com domains.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0e0f13] border border-slate-200 dark:border-[#242630] text-[11px] text-slate-600 dark:text-zinc-400 space-y-1">
              <span className="font-semibold text-slate-800 dark:text-zinc-200 block">Single Sign-On Security Notice:</span>
              <span>Only authorized Motherson employees with active credentials in the organizational directory can access this application. Contact your system administrator for access requests.</span>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#e31b23] hover:bg-[#c41219] text-white shadow-sm shadow-red-950/30 transition cursor-pointer border border-red-500/30"
              >
                Authenticate &amp; Enter
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

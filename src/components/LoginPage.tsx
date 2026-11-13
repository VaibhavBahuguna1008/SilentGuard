import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  ArrowLeft, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Building2, 
  Sparkles,
  Sun,
  Moon,
  KeyRound
} from 'lucide-react';
import { EmployeeUser, UserRole } from '../types';
import { authService, ROLE_DETAILS, isAuthorizedMothersonEmail } from '../services/authService';
import mothersonLogo from '../assets/motherson-logo.png';

interface LoginPageProps {
  onLoginSuccess: (user: EmployeeUser) => void;
  onBackToLanding: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onBackToLanding,
  theme,
  onToggleTheme
}) => {
  const [selectedRoleCategory, setSelectedRoleCategory] = useState<UserRole>('ADMIN');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('••••••••');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const employees = authService.getEmployees();

  // Filter employees for the chosen category
  const roleEmployees = employees.filter(e => e.role === selectedRoleCategory && e.status === 'ACTIVE');

  const handleQuickFill = (emp: EmployeeUser) => {
    setSelectedRoleCategory(emp.role);
    setIdentifier(emp.email);
    setPassword('••••••••');
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim()) {
      setError('Please enter your Motherson corporate email or employee ID.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const user = authService.login(identifier);

      if (!user) {
        setIsLoading(false);
        setError('No authorized employee account found. Please verify your @motherson.com credentials or contact a system administrator.');
        return;
      }

      if (user.status !== 'ACTIVE') {
        setIsLoading(false);
        setError(`The account for ${user.name} is currently suspended. Access denied.`);
        return;
      }

      setIsLoading(false);
      onLoginSuccess(user);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0c0e] text-slate-900 dark:text-zinc-100 selection:bg-red-600 selection:text-white flex flex-col font-sans">
      {/* Top red corporate accent bar */}
      <div className="h-[2.5px] w-full bg-gradient-to-r from-red-600 via-red-500 to-red-700 fixed top-0 left-0 right-0 z-50" />

      {/* Header */}
      <header className="sticky top-[2.5px] z-40 bg-white/90 dark:bg-[#0c0d10]/90 backdrop-blur-md border-b border-slate-200 dark:border-[#22242d] shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center pr-3 border-r border-slate-200 dark:border-zinc-800">
              <img
                src={mothersonLogo}
                alt="Motherson"
                className="h-5 sm:h-6 w-auto object-contain select-none"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 border border-red-200 dark:bg-red-600/10 dark:border-red-500/30 dark:text-red-500 flex items-center justify-center shadow-2xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
                Silent<span className="text-[#e31b23] ml-0.5">Guard</span>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-[#242630] bg-white dark:bg-[#121317] hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition cursor-pointer"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4 text-slate-700" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>

            <button
              onClick={onBackToLanding}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer border border-slate-200 dark:border-[#242630]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Overview</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Form Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full relative z-10">
          <div className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-3xl p-6 sm:p-8 shadow-2xl">
            {/* Form Title */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-500 border border-red-200 dark:border-red-500/30 flex items-center justify-center mx-auto mb-3 shadow-md">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Employee Access Sign In
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Authorized Motherson Manufacturing &amp; Quality Governance
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3 rounded-xl bg-red-50 dark:bg-rose-500/10 border border-red-200 dark:border-rose-500/20 text-red-700 dark:text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Role Category Selector */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2">
                Select Your Access Role:
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-[#0b0c0e] p-1 rounded-xl border border-slate-200 dark:border-[#242630]">
                {(['ADMIN', 'STEWARD', 'VIEWER'] as UserRole[]).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setSelectedRoleCategory(role);
                      const matching = employees.find(e => e.role === role);
                      if (matching) handleQuickFill(matching);
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                      selectedRoleCategory === role
                        ? 'bg-white dark:bg-zinc-800 text-[#e31b23] dark:text-white shadow-2xs'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {ROLE_DETAILS[role].label.split(' ')[0]}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1.5 font-mono">
                {ROLE_DETAILS[selectedRoleCategory].description}
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Corporate Email or Employee ID
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. rajesh.sharma@motherson.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full bg-white dark:bg-[#0b0c0e] border border-slate-200 dark:border-[#242630] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-red-600 font-mono shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Password / Corporate Security PIN
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white dark:bg-[#0b0c0e] border border-slate-200 dark:border-[#242630] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-red-600 font-mono shadow-2xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center space-x-2 text-slate-600 dark:text-zinc-400 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-slate-300 text-red-600 focus:ring-red-500" />
                  <span>Remember session</span>
                </label>
                <span className="text-[11px] text-red-600 dark:text-red-400 font-mono">
                  SSO Enforced
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#e31b23] hover:bg-[#c41219] text-white shadow-md shadow-red-950/30 transition cursor-pointer flex items-center justify-center space-x-2 border border-red-500/30 disabled:opacity-50"
              >
                <span>{isLoading ? 'Verifying Credentials...' : 'Sign In to Gateway'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Quick Demo Fill Buttons */}
            <div className="mt-6 pt-5 border-t border-slate-200 dark:border-[#242630]">
              <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 uppercase tracking-wider block mb-2 font-bold">
                Quick-Sign In by Role:
              </span>
              <div className="space-y-1.5">
                {employees.slice(0, 3).map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => handleQuickFill(emp)}
                    className="w-full py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-[#242630] bg-slate-50 dark:bg-[#0e0f13] hover:bg-red-50/50 dark:hover:bg-zinc-800 text-left transition flex items-center justify-between text-xs cursor-pointer"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className="font-bold text-slate-900 dark:text-white">{emp.name}</span>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">({emp.employeeId})</span>
                    </div>
                    <span className="text-[10px] font-bold text-red-600 dark:text-red-400 font-mono">
                      {emp.role} &rarr;
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 dark:text-zinc-500 border-t border-slate-200 dark:border-[#232530]">
        Motherson SilentGuard • Restricted to authorized organizational employees
      </footer>
    </div>
  );
};

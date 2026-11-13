import React from 'react';
import { 
  X, 
  ShieldCheck, 
  Mail, 
  Building2, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  LogOut, 
  Key,
  Shield,
  Clock
} from 'lucide-react';
import { EmployeeUser } from '../types';
import { ROLE_DETAILS } from '../services/authService';

interface AccountShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: EmployeeUser;
  onSignOut: () => void;
}

export const AccountShowcaseModal: React.FC<AccountShowcaseModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSignOut
}) => {
  if (!isOpen) return null;

  const roleMeta = ROLE_DETAILS[currentUser.role];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-2xl max-w-md w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-[#242630]">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-red-600 dark:text-red-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Employee Account Profile
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Card */}
        <div className="mt-5 text-center">
          <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${currentUser.avatarColor || 'from-red-500 to-rose-600'} text-white font-extrabold text-xl flex items-center justify-center mx-auto shadow-md ring-4 ring-red-100 dark:ring-red-950/40`}>
            {currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>

          <h4 className="text-base font-bold text-slate-900 dark:text-white mt-3">
            {currentUser.name}
          </h4>

          <div className="mt-1 flex items-center justify-center gap-2">
            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold ${roleMeta.badgeClass} ${roleMeta.badgeDarkClass}`}>
              {roleMeta.label}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono mt-1">
            Motherson Employee ID: <strong className="text-slate-800 dark:text-zinc-200">{currentUser.employeeId}</strong>
          </p>
        </div>

        {/* Corporate Details Grid */}
        <div className="mt-5 space-y-2.5 bg-slate-50 dark:bg-[#0e0f13] p-4 rounded-xl border border-slate-200 dark:border-[#242630] text-xs">
          <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-zinc-800/60">
            <span className="text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              Corporate Email:
            </span>
            <span className="font-mono font-medium text-slate-900 dark:text-white">
              {currentUser.email}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-zinc-800/60">
            <span className="text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Operating Division:
            </span>
            <span className="font-medium text-slate-900 dark:text-white text-right max-w-[200px] truncate">
              {currentUser.division}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-zinc-800/60">
            <span className="text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              Plant Location:
            </span>
            <span className="font-medium text-slate-900 dark:text-white">
              {currentUser.plantLocation || 'Global Network'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Session Verified:
            </span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
              Authorized SSO
            </span>
          </div>
        </div>

        {/* Role Capabilities Summary */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-[#0e0f13] border border-slate-200 dark:border-[#242630]">
          <h5 className="text-xs font-bold text-slate-800 dark:text-zinc-200 mb-1.5 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-red-600 dark:text-red-500" />
            <span>Assigned Operational Scope:</span>
          </h5>
          <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed">
            {roleMeta.description}
          </p>
        </div>

        {/* Sign Out Action */}
        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-[#242630] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onSignOut();
            }}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out of Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};

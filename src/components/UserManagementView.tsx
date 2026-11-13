import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Shield, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  Building2, 
  MapPin, 
  Mail, 
  Sparkles, 
  RefreshCw,
  Eye,
  Key,
  Check,
  X
} from 'lucide-react';
import { EmployeeUser, UserRole } from '../types';
import { 
  authService, 
  ROLE_DETAILS, 
  ROLE_PERMISSIONS, 
  isAuthorizedMothersonEmail 
} from '../services/authService';

interface UserManagementViewProps {
  currentUser: EmployeeUser;
  onUserChanged: (user: EmployeeUser) => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  currentUser,
  onUserChanged
}) => {
  const [employees, setEmployees] = useState<EmployeeUser[]>(() => authService.getEmployees());
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New Employee Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('STEWARD');
  const [newDivision, setNewDivision] = useState('Automotive Systems Division');
  const [newPlant, setNewPlant] = useState('Noida Sector 81 Plant');
  const [formError, setFormError] = useState<string | null>(null);

  const refreshEmployees = () => {
    setEmployees(authService.getEmployees());
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const isAdmin = currentUser.role === 'ADMIN';

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (roleFilter !== 'ALL' && emp.role !== roleFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = emp.name.toLowerCase().includes(q);
        const matchesEmail = emp.email.toLowerCase().includes(q);
        const matchesId = emp.employeeId.toLowerCase().includes(q);
        const matchesDiv = emp.division.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesId && !matchesDiv) return false;
      }
      return true;
    });
  }, [employees, roleFilter, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: employees.length,
      admins: employees.filter(e => e.role === 'ADMIN').length,
      stewards: employees.filter(e => e.role === 'STEWARD').length,
      viewers: employees.filter(e => e.role === 'VIEWER').length,
      active: employees.filter(e => e.status === 'ACTIVE').length
    };
  }, [employees]);

  const handleOpenOnboardModal = () => {
    setNewName('');
    setNewEmail('');
    const randomNum = Math.floor(100 + Math.random() * 900);
    setNewEmployeeId(`MS-ENG-${randomNum}`);
    setNewRole('STEWARD');
    setNewDivision('Automotive Systems Division');
    setNewPlant('Noida Tech Center');
    setFormError(null);
    setIsOnboardModalOpen(true);
  };

  const handleQuickFillSample = () => {
    const sampleNames = [
      { name: 'Karan Mehra', email: 'karan.mehra@motherson.com', role: 'STEWARD' as UserRole, div: 'Wiring & Components Unit', plant: 'Pune Facility' },
      { name: 'Ananya Roy', email: 'ananya.roy@motherson.com', role: 'VIEWER' as UserRole, div: 'Polymer Inspection Lab', plant: 'Chennai Plant 2' },
      { name: 'Marcus Weber', email: 'marcus.weber@motherson.com', role: 'STEWARD' as UserRole, div: 'European Powertrain', plant: 'Stuttgart Plant' }
    ];
    const pick = sampleNames[Math.floor(Math.random() * sampleNames.length)];
    const randomNum = Math.floor(200 + Math.random() * 800);
    setNewName(pick.name);
    setNewEmail(pick.email);
    setNewEmployeeId(`MS-${pick.role === 'STEWARD' ? 'ENG' : 'AUDIT'}-${randomNum}`);
    setNewRole(pick.role);
    setNewDivision(pick.div);
    setNewPlant(pick.plant);
    setFormError(null);
  };

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isAdmin) {
      setFormError('Unauthorized: Only administrators can create or onboard new employee accounts.');
      return;
    }

    const res = authService.createEmployee({
      name: newName,
      email: newEmail,
      employeeId: newEmployeeId,
      role: newRole,
      division: newDivision,
      plantLocation: newPlant
    });

    if (!res.success) {
      setFormError(res.error || 'Failed to onboard employee.');
      return;
    }

    setIsOnboardModalOpen(false);
    refreshEmployees();
    showNotification('success', `Employee ${newName} (${res.user?.employeeId}) onboarded successfully!`);
  };

  const handleToggleStatus = (emp: EmployeeUser) => {
    if (!isAdmin) {
      showNotification('error', 'Only administrators can modify employee account status.');
      return;
    }
    if (emp.id === currentUser.id) {
      showNotification('error', 'You cannot suspend your own active account.');
      return;
    }

    const nextStatus = emp.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    authService.updateEmployee(emp.id, { status: nextStatus });
    refreshEmployees();
    showNotification('success', `Account for ${emp.name} set to ${nextStatus}.`);
  };

  const handleChangeRole = (emp: EmployeeUser, newRoleVal: UserRole) => {
    if (!isAdmin) {
      showNotification('error', 'Only administrators can change employee roles.');
      return;
    }
    if (emp.employeeId === 'MS-ADMIN-001' && newRoleVal !== 'ADMIN') {
      showNotification('error', 'Cannot demote the primary system administrator.');
      return;
    }

    authService.updateEmployee(emp.id, { role: newRoleVal });
    refreshEmployees();
    
    // If updating current user's role
    if (emp.id === currentUser.id) {
      const updated = authService.getCurrentUser();
      onUserChanged(updated);
    }
    showNotification('success', `Updated ${emp.name}'s role to ${ROLE_DETAILS[newRoleVal].label}.`);
  };

  const handleDeleteEmployee = (emp: EmployeeUser) => {
    if (!isAdmin) {
      showNotification('error', 'Only administrators can remove employee records.');
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently remove employee record for ${emp.name} (${emp.employeeId})?`)) {
      return;
    }

    const res = authService.deleteEmployee(emp.id);
    if (!res.success) {
      showNotification('error', res.error || 'Failed to delete employee.');
      return;
    }

    refreshEmployees();
    showNotification('success', `Employee record for ${emp.name} deleted.`);
  };

  const handleSwitchToUser = (emp: EmployeeUser) => {
    if (emp.status !== 'ACTIVE') {
      showNotification('error', 'Cannot switch to a suspended account.');
      return;
    }
    const user = authService.setCurrentUser(emp.id);
    if (user) {
      onUserChanged(user);
      showNotification('success', `Switched session to ${user.name} (${ROLE_DETAILS[user.role].label}).`);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset employee accounts to factory default seed list?')) {
      const restored = authService.resetDefaultAccounts();
      setEmployees(restored);
      onUserChanged(restored[0]);
      showNotification('success', 'Restored default Motherson employee directory.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-red-600 dark:text-red-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Motherson Employee Directory &amp; Access Control
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30 font-mono font-bold">
              RBAC Enforced
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 max-w-2xl">
            Only authorized Motherson employees can access the platform. Administrators can create employee accounts, assign role permissions, and control quality governance privileges.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleResetDefaults}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 transition cursor-pointer shadow-2xs"
            title="Reset to default seed employees"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset Directory</span>
          </button>

          <button
            onClick={handleOpenOnboardModal}
            disabled={!isAdmin}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#e31b23] hover:bg-[#c41219] text-white shadow-sm shadow-red-950/30 transition cursor-pointer border border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            title={isAdmin ? 'Onboard a new employee account' : 'Administrator role required to onboard accounts'}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Onboard New Employee</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center space-x-2 border transition ${
          notification.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
            : 'bg-red-50 dark:bg-rose-500/10 border-red-200 dark:border-rose-500/20 text-red-800 dark:text-rose-300'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-zinc-400 mb-1">Total Employees</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{stats.total}</div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
            {stats.active} Active accounts
          </div>
        </div>

        <div className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-zinc-400 mb-1">Administrators</div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 font-mono">{stats.admins}</div>
          <div className="text-[11px] text-slate-500 dark:text-zinc-500 mt-1">Full governance</div>
        </div>

        <div className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-zinc-400 mb-1">Lead Data Stewards</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 font-mono">{stats.stewards}</div>
          <div className="text-[11px] text-slate-500 dark:text-zinc-500 mt-1">Ingest &amp; Resolution</div>
        </div>

        <div className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 dark:text-zinc-400 mb-1">Plant Quality Viewers</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">{stats.viewers}</div>
          <div className="text-[11px] text-slate-500 dark:text-zinc-500 mt-1">Audit verification</div>
        </div>
      </div>

      {/* Employee List Table */}
      <div className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-2xl overflow-hidden shadow-sm">
        {/* Controls */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-[#0e0f13] border-b border-slate-200 dark:border-[#242630] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Configured Employee Accounts
            </h4>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-mono">
              {filteredEmployees.length} of {employees.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, ID, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-[#0b0c0e] border border-slate-200 dark:border-[#242630] rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-red-600 shadow-2xs font-mono"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-white dark:bg-[#0b0c0e] border border-slate-200 dark:border-[#242630] rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-red-600 cursor-pointer shadow-2xs font-semibold"
            >
              <option value="ALL">All Roles ({employees.length})</option>
              <option value="ADMIN">Administrators</option>
              <option value="STEWARD">Lead Data Stewards</option>
              <option value="VIEWER">Plant Auditors / Viewers</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-[#0b0c0e] text-slate-600 dark:text-zinc-400 font-mono text-[11px] border-b border-slate-200 dark:border-[#242630]">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Role &amp; Privilege</th>
                <th className="py-3 px-4">Division &amp; Plant</th>
                <th className="py-3 px-4 text-center">Account Status</th>
                <th className="py-3 px-4">Last Active</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#242630] text-slate-800 dark:text-zinc-200">
              {filteredEmployees.map((emp) => {
                const isCurrent = emp.id === currentUser.id;
                const roleMeta = ROLE_DETAILS[emp.role];

                return (
                  <tr key={emp.id} className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/30 transition">
                    {/* Employee Profile */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${emp.avatarColor || 'from-red-500 to-rose-600'} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs`}>
                          {emp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-slate-900 dark:text-white">{emp.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 font-bold">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono flex items-center space-x-2">
                            <span>{emp.employeeId}</span>
                            <span>•</span>
                            <span>{emp.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3 px-4">
                      {isAdmin ? (
                        <select
                          value={emp.role}
                          onChange={(e) => handleChangeRole(emp, e.target.value as UserRole)}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-semibold cursor-pointer ${roleMeta.badgeClass} ${roleMeta.badgeDarkClass}`}
                        >
                          <option value="ADMIN">Administrator</option>
                          <option value="STEWARD">Lead Data Steward</option>
                          <option value="VIEWER">Plant Quality Viewer</option>
                        </select>
                      ) : (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${roleMeta.badgeClass} ${roleMeta.badgeDarkClass}`}>
                          {roleMeta.label}
                        </span>
                      )}
                    </td>

                    {/* Division */}
                    <td className="py-3 px-4 text-xs">
                      <div className="text-slate-800 dark:text-zinc-200 font-medium">{emp.division}</div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        <span>{emp.plantLocation || 'Global Network'}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(emp)}
                        disabled={!isAdmin || isCurrent}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition cursor-pointer disabled:cursor-not-allowed ${
                          emp.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
                            : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30'
                        }`}
                        title={isAdmin ? 'Click to toggle Active/Suspended status' : 'Admin privilege required'}
                      >
                        {emp.status}
                      </button>
                    </td>

                    {/* Last Active */}
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-zinc-400">
                      {emp.lastLogin ? new Date(emp.lastLogin).toLocaleDateString() : 'New Onboarding'}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {!isCurrent && emp.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleSwitchToUser(emp)}
                            className="px-2 py-1 rounded-lg text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition text-[11px] font-medium border border-slate-200 dark:border-[#242630]"
                            title={`Switch session to ${emp.name}`}
                          >
                            Switch To
                          </button>
                        )}

                        {isAdmin && !isCurrent && emp.employeeId !== 'MS-ADMIN-001' && (
                          <button
                            onClick={() => handleDeleteEmployee(emp)}
                            className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                            title="Delete employee account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Permissions Matrix Card */}
      <div className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-2xl p-5 shadow-sm">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center space-x-2">
          <Shield className="w-4 h-4 text-red-600 dark:text-red-500" />
          <span>Role-Based Access Control (RBAC) Governance Matrix</span>
        </h4>
        <p className="text-xs text-slate-600 dark:text-zinc-400 mb-4">
          Defines operational boundaries and compliance authorities for Motherson quality gateway operations.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-[#0e0f13] text-slate-600 dark:text-zinc-400 font-mono text-[11px] border-b border-slate-200 dark:border-[#242630]">
              <tr>
                <th className="py-2.5 px-3">System Capability</th>
                <th className="py-2.5 px-3 text-center text-purple-700 dark:text-purple-400">Administrator</th>
                <th className="py-2.5 px-3 text-center text-blue-700 dark:text-blue-400">Lead Data Steward</th>
                <th className="py-2.5 px-3 text-center text-emerald-700 dark:text-emerald-400">Plant Quality Viewer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#242630] text-slate-800 dark:text-zinc-200">
              <tr>
                <td className="py-2.5 px-3 font-medium">Onboard &amp; Manage Employee Accounts</td>
                <td className="py-2.5 px-3 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center"><X className="w-4 h-4 text-slate-400 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center"><X className="w-4 h-4 text-slate-400 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Upload CSV and Excel (XLSX) Files</td>
                <td className="py-2.5 px-3 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center"><X className="w-4 h-4 text-slate-400 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Configure Rules, Boundary Limits &amp; Presets</td>
                <td className="py-2.5 px-3 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center"><X className="w-4 h-4 text-slate-400 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Auto-Fix, Resolve &amp; Waive Defects</td>
                <td className="py-2.5 px-3 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center"><X className="w-4 h-4 text-slate-400 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Delete Audit History Logs</td>
                <td className="py-2.5 px-3 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center"><X className="w-4 h-4 text-slate-400 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center"><X className="w-4 h-4 text-slate-400 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Download Official PDF Audit Report &amp; Excel Workbooks</td>
                <td className="py-2.5 px-3 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
                <td className="py-2.5 px-3 text-center"><Check className="w-4 h-4 text-emerald-600 mx-auto" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboard Employee Modal */}
      {isOnboardModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-[#242630]">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-red-600 dark:text-red-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Onboard Motherson Employee
                </h3>
              </div>
              <button
                onClick={() => setIsOnboardModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-rose-500/10 border border-red-200 dark:border-rose-500/20 text-red-700 dark:text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={handleQuickFillSample}
                className="inline-flex items-center space-x-1.5 text-xs text-red-600 dark:text-red-400 hover:underline font-semibold"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Fill Sample Employee</span>
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="mt-2 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-zinc-300 font-medium mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Malhotra"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-white dark:bg-[#0b0c0e] border border-slate-200 dark:border-[#242630] rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-red-600 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-zinc-300 font-medium mb-1">
                    Corporate Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@motherson.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-white dark:bg-[#0b0c0e] border border-slate-200 dark:border-[#242630] rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-red-600 shadow-2xs"
                  />
                  <span className="text-[10px] text-slate-500 dark:text-zinc-500">
                    Must end with @motherson.com
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-zinc-300 font-medium mb-1">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="MS-ENG-901"
                    value={newEmployeeId}
                    onChange={(e) => setNewEmployeeId(e.target.value)}
                    className="w-full bg-white dark:bg-[#0b0c0e] border border-slate-200 dark:border-[#242630] rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-red-600 shadow-2xs uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-zinc-300 font-medium mb-1">
                  Assigned Role &amp; Governance Authority *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(['ADMIN', 'STEWARD', 'VIEWER'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setNewRole(r)}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                        newRole === r
                          ? 'border-red-600 bg-red-50/60 dark:bg-red-950/20'
                          : 'border-slate-200 dark:border-[#242630] bg-white dark:bg-[#0b0c0e]'
                      }`}
                    >
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {ROLE_DETAILS[r].label}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 block mt-0.5 leading-tight">
                        {r === 'ADMIN' ? 'Full admin' : (r === 'STEWARD' ? 'Ingest & fix' : 'Read-only')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-zinc-300 font-medium mb-1">
                    Operating Division
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Wiring Systems Division"
                    value={newDivision}
                    onChange={(e) => setNewDivision(e.target.value)}
                    className="w-full bg-white dark:bg-[#0b0c0e] border border-slate-200 dark:border-[#242630] rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-red-600 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-zinc-300 font-medium mb-1">
                    Plant Facility / Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Noida Sector 81 Plant"
                    value={newPlant}
                    onChange={(e) => setNewPlant(e.target.value)}
                    className="w-full bg-white dark:bg-[#0b0c0e] border border-slate-200 dark:border-[#242630] rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-red-600 shadow-2xs"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-200 dark:border-[#242630]">
                <button
                  type="button"
                  onClick={() => setIsOnboardModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#e31b23] hover:bg-[#c41219] text-white shadow-sm shadow-red-950/30 transition cursor-pointer border border-red-500/30"
                >
                  Complete Onboarding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

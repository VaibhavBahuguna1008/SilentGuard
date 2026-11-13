import { EmployeeUser, UserRole, AuthPermission } from '../types';

export const INITIAL_EMPLOYEES: EmployeeUser[] = [
  {
    id: 'emp-001',
    employeeId: 'MS-ADMIN-001',
    name: 'Vaibhav Bahuguna',
    email: 'vaibhav.bahuguna@motherson.com',
    role: 'ADMIN',
    division: 'MDTL - Motherson Digital Technology Limited',
    plantLocation: 'Sector 62, Noida',
    status: 'ACTIVE',
    createdDate: '2026-01-15T09:00:00.000Z',
    lastLogin: '2026-11-13T11:45:00.000Z',
    avatarColor: 'from-rose-500 to-red-600'
  },
  {
    id: 'emp-002',
    employeeId: 'MS-LEAD-101',
    name: 'Pranav Sharma',
    email: 'pranav.sharma@motherson.com',
    role: 'STEWARD',
    division: 'MDTL - Motherson Digital Technology Limited',
    plantLocation: 'Sector 62, Noida',
    status: 'ACTIVE',
    createdDate: '2026-02-10T11:30:00.000Z',
    lastLogin: '2026-11-13T11:15:00.000Z',
    avatarColor: 'from-blue-500 to-indigo-600'
  },
  {
    id: 'emp-003',
    employeeId: 'MS-PLANT-201',
    name: 'Khushi Tiwari',
    email: 'khushi.tiwari@motherson.com',
    role: 'VIEWER',
    division: 'MDTL - Motherson Digital Technology Limited',
    plantLocation: 'Sector 62, Noida',
    status: 'ACTIVE',
    createdDate: '2026-02-20T08:30:00.000Z',
    lastLogin: '2026-11-13T10:20:00.000Z',
    avatarColor: 'from-emerald-500 to-teal-600'
  },
  {
    id: 'emp-004',
    employeeId: 'MS-PLANT-202',
    name: 'Kiran Sharma',
    email: 'kiran.sharma@motherson.com',
    role: 'VIEWER',
    division: 'MDTL - Motherson Digital Technology Limited',
    plantLocation: 'Sector 62, Noida',
    status: 'ACTIVE',
    createdDate: '2026-03-01T08:00:00.000Z',
    lastLogin: '2026-11-12T16:20:00.000Z',
    avatarColor: 'from-amber-500 to-orange-600'
  },
  {
    id: 'emp-005',
    employeeId: 'MS-LEAD-102',
    name: 'Kanak Jain',
    email: 'kanak.jain@motherson.com',
    role: 'STEWARD',
    division: 'MDTL - Motherson Digital Technology Limited',
    plantLocation: 'Sector 62, Noida',
    status: 'ACTIVE',
    createdDate: '2026-03-15T09:40:00.000Z',
    lastLogin: '2026-11-13T09:10:00.000Z',
    avatarColor: 'from-purple-500 to-pink-600'
  },
  {
    id: 'emp-006',
    employeeId: 'MS-LEAD-103',
    name: 'Tushar Kumar',
    email: 'tushar.kumar@motherson.com',
    role: 'STEWARD',
    division: 'MDTL - Motherson Digital Technology Limited',
    plantLocation: 'Sector 62, Noida',
    status: 'ACTIVE',
    createdDate: '2026-04-18T14:10:00.000Z',
    lastLogin: '2026-11-13T08:30:00.000Z',
    avatarColor: 'from-cyan-500 to-blue-600'
  }
];

const STORAGE_USERS_KEY = 'silentguard_employee_accounts_v4';
const STORAGE_CURRENT_USER_KEY = 'silentguard_active_user_id_v4';

export const ROLE_DETAILS: Record<UserRole, {
  label: string;
  badgeClass: string;
  badgeDarkClass: string;
  description: string;
  capabilities: string[];
}> = {
  ADMIN: {
    label: 'Administrator',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    badgeDarkClass: 'dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/30',
    description: 'Full administrative governance, employee onboarding, access control, and complete audit lifecycle management.',
    capabilities: [
      'Create and onboard employee accounts',
      'Assign & revoke user roles',
      'Create, edit, toggle and delete validation rules',
      'Upload CSV and Excel datasets',
      'Resolve, waive, and delete audit records',
      'Export PDF, Excel, and JSON compliance packages'
    ]
  },
  STEWARD: {
    label: 'Lead Data Steward',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    badgeDarkClass: 'dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30',
    description: 'Quality engineering access: upload datasets, build and tune validation rules, execute runs, and resolve issues.',
    capabilities: [
      'Upload CSV and Excel datasets',
      'Configure validation rules and presets',
      'Execute dataset quality verification',
      'Auto-fix and manually resolve quality issues',
      'Add comments to audit trail',
      'Export PDF, Excel, and CSV reports'
    ]
  },
  VIEWER: {
    label: 'Plant Auditor / Viewer',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeDarkClass: 'dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
    description: 'Read-only quality inspection: view dashboards, explore data, review historical runs, and download audit reports.',
    capabilities: [
      'View quality health dashboards and metrics',
      'Inspect dataset columns and raw data',
      'Inspect flagged issues and silent failures',
      'Review historical runs and trend analytics',
      'Download signed PDF audit certificates and clean spreadsheets'
    ]
  }
};

export const ROLE_PERMISSIONS: Record<UserRole, AuthPermission[]> = {
  ADMIN: [
    'upload_data',
    'manage_rules',
    'resolve_issues',
    'manage_users',
    'delete_audit',
    'export_reports',
    'view_data'
  ],
  STEWARD: [
    'upload_data',
    'manage_rules',
    'resolve_issues',
    'export_reports',
    'view_data'
  ],
  VIEWER: [
    'export_reports',
    'view_data'
  ]
};

export function hasPermission(user: EmployeeUser | null, permission: AuthPermission): boolean {
  if (!user) return false;
  if (user.status !== 'ACTIVE') return false;
  const perms = ROLE_PERMISSIONS[user.role] || [];
  return perms.includes(permission);
}

export function isAuthorizedMothersonEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const allowedDomains = [
    'motherson.com',
    'mind-infotech.com',
    'motherson-group.com',
    'smr-automotive.com',
    'smp-automotive.com'
  ];
  return allowedDomains.some(domain => normalized.endsWith(`@${domain}`));
}

export const authService = {
  getEmployees(): EmployeeUser[] {
    try {
      const stored = localStorage.getItem(STORAGE_USERS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to read stored employees, falling back to seed', e);
    }
    // Seed initial employees
    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(INITIAL_EMPLOYEES));
    } catch {}
    return [...INITIAL_EMPLOYEES];
  },

  getCurrentUser(): EmployeeUser {
    const employees = this.getEmployees();
    try {
      const currentId = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
      if (currentId) {
        const found = employees.find(e => e.id === currentId && e.status === 'ACTIVE');
        if (found) return found;
      }
    } catch {}
    // Default to Vaibhav Bahuguna (Admin)
    return employees[0] || INITIAL_EMPLOYEES[0];
  },

  setCurrentUser(userId: string): EmployeeUser | null {
    const employees = this.getEmployees();
    const user = employees.find(e => e.id === userId);
    if (!user) return null;
    try {
      localStorage.setItem(STORAGE_CURRENT_USER_KEY, user.id);
      // Update last login
      const updated = employees.map(e => e.id === user.id ? { ...e, lastLogin: new Date().toISOString() } : e);
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(updated));
    } catch {}
    return user;
  },

  login(identifier: string): EmployeeUser | null {
    const cleanId = identifier.trim().toLowerCase();
    const employees = this.getEmployees();
    const found = employees.find(
      e => e.email.toLowerCase() === cleanId || e.employeeId.toLowerCase() === cleanId
    );
    if (!found) return null;
    return this.setCurrentUser(found.id);
  },

  createEmployee(employeeData: {
    name: string;
    email: string;
    employeeId: string;
    role: UserRole;
    division: string;
    plantLocation?: string;
  }): { success: boolean; user?: EmployeeUser; error?: string } {
    if (!employeeData.name.trim()) {
      return { success: false, error: 'Employee full name is required.' };
    }

    if (!isAuthorizedMothersonEmail(employeeData.email)) {
      return { 
        success: false, 
        error: 'Access restricted: Only corporate @motherson.com or group domain emails are authorized.' 
      };
    }

    const employees = this.getEmployees();
    const emailExists = employees.some(e => e.email.toLowerCase() === employeeData.email.trim().toLowerCase());
    if (emailExists) {
      return { success: false, error: 'An employee account with this email already exists.' };
    }

    const idExists = employees.some(e => e.employeeId.toLowerCase() === employeeData.employeeId.trim().toLowerCase());
    if (idExists) {
      return { success: false, error: 'Employee ID already exists. Please assign a unique Motherson ID.' };
    }

    const avatarGradients = [
      'from-rose-500 to-red-600',
      'from-blue-500 to-indigo-600',
      'from-emerald-500 to-teal-600',
      'from-amber-500 to-orange-600',
      'from-purple-500 to-pink-600',
      'from-cyan-500 to-blue-600'
    ];
    const avatarColor = avatarGradients[employees.length % avatarGradients.length];

    const newEmp: EmployeeUser = {
      id: `emp-${Date.now()}`,
      employeeId: employeeData.employeeId.trim().toUpperCase(),
      name: employeeData.name.trim(),
      email: employeeData.email.trim().toLowerCase(),
      role: employeeData.role,
      division: employeeData.division.trim() || 'Motherson Operations',
      plantLocation: employeeData.plantLocation?.trim() || 'Global Plant Network',
      status: 'ACTIVE',
      createdDate: new Date().toISOString(),
      avatarColor
    };

    const updated = [newEmp, ...employees];
    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(updated));
    } catch (e) {
      return { success: false, error: 'Failed to persist employee record in storage.' };
    }

    return { success: true, user: newEmp };
  },

  updateEmployee(id: string, updates: Partial<Pick<EmployeeUser, 'role' | 'status' | 'division' | 'plantLocation'>>): boolean {
    const employees = this.getEmployees();
    const updated = employees.map(e => {
      if (e.id === id) {
        return { ...e, ...updates };
      }
      return e;
    });

    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(updated));
      return true;
    } catch {
      return false;
    }
  },

  deleteEmployee(id: string): { success: boolean; error?: string } {
    const employees = this.getEmployees();
    const target = employees.find(e => e.id === id);
    if (!target) return { success: false, error: 'Employee not found.' };

    const current = this.getCurrentUser();
    if (current.id === id) {
      return { success: false, error: 'Cannot delete the currently signed-in employee account.' };
    }

    if (target.employeeId === 'MS-ADMIN-001') {
      return { success: false, error: 'The primary system administrator account cannot be deleted.' };
    }

    const updated = employees.filter(e => e.id !== id);
    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(updated));
      return { success: true };
    } catch {
      return { success: false, error: 'Failed to save deletion.' };
    }
  },

  resetDefaultAccounts(): EmployeeUser[] {
    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(INITIAL_EMPLOYEES));
      localStorage.setItem(STORAGE_CURRENT_USER_KEY, INITIAL_EMPLOYEES[0].id);
    } catch {}
    return [...INITIAL_EMPLOYEES];
  }
};

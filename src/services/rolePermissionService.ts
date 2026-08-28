import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { RoleDefinition, PermissionKey, UserRole } from '../types';
import { DEFAULT_SCHOOL_ID } from './schoolService';
import { cleanForFirestore } from '../utils/firestoreHelper';

export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  description: string;
  module:
    | 'Learners & Admissions'
    | 'Academics & CBC'
    | 'Finance & POS'
    | 'Operations & Logistics'
    | 'School Administration';
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  // Learners & Admissions
  {
    key: 'STUDENTS_VIEW',
    label: 'View Students Directory',
    description: 'Can search and view learner bio data, classes, and contact records.',
    module: 'Learners & Admissions',
  },
  {
    key: 'STUDENTS_MANAGE',
    label: 'Create, Edit & Transfer Students',
    description: 'Full create, edit, archive and transfer privileges for learners.',
    module: 'Learners & Admissions',
  },
  {
    key: 'ADMISSIONS_MANAGE',
    label: 'Manage Online Admissions',
    description: 'Review prospective parent applications, approve and enroll learners.',
    module: 'Learners & Admissions',
  },
  {
    key: 'PARENTS_MANAGE',
    label: 'Manage Parents & Guardians',
    description: 'Link parents to learners, update contacts and portal credentials.',
    module: 'Learners & Admissions',
  },

  // Academics & CBC
  {
    key: 'ACADEMICS_MANAGE',
    label: 'Manage Classes, Streams & CBC Subjects',
    description: 'Configure curriculum learning areas, teacher allocations and timetables.',
    module: 'Academics & CBC',
  },
  {
    key: 'ASSESSMENTS_RECORD',
    label: 'Enter Assessment Scores & Rubrics',
    description: 'Record formative and summative CBC competency evaluations.',
    module: 'Academics & CBC',
  },
  {
    key: 'ASSESSMENTS_MANAGE',
    label: 'Configure Grading Scales & Rubrics',
    description: 'Set up performance standards (EE, ME, AE, BE) and assessment periods.',
    module: 'Academics & CBC',
  },
  {
    key: 'REPORT_CARDS_GENERATE',
    label: 'Generate & Publish Terminal Report Cards',
    description: 'Batch produce official learner progress reports with teacher remarks.',
    module: 'Academics & CBC',
  },
  {
    key: 'ATTENDANCE_RECORD',
    label: 'Record Daily Roll Call',
    description: 'Take morning and afternoon attendance for classes and bus routes.',
    module: 'Academics & CBC',
  },
  {
    key: 'ATTENDANCE_VIEW',
    label: 'View Attendance Records',
    description: 'View attendance statistics, trends and absenteeism flags.',
    module: 'Academics & CBC',
  },

  // Finance & POS
  {
    key: 'FEES_MANAGE',
    label: 'Manage Fee Structures & Invoices',
    description: 'Set term fee items (Tuition, Transport, Meals, Uniforms) and generate invoices.',
    module: 'Finance & POS',
  },
  {
    key: 'FEES_COLLECT',
    label: 'Receive Payments & Issue Receipts',
    description: 'Post M-Pesa, Bank, and Cash receipts against student balances.',
    module: 'Finance & POS',
  },
  {
    key: 'POS_CASHIER',
    label: 'Operate Cashier POS Terminal',
    description: 'Process student purchases for uniform shop, bookshop, and canteen.',
    module: 'Finance & POS',
  },
  {
    key: 'POS_PRODUCTS_MANAGE',
    label: 'Manage POS Catalog & Pricing',
    description: 'Add new retail items, set barcode/prices and monitor cash drawer.',
    module: 'Finance & POS',
  },

  // Operations & Logistics
  {
    key: 'INVENTORY_MANAGE',
    label: 'Manage School Inventory & Assets',
    description: 'Track equipment, science apparatus, sports gear, and reorder levels.',
    module: 'Operations & Logistics',
  },
  {
    key: 'LIBRARY_MANAGE',
    label: 'Manage Library & Book Loans',
    description: 'Catalog reading books, issue loans to learners/teachers and track returns.',
    module: 'Operations & Logistics',
  },
  {
    key: 'TRANSPORT_MANAGE',
    label: 'Manage School Transport & Routes',
    description: 'Assign bus routes, drivers, fleet vehicles, and track stops.',
    module: 'Operations & Logistics',
  },
  {
    key: 'HEALTH_CLINIC_MANAGE',
    label: 'Manage Clinic & Health Incidents',
    description: 'Record first aid cases, allergies, medical referrals and notify parents.',
    module: 'Operations & Logistics',
  },
  {
    key: 'DISCIPLINE_MANAGE',
    label: 'Log Discipline Cases',
    description: 'Document behavioral incidents, disciplinary actions and resolution status.',
    module: 'Operations & Logistics',
  },

  // School Administration
  {
    key: 'STAFF_MANAGE',
    label: 'Manage Faculty & TSC Staff Directory',
    description: 'Add teachers, assign subjects/classes, manage payroll designations.',
    module: 'School Administration',
  },
  {
    key: 'COMMUNICATION_MANAGE',
    label: 'Publish Notices & Calendar Events',
    description: 'Broadcast alerts to parents, teachers, and public school website.',
    module: 'School Administration',
  },
  {
    key: 'WEBSITE_CMS_MANAGE',
    label: 'Manage Public Website CMS & Banners',
    description: 'Upload hero slides, typography styling, photo gallery, FAQs & Principal note.',
    module: 'School Administration',
  },
  {
    key: 'REPORTS_VIEW',
    label: 'Access Financial & Academic Reports',
    description: 'Export comprehensive CSV summaries, performance analytics and fee balances.',
    module: 'School Administration',
  },
  {
    key: 'SETTINGS_MANAGE',
    label: 'Configure School Settings & Branding',
    description: 'Update school details, logo, currency (KES), and academic term calendar.',
    module: 'School Administration',
  },
  {
    key: 'ROLES_PERMISSIONS_MANAGE',
    label: 'Manage Roles & Grant Permissions',
    description: 'Create custom roles, edit permission matrices and assign access.',
    module: 'School Administration',
  },
  {
    key: 'SUPER_ADMIN_MANAGE',
    label: 'Multi-Tenant SaaS Super Admin',
    description: 'Provision new school tenants and manage cross-tenant databases.',
    module: 'School Administration',
  },
];

export const DEFAULT_ROLES: RoleDefinition[] = [
  {
    id: 'role-super-admin',
    schoolId: DEFAULT_SCHOOL_ID,
    name: 'Super Admin',
    code: 'SUPER_ADMIN',
    description: 'Full unrestricted platform access across all schools, multi-tenant databases, and system modules.',
    category: 'ADMINISTRATIVE',
    isSystem: true,
    permissions: ALL_PERMISSIONS.map((p) => p.key),
    userCount: 2,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'role-school-admin',
    schoolId: DEFAULT_SCHOOL_ID,
    name: 'School Principal & Admin',
    code: 'SCHOOL_ADMIN',
    description: 'Comprehensive institutional authority over learners, faculty, finance, CBC academics, website CMS, and settings.',
    category: 'ADMINISTRATIVE',
    isSystem: true,
    permissions: [
      'STUDENTS_VIEW',
      'STUDENTS_MANAGE',
      'ADMISSIONS_MANAGE',
      'PARENTS_MANAGE',
      'STAFF_MANAGE',
      'ACADEMICS_MANAGE',
      'ASSESSMENTS_RECORD',
      'ASSESSMENTS_MANAGE',
      'REPORT_CARDS_GENERATE',
      'ATTENDANCE_RECORD',
      'ATTENDANCE_VIEW',
      'FEES_MANAGE',
      'FEES_COLLECT',
      'POS_CASHIER',
      'POS_PRODUCTS_MANAGE',
      'INVENTORY_MANAGE',
      'LIBRARY_MANAGE',
      'TRANSPORT_MANAGE',
      'HEALTH_CLINIC_MANAGE',
      'DISCIPLINE_MANAGE',
      'COMMUNICATION_MANAGE',
      'WEBSITE_CMS_MANAGE',
      'REPORTS_VIEW',
      'SETTINGS_MANAGE',
      'ROLES_PERMISSIONS_MANAGE',
    ],
    userCount: 3,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'role-teacher',
    schoolId: DEFAULT_SCHOOL_ID,
    name: 'Teacher / Facilitator',
    code: 'TEACHER',
    description: 'Assigned classroom management, CBC rubrics, attendance roll-call, report card inputs, and student observations.',
    category: 'ACADEMIC',
    isSystem: true,
    permissions: [
      'STUDENTS_VIEW',
      'ACADEMICS_MANAGE',
      'ASSESSMENTS_RECORD',
      'REPORT_CARDS_GENERATE',
      'ATTENDANCE_RECORD',
      'ATTENDANCE_VIEW',
      'LIBRARY_MANAGE',
      'DISCIPLINE_MANAGE',
      'COMMUNICATION_MANAGE',
    ],
    userCount: 42,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'role-accountant',
    schoolId: DEFAULT_SCHOOL_ID,
    name: 'Bursar & Accountant',
    code: 'ACCOUNTANT',
    description: 'Fee billing, M-Pesa receipting, student statement reconciliations, expense tracking, and financial reporting.',
    category: 'FINANCE',
    isSystem: true,
    permissions: [
      'STUDENTS_VIEW',
      'PARENTS_MANAGE',
      'FEES_MANAGE',
      'FEES_COLLECT',
      'POS_CASHIER',
      'POS_PRODUCTS_MANAGE',
      'INVENTORY_MANAGE',
      'REPORTS_VIEW',
    ],
    userCount: 4,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'role-cashier',
    schoolId: DEFAULT_SCHOOL_ID,
    name: 'POS Cashier / Storekeeper',
    code: 'CASHIER',
    description: 'Operate retail POS terminal for canteen, uniform shop and stationery items with instant receipt generation.',
    category: 'FINANCE',
    isSystem: true,
    permissions: [
      'STUDENTS_VIEW',
      'FEES_COLLECT',
      'POS_CASHIER',
      'INVENTORY_MANAGE',
    ],
    userCount: 6,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'role-librarian',
    schoolId: DEFAULT_SCHOOL_ID,
    name: 'Librarian & Resource Center',
    code: 'LIBRARIAN',
    description: 'Catalog storybooks, textbooks, reader series, manage learner/teacher loans, and track fines.',
    category: 'OPERATIONS',
    isSystem: true,
    permissions: [
      'STUDENTS_VIEW',
      'LIBRARY_MANAGE',
      'INVENTORY_MANAGE',
    ],
    userCount: 2,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'role-transport',
    schoolId: DEFAULT_SCHOOL_ID,
    name: 'Transport Manager',
    code: 'TRANSPORT_MANAGER',
    description: 'Manage school bus fleet, driver rosters, route pricing, and student pickup/dropoff zones.',
    category: 'OPERATIONS',
    isSystem: true,
    permissions: [
      'STUDENTS_VIEW',
      'TRANSPORT_MANAGE',
      'ATTENDANCE_VIEW',
    ],
    userCount: 3,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'role-nurse',
    schoolId: DEFAULT_SCHOOL_ID,
    name: 'School Nurse / Health Officer',
    code: 'NURSE',
    description: 'Maintain clinic records, treat first aid cases, manage allergies/medical charts, and dispatch alerts.',
    category: 'SUPPORT',
    isSystem: true,
    permissions: [
      'STUDENTS_VIEW',
      'HEALTH_CLINIC_MANAGE',
      'COMMUNICATION_MANAGE',
    ],
    userCount: 2,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'role-parent',
    schoolId: DEFAULT_SCHOOL_ID,
    name: 'Parent / Guardian',
    code: 'PARENT',
    description: 'Dedicated portal to view child attendance, term report cards, invoices, pay fees via M-Pesa, and read notices.',
    category: 'PORTAL',
    isSystem: true,
    permissions: ['ATTENDANCE_VIEW'],
    userCount: 520,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'role-student',
    schoolId: DEFAULT_SCHOOL_ID,
    name: 'Learner / Student',
    code: 'STUDENT',
    description: 'Dedicated student portal to view assignments, class timetable, library books, and exam grades.',
    category: 'PORTAL',
    isSystem: true,
    permissions: [],
    userCount: 680,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

export const rolePermissionService = {
  async getRoles(schoolId: string = DEFAULT_SCHOOL_ID): Promise<RoleDefinition[]> {
    try {
      const colRef = collection(db, 'schools', schoolId, 'roles');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const customRoles = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RoleDefinition));
        // Merge with system defaults if any are missing
        const systemRolesMissing = DEFAULT_ROLES.filter(
          (dr) => !customRoles.some((cr) => cr.id === dr.id || cr.code === dr.code)
        );
        return [...customRoles, ...systemRolesMissing];
      }
      return DEFAULT_ROLES.map((r) => ({ ...r, schoolId }));
    } catch (err) {
      console.warn('Error loading custom roles, falling back to defaults:', err);
      return DEFAULT_ROLES.map((r) => ({ ...r, schoolId }));
    }
  },

  async createRole(
    schoolId: string,
    roleData: Omit<RoleDefinition, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>
  ): Promise<RoleDefinition> {
    const roleId = `role-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newRole: RoleDefinition = {
      ...roleData,
      id: roleId,
      schoolId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const docRef = doc(db, 'schools', schoolId, 'roles', roleId);
      await setDoc(docRef, cleanForFirestore(newRole));
    } catch (err) {
      console.warn('Saved role in memory/local state:', err);
    }

    return newRole;
  },

  async updateRole(
    schoolId: string,
    roleId: string,
    updates: Partial<Omit<RoleDefinition, 'id' | 'schoolId' | 'createdAt'>>
  ): Promise<void> {
    try {
      const docRef = doc(db, 'schools', schoolId, 'roles', roleId);
      await setDoc(
        docRef,
        cleanForFirestore({
          ...updates,
          updatedAt: new Date().toISOString(),
        }),
        { merge: true }
      );
    } catch (err) {
      console.warn('Role update notice:', err);
    }
  },

  async deleteRole(schoolId: string, roleId: string): Promise<void> {
    try {
      const docRef = doc(db, 'schools', schoolId, 'roles', roleId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Role delete notice:', err);
    }
  },

  async initDefaultRoles(schoolId: string): Promise<void> {
    try {
      for (const role of DEFAULT_ROLES) {
        const docRef = doc(db, 'schools', schoolId, 'roles', role.id);
        await setDoc(docRef, { ...role, schoolId }, { merge: true });
      }
    } catch (err) {
      console.warn('Default roles initialization notice:', err);
    }
  },

  hasPermission(role: UserRole | string, permission: PermissionKey, customRoles: RoleDefinition[] = DEFAULT_ROLES): boolean {
    if (role === 'SUPER_ADMIN') return true;
    const matchingRole = customRoles.find((r) => r.code === role || r.id === role || r.name.toUpperCase() === role.toUpperCase());
    if (!matchingRole) return false;
    return matchingRole.permissions.includes(permission);
  },
};

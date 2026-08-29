import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { userService, CreateUserData } from '../../services/userService';
import { staffService } from '../../services/staffAndParentService';
import { authService } from '../../services/authService';
import { printerService } from '../../services/printerService';
import { UserProfile, UserRole, Staff } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import {
  UserPlus,
  Users,
  Search,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  Key,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  UserCheck,
  UserX,
  AlertTriangle,
  GraduationCap,
  DollarSign,
  HeartPulse,
  Bus,
  Library,
  BookOpen,
  Send,
  Eye,
  EyeOff,
  ExternalLink,
  Filter,
  Printer,
  FileText,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';

const ROLE_CONFIGS: Record<
  UserRole,
  { label: string; category: string; color: string; badgeVariant: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' }
> = {
  SUPER_ADMIN: { label: 'Super Administrator', category: 'System', color: 'bg-rose-900 text-rose-100', badgeVariant: 'danger' },
  SCHOOL_ADMIN: { label: 'School Admin', category: 'Management', color: 'bg-blue-900 text-blue-100', badgeVariant: 'primary' },
  HEADTEACHER: { label: 'Headteacher / Principal', category: 'Management', color: 'bg-indigo-900 text-indigo-100', badgeVariant: 'primary' },
  DEPUTY_HEADTEACHER: { label: 'Deputy Headteacher', category: 'Academic', color: 'bg-sky-900 text-sky-100', badgeVariant: 'info' },
  TEACHER: { label: 'Teacher / Facilitator', category: 'Academic', color: 'bg-emerald-900 text-emerald-100', badgeVariant: 'success' },
  ACCOUNTANT: { label: 'Bursar / Accountant', category: 'Finance', color: 'bg-amber-900 text-amber-100', badgeVariant: 'warning' },
  CASHIER: { label: 'POS Cashier', category: 'Finance', color: 'bg-amber-800 text-amber-100', badgeVariant: 'warning' },
  LIBRARIAN: { label: 'Librarian', category: 'Support', color: 'bg-cyan-900 text-cyan-100', badgeVariant: 'info' },
  TRANSPORT_MANAGER: { label: 'Transport Officer', category: 'Operations', color: 'bg-violet-900 text-violet-100', badgeVariant: 'info' },
  NURSE: { label: 'School Nurse / Clinic', category: 'Health', color: 'bg-rose-800 text-rose-100', badgeVariant: 'danger' },
  STOREKEEPER: { label: 'Storekeeper / Inventory', category: 'Operations', color: 'bg-teal-900 text-teal-100', badgeVariant: 'info' },
  RECEPTIONIST: { label: 'Front Office / Reception', category: 'Support', color: 'bg-slate-800 text-slate-100', badgeVariant: 'neutral' },
  PARENT: { label: 'Parent / Guardian', category: 'Portal', color: 'bg-pink-900 text-pink-100', badgeVariant: 'warning' },
  STUDENT: { label: 'Student / Learner', category: 'Portal', color: 'bg-purple-900 text-purple-100', badgeVariant: 'info' },
};

export const UsersView: React.FC = () => {
  const { school, switchRole, user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [seeding, setSeeding] = useState<boolean>(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState<boolean>(false);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [slipUser, setSlipUser] = useState<UserProfile | null>(null);
  const [slipPassword, setSlipPassword] = useState<string>('Password@2026');

  // Add User Form State
  const [addForm, setAddForm] = useState<{
    fullName: string;
    username: string;
    email: string;
    phone: string;
    role: UserRole;
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    staffId?: string;
    tempPassword: string;
    showPassword: boolean;
    sendInvite: boolean;
  }>({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    role: 'TEACHER',
    status: 'ACTIVE',
    staffId: '',
    tempPassword: 'Glcm@' + Math.floor(1000 + Math.random() * 9000),
    showPassword: false,
    sendInvite: true,
  });

  // Edit User Form State
  const [editForm, setEditForm] = useState<{
    fullName: string;
    username: string;
    email: string;
    phone: string;
    role: UserRole;
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    staffId?: string;
    newPassword?: string;
    showPassword?: boolean;
  }>({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    role: 'TEACHER',
    status: 'ACTIVE',
    staffId: '',
    newPassword: '',
    showPassword: false,
  });

  // Reset Password Modal State
  const [newCustomPassword, setNewCustomPassword] = useState<string>('Password@2026');
  const [showResetPassword, setShowResetPassword] = useState<boolean>(false);

  const [copiedPassword, setCopiedPassword] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, [school?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [userData, staffData] = await Promise.all([
        userService.getUsers(school?.id),
        school?.id ? staffService.getStaff(school.id) : Promise.resolve([]),
      ]);
      setUsers(userData);
      setStaffList(staffData);
    } catch (e: any) {
      showToast('Error loading user accounts: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePassword = () => {
    const randomPin = Math.floor(1000 + Math.random() * 9000);
    const newPass = `Glcm@${randomPin}`;
    setAddForm((prev) => ({ ...prev, tempPassword: newPass }));
    setCopiedPassword(false);
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(addForm.tempPassword);
    setCopiedPassword(true);
    showToast('Temporary password copied to clipboard!', 'info');
    setTimeout(() => setCopiedPassword(false), 2500);
  };

  const handleOpenAddModal = (prefillStaff?: Staff) => {
    const randomPin = Math.floor(1000 + Math.random() * 9000);
    const newPass = `Glcm@${randomPin}`;
    if (prefillStaff) {
      const rawUser = prefillStaff.fullName.toLowerCase().replace(/[^a-z0-9]/g, '.');
      setAddForm({
        fullName: prefillStaff.fullName,
        username: rawUser,
        email: prefillStaff.email || `${rawUser}@glcm.ac.ke`,
        phone: prefillStaff.phone || '',
        role: prefillStaff.role || 'TEACHER',
        status: 'ACTIVE',
        staffId: prefillStaff.id,
        tempPassword: newPass,
        showPassword: true,
        sendInvite: true,
      });
    } else {
      setAddForm({
        fullName: '',
        username: '',
        email: '',
        phone: '',
        role: 'TEACHER',
        status: 'ACTIVE',
        staffId: '',
        tempPassword: newPass,
        showPassword: true,
        sendInvite: true,
      });
    }
    setIsAddModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.fullName.trim()) {
      showToast('Please enter full name.', 'warning');
      return;
    }

    setActionLoading(true);
    try {
      const fallbackEmail =
        addForm.email.trim() ||
        `${(addForm.username || addForm.fullName).toLowerCase().replace(/[^a-z0-9]/g, '.')}@glcm.ac.ke`;

      const created = await userService.createUser({
        fullName: addForm.fullName.trim(),
        username: addForm.username.trim() || undefined,
        email: fallbackEmail,
        phone: addForm.phone.trim() || undefined,
        role: addForm.role,
        status: addForm.status,
        schoolId: school?.id,
        staffId: addForm.staffId || undefined,
        password: addForm.tempPassword,
        tempPassword: addForm.tempPassword,
      });

      showToast(`User login created for ${created.fullName}!`, 'success');
      setIsAddModalOpen(false);
      
      // Prompt credential slip
      setSlipUser(created);
      setSlipPassword(addForm.tempPassword);
      setIsSlipModalOpen(true);

      await loadData();
    } catch (e: any) {
      showToast('Error creating user account: ' + e.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEditModal = (u: UserProfile) => {
    setSelectedUser(u);
    setEditForm({
      fullName: u.fullName || '',
      username: u.username || u.email.split('@')[0],
      email: u.email || '',
      phone: u.phone || '',
      role: u.role || 'TEACHER',
      status: u.status || 'ACTIVE',
      staffId: u.staffId || '',
      newPassword: '',
      showPassword: false,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setActionLoading(true);
    try {
      await userService.updateUser(selectedUser.id, {
        fullName: editForm.fullName,
        username: editForm.username,
        email: editForm.email,
        phone: editForm.phone || undefined,
        role: editForm.role,
        status: editForm.status,
        staffId: editForm.staffId || undefined,
      });

      if (editForm.newPassword?.trim()) {
        await userService.setUserPassword(selectedUser.id, editForm.newPassword.trim());
      }

      showToast(`User profile for ${editForm.fullName} updated!`, 'success');
      setIsEditModalOpen(false);
      setSelectedUser(null);
      await loadData();
    } catch (e: any) {
      showToast('Error updating user: ' + e.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (u: UserProfile) => {
    try {
      const nextStatus = await userService.toggleUserStatus(u.id, u.status);
      showToast(`Account for ${u.fullName} is now ${nextStatus}.`, 'info');
      await loadData();
    } catch (e: any) {
      showToast('Error updating account status: ' + e.message, 'error');
    }
  };

  const handleOpenDeleteModal = (u: UserProfile) => {
    setSelectedUser(u);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await userService.deleteUser(selectedUser.id);
      showToast(`User ${selectedUser.fullName} removed.`, 'info');
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
      await loadData();
    } catch (e: any) {
      showToast('Error deleting user: ' + e.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenResetPasswordModal = (u: UserProfile) => {
    setSelectedUser(u);
    const randomPin = Math.floor(1000 + Math.random() * 9000);
    setNewCustomPassword(`Glcm@${randomPin}`);
    setShowResetPassword(true);
    setIsResetPasswordModalOpen(true);
  };

  const handleSaveNewPassword = async () => {
    if (!selectedUser) return;
    if (!newCustomPassword.trim()) {
      showToast('Please enter a new password.', 'warning');
      return;
    }

    setActionLoading(true);
    try {
      await userService.setUserPassword(selectedUser.id, newCustomPassword.trim());
      showToast(`Password successfully updated for ${selectedUser.fullName}!`, 'success');
      
      // Offer login slip
      setSlipUser(selectedUser);
      setSlipPassword(newCustomPassword.trim());
      setIsResetPasswordModalOpen(false);
      setIsSlipModalOpen(true);
      await loadData();
    } catch (e: any) {
      showToast('Error setting password: ' + e.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrintSlip = (u: UserProfile, pass?: string) => {
    printerService.printUserCredentialSlip(u, pass || u.plainPasswordForAdmin || 'Password@2026', school);
    showToast(`Printing login credential slip for ${u.fullName}...`, 'info');
  };

  const handleSeedDemoUsers = async () => {
    setSeeding(true);
    try {
      const added = await userService.seedDemoUsers(school?.id);
      showToast(`Successfully added ${added.length} sample institutional user accounts!`, 'success');
      await loadData();
    } catch (e: any) {
      showToast('Error seeding demo users: ' + e.message, 'error');
    } finally {
      setSeeding(false);
    }
  };

  // Filtered Users List
  const filteredUsers = users.filter((u) => {
    const searchLower = search.toLowerCase();
    const matchSearch =
      (u.fullName || '').toLowerCase().includes(searchLower) ||
      (u.email || '').toLowerCase().includes(searchLower) ||
      (u.phone || '').toLowerCase().includes(searchLower) ||
      (u.role || '').toLowerCase().includes(searchLower);

    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchStatus = statusFilter === 'ALL' || u.status === statusFilter;

    return matchSearch && matchRole && matchStatus;
  });

  // KPI Calculations
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === 'ACTIVE').length;
  const teacherUsers = users.filter((u) => u.role === 'TEACHER' || u.role === 'HEADTEACHER' || u.role === 'DEPUTY_HEADTEACHER').length;
  const adminUsers = users.filter((u) => u.role === 'SUPER_ADMIN' || u.role === 'SCHOOL_ADMIN').length;
  const financeUsers = users.filter((u) => u.role === 'ACCOUNTANT' || u.role === 'CASHIER').length;
  const parentUsers = users.filter((u) => u.role === 'PARENT').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">User Accounts & Access Management</h2>
            <Badge variant="primary" size="sm">
              Auth Directory
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Provision user logins, configure RBAC role assignments, manage credentials, and monitor system access.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={loadData}
            loading={loading}
          >
            Refresh
          </Button>

          {users.length < 5 && (
            <Button
              variant="outline"
              size="sm"
              icon={<Sparkles className="w-3.5 h-3.5 text-amber-500" />}
              onClick={handleSeedDemoUsers}
              loading={seeding}
              className="border-amber-200 bg-amber-50/60 hover:bg-amber-100/60 text-amber-900"
            >
              Seed Sample Users
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            icon={<UserPlus className="w-4 h-4" />}
            onClick={() => handleOpenAddModal()}
            id="btn-add-new-user"
          >
            Add New User
          </Button>
        </div>
      </div>

      {/* Metric Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Users</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{totalUsers}</div>
          <div className="text-[11px] text-emerald-700 mt-0.5 font-semibold">{activeUsers} Active Logins</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Admins</div>
          <div className="text-2xl font-extrabold text-rose-900 mt-1">{adminUsers}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Super & School Admins</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Teachers & Academics</div>
          <div className="text-2xl font-extrabold text-indigo-900 mt-1">{teacherUsers}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">CBC Facilitators</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Finance Team</div>
          <div className="text-2xl font-extrabold text-amber-900 mt-1">{financeUsers}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Bursars & Cashiers</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Parents & Guardians</div>
          <div className="text-2xl font-extrabold text-pink-900 mt-1">{parentUsers}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Portal Access</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Security Engine</div>
          <div className="flex items-center gap-1.5 mt-1.5 text-xs font-bold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>RBAC Active</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Firestore Protected</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by full name, email, phone, or assigned role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white"
          >
            <option value="ALL">All Roles ({users.length})</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="SCHOOL_ADMIN">School Admin</option>
            <option value="HEADTEACHER">Headteacher</option>
            <option value="DEPUTY_HEADTEACHER">Deputy Headteacher</option>
            <option value="TEACHER">Teacher</option>
            <option value="ACCOUNTANT">Accountant / Bursar</option>
            <option value="CASHIER">POS Cashier</option>
            <option value="RECEPTIONIST">Receptionist</option>
            <option value="NURSE">Nurse</option>
            <option value="LIBRARIAN">Librarian</option>
            <option value="TRANSPORT_MANAGER">Transport Officer</option>
            <option value="PARENT">Parent</option>
            <option value="STUDENT">Student</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Logins</option>
            <option value="SUSPENDED">Suspended Accounts</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Users Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-900" />
            <p>Loading user accounts directory...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-3">
            <Users className="w-10 h-10 mx-auto text-slate-300" />
            <div className="font-bold text-slate-700 text-sm">No user accounts found</div>
            <p className="max-w-md mx-auto">
              {search || roleFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'Try adjusting your search query or role filter.'
                : 'Click "Add New User" or "Seed Sample Users" to create institutional accounts.'}
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <Button size="sm" variant="primary" icon={<UserPlus className="w-3.5 h-3.5" />} onClick={() => handleOpenAddModal()}>
                Add New User
              </Button>
              <Button size="sm" variant="outline" icon={<Sparkles className="w-3.5 h-3.5" />} onClick={handleSeedDemoUsers} loading={seeding}>
                Seed Sample Users
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">User Details</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">Assigned Role</th>
                  <th className="py-3.5 px-4">Account Status</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const roleConfig = ROLE_CONFIGS[u.role] || {
                    label: u.role,
                    category: 'Custom',
                    color: 'bg-slate-800 text-slate-100',
                    badgeVariant: 'neutral' as const,
                  };

                  const isCurrentUser = currentUser?.id === u.id || (currentUser?.email && currentUser.email === u.email);

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* User Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {u.avatarUrl ? (
                            <img
                              src={u.avatarUrl}
                              alt={u.fullName}
                              className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                              {u.fullName
                                ? u.fullName
                                    .split(' ')
                                    .map((n) => n[0])
                                    .slice(0, 2)
                                    .join('')
                                    .toUpperCase()
                                : 'U'}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                              <span>{u.fullName}</span>
                              <span className="text-[11px] font-mono bg-blue-50 text-blue-900 border border-blue-200/80 px-1.5 py-0.5 rounded-md font-bold">
                                @{u.username || u.email?.split('@')[0]}
                              </span>
                              {isCurrentUser && (
                                <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-md font-bold">
                                  You
                                </span>
                              )}
                              {u.role === 'SUPER_ADMIN' && (
                                <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded-md font-bold">
                                  Super Admin
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">ID: {u.id.slice(0, 10)}...</div>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{u.email}</span>
                          </div>
                          {u.phone && (
                            <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{u.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Assigned Role */}
                      <td className="py-3.5 px-4">
                        <div>
                          <Badge variant={roleConfig.badgeVariant} size="sm">
                            {roleConfig.label}
                          </Badge>
                          <div className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">
                            {roleConfig.category} Module
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {u.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        ) : u.status === 'SUSPENDED' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <Lock className="w-3 h-3" />
                            Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 text-slate-500 font-medium text-[11px]">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Active'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Switch Role Preview */}
                          <button
                            type="button"
                            title={`Switch to ${roleConfig.label} View`}
                            onClick={() => {
                              switchRole(u.role);
                              showToast(`Switched active view to ${roleConfig.label}`, 'info');
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          {/* Print Login Slip */}
                          <button
                            type="button"
                            title="Print Staff Login Credential Slip"
                            onClick={() => handlePrintSlip(u)}
                            className="p-1.5 text-slate-500 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset / Set Password */}
                          <button
                            type="button"
                            title="Manage Password / PIN"
                            onClick={() => handleOpenResetPasswordModal(u)}
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Suspend / Activate Toggle */}
                          <button
                            type="button"
                            title={u.status === 'ACTIVE' ? 'Suspend Account' : 'Activate Account'}
                            onClick={() => handleToggleStatus(u)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              u.status === 'ACTIVE'
                                ? 'text-slate-500 hover:text-rose-700 hover:bg-rose-50'
                                : 'text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {u.status === 'ACTIVE' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          </button>

                          {/* Edit Details */}
                          <button
                            type="button"
                            title="Edit User Profile"
                            onClick={() => handleOpenEditModal(u)}
                            className="p-1.5 text-slate-500 hover:text-blue-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            title="Delete User"
                            onClick={() => handleOpenDeleteModal(u)}
                            className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD NEW USER */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Provision New User Account">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
            <ShieldCheck className="w-4 h-4 shrink-0 text-blue-900 mt-0.5" />
            <div>
              <span className="font-bold">Staff & Portal Provisioning:</span> Set up unique login credentials (Username & Password) for school staff, teachers, bursars, and administrators.
            </div>
          </div>

          {/* Quick link from staff directory if available */}
          {staffList.length > 0 && (
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                Link to Existing Staff Member (Optional)
              </label>
              <select
                value={addForm.staffId || ''}
                onChange={(e) => {
                  const sId = e.target.value;
                  const found = staffList.find((s) => s.id === sId);
                  if (found) {
                    const cleanName = found.fullName.toLowerCase().replace(/[^a-z0-9]/g, '.');
                    setAddForm((prev) => ({
                      ...prev,
                      staffId: found.id,
                      fullName: found.fullName,
                      username: cleanName,
                      email: found.email || `${cleanName}@glcm.ac.ke`,
                      phone: found.phone || '',
                      role: found.role || 'TEACHER',
                    }));
                  } else {
                    setAddForm((prev) => ({ ...prev, staffId: '' }));
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="">-- Create Independent User / Select Staff --</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.designation || s.department || s.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Mwalimu Catherine Mutua"
                value={addForm.fullName}
                onChange={(e) => {
                  const val = e.target.value;
                  setAddForm((prev) => {
                    const autoUser = !prev.username || prev.username === prev.fullName.toLowerCase().replace(/[^a-z0-9]/g, '.')
                      ? val.toLowerCase().replace(/[^a-z0-9]/g, '.')
                      : prev.username;
                    return {
                      ...prev,
                      fullName: val,
                      username: autoUser,
                      email: !prev.email || prev.email.includes('@glcm.ac.ke') ? `${autoUser}@glcm.ac.ke` : prev.email,
                    };
                  });
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                Login Username <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">@</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. catherine.mutua"
                  value={addForm.username}
                  onChange={(e) =>
                    setAddForm({
                      ...addForm,
                      username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''),
                    })
                  }
                  className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
                />
              </div>
              <span className="text-[10px] text-slate-400">Used by staff to sign in on public website.</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="e.g. cmutua@glcm.ac.ke"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Phone Number</label>
              <input
                type="tel"
                placeholder="e.g. +254 712 345 678"
                value={addForm.phone}
                onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                Assigned Role <span className="text-rose-500">*</span>
              </label>
              <select
                value={addForm.role}
                onChange={(e) => setAddForm({ ...addForm, role: e.target.value as UserRole })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              >
                {Object.entries(ROLE_CONFIGS).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label} ({cfg.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Account Status</label>
              <select
                value={addForm.status}
                onChange={(e) => setAddForm({ ...addForm, status: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              >
                <option value="ACTIVE">ACTIVE (Ready to log in)</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          {/* Password Box */}
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-blue-900" />
                Initial Password / PIN <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="text-[11px] text-blue-900 hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Generate PIN
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={addForm.showPassword ? 'text' : 'password'}
                  required
                  value={addForm.tempPassword}
                  onChange={(e) => setAddForm({ ...addForm, tempPassword: e.target.value })}
                  className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setAddForm((prev) => ({ ...prev, showPassword: !prev.showPassword }))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {addForm.showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={copiedPassword ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                onClick={handleCopyPassword}
              >
                {copiedPassword ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={actionLoading} icon={<UserPlus className="w-4 h-4" />}>
              Create User & Generate Slip
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: EDIT USER */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit User Profile & Role">
        <form onSubmit={handleUpdateUser} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Full Name</label>
              <input
                type="text"
                required
                value={editForm.fullName}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Username</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">@</span>
                <input
                  type="text"
                  required
                  value={editForm.username}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''),
                    })
                  }
                  className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Email Address</label>
              <input
                type="email"
                required
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Phone Number</label>
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Assigned Role</label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              >
                {Object.entries(ROLE_CONFIGS).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label} ({cfg.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Account Status</label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              >
                <option value="ACTIVE">ACTIVE (Can log in)</option>
                <option value="SUSPENDED">SUSPENDED (Access locked)</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
              Update Password (Leave blank to keep existing)
            </label>
            <div className="relative">
              <input
                type={editForm.showPassword ? 'text' : 'password'}
                placeholder="Enter new password / PIN"
                value={editForm.newPassword || ''}
                onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
              />
              <button
                type="button"
                onClick={() => setEditForm((prev) => ({ ...prev, showPassword: !prev.showPassword }))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                {editForm.showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={actionLoading}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: RESET / MANAGE PASSWORD */}
      <Modal
        isOpen={isResetPasswordModalOpen}
        onClose={() => setIsResetPasswordModalOpen(false)}
        title="Change User Password & PIN"
      >
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-start gap-3">
            <KeyRound className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-950">
              <span className="font-bold">Set Password for:</span>{' '}
              <strong>{selectedUser?.fullName}</strong> (@{selectedUser?.username || selectedUser?.email?.split('@')[0]})
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
              New Password or Access PIN
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showResetPassword ? 'text' : 'password'}
                  value={newCustomPassword}
                  onChange={(e) => setNewCustomPassword(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const pin = Math.floor(1000 + Math.random() * 9000);
                  setNewCustomPassword(`Glcm@${pin}`);
                }}
              >
                Generate PIN
              </Button>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<Printer className="w-3.5 h-3.5" />}
              onClick={() => {
                if (selectedUser) handlePrintSlip(selectedUser, newCustomPassword);
              }}
            >
              Print Current Slip
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsResetPasswordModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleSaveNewPassword}
                loading={actionLoading}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                Set Password & Slip
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL 4: LOGIN SLIP MODAL */}
      <Modal isOpen={isSlipModalOpen} onClose={() => setIsSlipModalOpen(false)} title="Staff Login Credential Slip">
        {slipUser && (
          <div className="space-y-4">
            <div className="border-2 border-blue-900 rounded-2xl p-4 bg-gradient-to-b from-blue-50/50 to-white shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div>
                  <h4 className="font-extrabold text-blue-900 text-sm">{school?.name || 'Gracia Learning Centre'}</h4>
                  <p className="text-[10px] text-slate-500">Official Staff Login Credentials</p>
                </div>
                <Badge variant="primary" size="sm">
                  {slipUser.role.replace(/_/g, ' ')}
                </Badge>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Employee Name:</span>
                  <span className="font-bold text-slate-900">{slipUser.fullName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Portal Username:</span>
                  <span className="font-mono font-extrabold text-blue-900 bg-blue-100/70 px-2 py-0.5 rounded">
                    @{slipUser.username || slipUser.email.split('@')[0]}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Initial Password:</span>
                  <span className="font-mono font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {slipPassword}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-medium">Portal URL:</span>
                  <span className="text-blue-900 font-semibold underline">Public Homepage &rarr; Staff Login</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<Copy className="w-3.5 h-3.5" />}
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Portal Login Credentials:\nName: ${slipUser.fullName}\nUsername: @${slipUser.username || slipUser.email.split('@')[0]}\nPassword: ${slipPassword}`
                  );
                  showToast('Credentials copied to clipboard!', 'info');
                }}
              >
                Copy Details
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setIsSlipModalOpen(false)}>
                  Close
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  icon={<Printer className="w-4 h-4" />}
                  onClick={() => handlePrintSlip(slipUser, slipPassword)}
                >
                  Print Official Slip
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 5: DELETE CONFIRMATION */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete User Account">
        <div className="space-y-4">
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-950">
              <span className="font-bold">Caution:</span> Are you sure you want to permanently delete user account{' '}
              <strong>{selectedUser?.fullName}</strong> ({selectedUser?.email})? This action will revoke their login access immediately.
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={handleDeleteUser} loading={actionLoading} icon={<Trash2 className="w-4 h-4" />}>
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UsersView;

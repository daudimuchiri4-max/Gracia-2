import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { staffService } from '../../services/staffAndParentService';
import { userService } from '../../services/userService';
import { Staff, UserRole } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import {
  UserCheck,
  PlusCircle,
  Search,
  Mail,
  Phone,
  Award,
  Edit2,
  Trash2,
  UserX,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  GraduationCap,
  KeyRound,
  Key,
} from 'lucide-react';

interface StaffViewProps {
  onNavigate?: (view: string) => void;
}

export const StaffView: React.FC<StaffViewProps> = ({ onNavigate }) => {
  const { school } = useAuth();
  const { showToast } = useToast();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

  const [form, setForm] = useState({
    fullName: '',
    tscNumber: '',
    email: '',
    phone: '',
    gender: 'FEMALE' as 'MALE' | 'FEMALE',
    role: 'TEACHER' as UserRole,
    department: 'Languages' as Staff['department'],
    designation: 'Senior Teacher & CBC Facilitator',
    assignedClasses: 'Grade 5 East, Grade 6 East',
    assignedSubjects: 'English Language, Creative Arts',
  });

  useEffect(() => {
    if (!school?.id) return;
    loadStaff();
  }, [school?.id]);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const data = await staffService.getStaff(school!.id);
      setStaffList(data);
    } catch (e: any) {
      showToast('Error loading staff: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newStaff = await staffService.createStaff(school!.id, {
        staffId: `GLCM-T-${(staffList.length + 1).toString().padStart(2, '0')}`,
        tscNumber: form.tscNumber ? `TSC/${form.tscNumber.replace(/^TSC\//i, '')}` : undefined,
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        gender: form.gender,
        role: form.role,
        department: form.department,
        designation: form.designation,
        assignedClasses: form.assignedClasses ? form.assignedClasses.split(',').map((s) => s.trim()) : [],
        assignedSubjects: form.assignedSubjects ? form.assignedSubjects.split(',').map((s) => s.trim()) : [],
        joinDate: new Date().toISOString().split('T')[0],
        status: 'ACTIVE',
      });

      // Auto-provision User Account in Firestore
      if (form.email) {
        try {
          await userService.createUser({
            fullName: form.fullName,
            email: form.email,
            phone: form.phone,
            role: form.role,
            status: 'ACTIVE',
            schoolId: school!.id,
            staffId: newStaff.id,
          });
        } catch (uErr) {
          console.warn('Notice creating user login account:', uErr);
        }
      }

      showToast(`Staff member ${form.fullName} registered & login provisioned!`, 'success');
      setIsAddModalOpen(false);
      resetForm();
      await loadStaff();
    } catch (e: any) {
      showToast('Error creating staff: ' + e.message, 'error');
    }
  };

  const openEditModal = (staff: Staff) => {
    setSelectedStaff(staff);
    setForm({
      fullName: staff.fullName,
      tscNumber: staff.tscNumber ? staff.tscNumber.replace(/^TSC\//i, '') : '',
      email: staff.email,
      phone: staff.phone,
      gender: staff.gender || 'FEMALE',
      role: staff.role || 'TEACHER',
      department: staff.department,
      designation: staff.designation,
      assignedClasses: staff.assignedClasses?.join(', ') || '',
      assignedSubjects: staff.assignedSubjects?.join(', ') || '',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    try {
      await staffService.updateStaff(school!.id, selectedStaff.id, {
        fullName: form.fullName,
        tscNumber: form.tscNumber ? `TSC/${form.tscNumber.replace(/^TSC\//i, '')}` : undefined,
        email: form.email,
        phone: form.phone,
        gender: form.gender,
        role: form.role,
        department: form.department,
        designation: form.designation,
        assignedClasses: form.assignedClasses ? form.assignedClasses.split(',').map((s) => s.trim()) : [],
        assignedSubjects: form.assignedSubjects ? form.assignedSubjects.split(',').map((s) => s.trim()) : [],
      });

      showToast(`Staff profile for ${form.fullName} updated!`, 'success');
      setIsEditModalOpen(false);
      setSelectedStaff(null);
      resetForm();
      await loadStaff();
    } catch (e: any) {
      showToast('Error updating staff: ' + e.message, 'error');
    }
  };

  const openDeleteModal = (staff: Staff) => {
    setSelectedStaff(staff);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteStaff = async () => {
    if (!selectedStaff) return;
    try {
      await staffService.deleteStaff(school!.id, selectedStaff.id);
      showToast(`Staff member ${selectedStaff.fullName} removed from faculty directory.`, 'info');
      setIsDeleteModalOpen(false);
      setSelectedStaff(null);
      await loadStaff();
    } catch (e: any) {
      showToast('Error deleting staff: ' + e.message, 'error');
    }
  };

  const handleToggleSuspend = async (staff: Staff) => {
    const newStatus = staff.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    const actionText = newStatus === 'SUSPENDED' ? 'suspend' : 'reinstate';

    if (!window.confirm(`Are you sure you want to ${actionText} ${staff.fullName}?`)) return;

    try {
      await staffService.updateStaff(school!.id, staff.id, { status: newStatus });
      showToast(
        `Staff member ${staff.fullName} is now ${newStatus === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVATED'}.`,
        newStatus === 'SUSPENDED' ? 'warning' : 'success'
      );
      await loadStaff();
    } catch (e: any) {
      showToast('Error modifying staff status: ' + e.message, 'error');
    }
  };

  const resetForm = () => {
    setForm({
      fullName: '',
      tscNumber: '',
      email: '',
      phone: '',
      gender: 'FEMALE',
      role: 'TEACHER',
      department: 'Languages',
      designation: 'Senior Teacher & CBC Facilitator',
      assignedClasses: 'Grade 5 East, Grade 6 East',
      assignedSubjects: 'English Language, Creative Arts',
    });
  };

  const filtered = staffList.filter((s) => {
    const matchDept = departmentFilter === 'ALL' || s.department === departmentFilter;
    const matchSearch =
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (s.tscNumber && s.tscNumber.toLowerCase().includes(search.toLowerCase())) ||
      s.designation.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    return matchDept && matchSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-900/10 flex items-center justify-center text-blue-900">
              <UserCheck className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Teaching Faculty & Staff Directory</h2>
            <Badge variant="primary" size="sm">
              {staffList.length} Personnel
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            TSC registered educators, CBC department leads, administrative bursars, and active faculty status management.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigate && (
            <Button
              variant="outline"
              size="sm"
              icon={<KeyRound className="w-4 h-4 text-sky-600" />}
              onClick={() => onNavigate('USERS')}
            >
              User Logins & Accounts
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            icon={<PlusCircle className="w-4 h-4" />}
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
          >
            Add Staff Member
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search teacher by name, TSC number, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs"
          />
        </div>
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
        >
          <option value="ALL">All Departments</option>
          <option value="Administration">Administration</option>
          <option value="Languages">Languages</option>
          <option value="Sciences">Sciences</option>
          <option value="Mathematics">Mathematics</option>
          <option value="Humanities">Humanities</option>
          <option value="Creative Arts">Creative Arts</option>
          <option value="Operations">Operations & Bursary</option>
          <option value="Support">Support</option>
        </select>
      </div>

      {/* Staff Grid */}
      {loading ? (
        <div className="bg-white p-12 text-center text-xs text-slate-400 rounded-2xl border border-slate-200">
          Loading faculty records...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-2">
          <UserCheck className="w-8 h-8 text-slate-300 mx-auto" />
          <div className="text-sm font-semibold text-slate-700">No staff members found</div>
          <p className="text-xs text-slate-400">Click &apos;Add Staff Member&apos; to register teachers.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((st) => {
            const isSuspended = st.status === 'SUSPENDED';

            return (
              <div
                key={st.id}
                className={`bg-white p-5 rounded-2xl border shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all space-y-4 ${
                  isSuspended ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200/80'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 ${
                          isSuspended ? 'bg-amber-600' : 'bg-blue-900'
                        }`}
                      >
                        {st.fullName
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 leading-snug">{st.fullName}</h4>
                        <p className="text-[11px] text-blue-900 font-semibold">{st.designation}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(st)}
                        className="p-1.5 text-slate-500 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Staff Member"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleSuspend(st)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isSuspended
                            ? 'text-emerald-600 hover:bg-emerald-50'
                            : 'text-amber-600 hover:bg-amber-50'
                        }`}
                        title={isSuspended ? 'Reinstate Staff' : 'Suspend Staff'}
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(st)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Staff"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Badge variant="primary" size="sm">
                      {st.department}
                    </Badge>
                    <Badge variant={isSuspended ? 'danger' : 'success'} size="sm">
                      {isSuspended ? 'SUSPENDED' : 'ACTIVE'}
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {st.tscNumber && (
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <Award className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="font-bold text-slate-800">{st.tscNumber}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{st.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{st.phone}</span>
                    </div>
                  </div>

                  {st.assignedClasses && st.assignedClasses.length > 0 && (
                    <div className="mt-3 pt-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Assigned Classes:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {st.assignedClasses.map((c, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-mono">ID: {st.staffId}</span>
                    {onNavigate && (
                      <button
                        onClick={() => onNavigate('USERS')}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-900 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                        title="Manage credentials or reset password for this user"
                      >
                        <KeyRound className="w-3 h-3 text-blue-700" />
                        <span>Logins & Slips</span>
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggleSuspend(st)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer ${
                      isSuspended
                        ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        : 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                    }`}
                  >
                    {isSuspended ? 'Reinstate' : 'Suspend'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Staff Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register Faculty & Staff Member"
        maxWidth="md"
      >
        <form onSubmit={handleCreateStaff} className="space-y-3.5 text-xs">
          <div>
            <label className="font-semibold text-slate-700">Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Tr. Faith Chebet Korir"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">TSC Registration No.</label>
              <input
                type="text"
                placeholder="e.g. 748291"
                value={form.tscNumber}
                onChange={(e) => setForm({ ...form, tscNumber: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Gender</label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value as any })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white"
              >
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Email Address *</label>
              <input
                type="email"
                required
                placeholder="teacher@gracia.ac.ke"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Phone Number *</label>
              <input
                type="tel"
                required
                placeholder="+254 7..."
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Department</label>
              <select
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value as any })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white"
              >
                <option value="Languages">Languages</option>
                <option value="Sciences">Sciences</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Humanities">Humanities</option>
                <option value="Creative Arts">Creative Arts</option>
                <option value="Administration">Administration</option>
                <option value="Operations">Operations</option>
                <option value="Support">Support</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700">Designation / Role Title</label>
              <input
                type="text"
                required
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
          <div>
            <label className="font-semibold text-slate-700">Assigned Classes (comma-separated)</label>
            <input
              type="text"
              placeholder="e.g. Grade 4 East, Grade 5 West"
              value={form.assignedClasses}
              onChange={(e) => setForm({ ...form, assignedClasses: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700">Assigned Subjects (comma-separated)</label>
            <input
              type="text"
              placeholder="e.g. Mathematics, Integrated Science"
              value={form.assignedSubjects}
              onChange={(e) => setForm({ ...form, assignedSubjects: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Staff Member
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Staff Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Staff: ${selectedStaff?.fullName || ''}`}
        maxWidth="md"
      >
        <form onSubmit={handleUpdateStaff} className="space-y-3.5 text-xs">
          <div>
            <label className="font-semibold text-slate-700">Full Name *</label>
            <input
              type="text"
              required
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">TSC Registration No.</label>
              <input
                type="text"
                placeholder="e.g. 748291"
                value={form.tscNumber}
                onChange={(e) => setForm({ ...form, tscNumber: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Gender</label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value as any })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white"
              >
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Email Address *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Phone Number *</label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Department</label>
              <select
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value as any })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white"
              >
                <option value="Languages">Languages</option>
                <option value="Sciences">Sciences</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Humanities">Humanities</option>
                <option value="Creative Arts">Creative Arts</option>
                <option value="Administration">Administration</option>
                <option value="Operations">Operations</option>
                <option value="Support">Support</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700">Designation / Role Title</label>
              <input
                type="text"
                required
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
          <div>
            <label className="font-semibold text-slate-700">Assigned Classes (comma-separated)</label>
            <input
              type="text"
              value={form.assignedClasses}
              onChange={(e) => setForm({ ...form, assignedClasses: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700">Assigned Subjects (comma-separated)</label>
            <input
              type="text"
              value={form.assignedSubjects}
              onChange={(e) => setForm({ ...form, assignedSubjects: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Staff Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Remove Staff Member"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-red-50 text-red-800 rounded-xl border border-red-200 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Remove {selectedStaff?.fullName}?</span>
              <p className="mt-1 text-[11px]">
                This will delete this staff member record from the school directory. Assigned classes and timetable slots will be unassigned.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteStaff}>
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

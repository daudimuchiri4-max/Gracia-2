import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { studentService } from '../../services/studentService';
import { operationsService } from '../../services/operationsService';
import { auditService } from '../../services/auditService';
import { Student, GradeLevel, TransportRoute } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { StudentProfileModal } from '../../components/ui/StudentProfileModal';
import { BatchBillingModal } from '../../components/ui/BatchBillingModal';
import { printerService } from '../../services/printerService';
import {
  UserPlus,
  Users,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  Eye,
  Phone,
  Mail,
  HeartPulse,
  Award,
  ArrowRight,
  Shield,
  FileSpreadsheet,
  Archive,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Send,
  DollarSign,
  Printer,
} from 'lucide-react';

const GRADE_LEVELS: GradeLevel[] = [
  'Playgroup',
  'PP1',
  'PP2',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
];

export const StudentsView: React.FC = () => {
  const { school, user } = useAuth();
  const { showToast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ACTIVE');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState<boolean>(false);
  const [targetPromotionClass, setTargetPromotionClass] = useState<GradeLevel>('Grade 7');

  // Batch Billing Modal state
  const [isBatchBillingOpen, setIsBatchBillingOpen] = useState<boolean>(false);
  const [batchBillingScope, setBatchBillingScope] = useState<'ALL' | 'GRADE' | 'SELECTED'>('ALL');

  // Delete Modal state
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Delete All / Bulk Delete States
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState<boolean>(false);
  const [isDeletingAll, setIsDeletingAll] = useState<boolean>(false);
  const [deleteAllConfirmationInput, setDeleteAllConfirmationInput] = useState<string>('');
  const [deleteAllScope, setDeleteAllScope] = useState<'ALL' | 'FILTERED'>('ALL');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    admissionNumber: '',
    assessmentNumber: '',
    kemisNumber: '',
    upiNumber: '',
    nemisNumber: '',
    firstName: '',
    middleName: '',
    lastName: '',
    gender: 'MALE' as 'MALE' | 'FEMALE',
    dateOfBirth: '2015-05-15',
    birthCertNumber: '',
    nationality: 'Kenyan',
    religion: 'Christian',
    admissionDate: new Date().toISOString().split('T')[0],
    currentClass: 'Grade 6' as GradeLevel,
    stream: 'East',
    status: 'ACTIVE' as Student['status'],
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    parentRelationship: 'Father' as 'Father' | 'Mother' | 'Guardian',
    emergencyContact: '',
    emergencyPhone: '',
    allergies: '',
    medicalConditions: '',
    bloodGroup: 'O+',
    isBoarder: false,
    transportRouteId: '',
  });

  useEffect(() => {
    if (!school?.id) return;
    loadStudents();
  }, [school?.id]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const [list, routeList] = await Promise.all([
        studentService.getStudents(school!.id),
        operationsService.getTransportRoutes(school!.id),
      ]);
      setStudents(list);
      setRoutes(routeList);
    } catch (e: any) {
      showToast('Error loading students: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Check for duplicate admission number in real-time
  const duplicateAdmissionStudent = formData.admissionNumber.trim()
    ? students.find(
        (s) =>
          s.id !== selectedStudent?.id &&
          s.admissionNumber?.trim().toUpperCase() === formData.admissionNumber.trim().toUpperCase()
      )
    : null;

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.admissionNumber) {
      showToast('Please fill in required fields (Name, Admission No)', 'error');
      return;
    }

    const cleanAdm = formData.admissionNumber.trim();
    const existingDuplicate = students.find(
      (s) => s.id !== selectedStudent?.id && s.admissionNumber?.trim().toUpperCase() === cleanAdm.toUpperCase()
    );

    if (existingDuplicate) {
      showToast(
        `Admission number "${cleanAdm}" is already registered to ${existingDuplicate.fullName} (${existingDuplicate.currentClass}). Please enter a unique admission number.`,
        'error'
      );
      return;
    }

    try {
      const route = routes.find((r) => r.id === formData.transportRouteId);
      const payload = {
        ...formData,
        admissionNumber: cleanAdm,
        assessmentNumber: formData.assessmentNumber || formData.upiNumber || '',
        kemisNumber: formData.kemisNumber || formData.nemisNumber || '',
        upiNumber: formData.assessmentNumber || formData.upiNumber || '',
        nemisNumber: formData.kemisNumber || formData.nemisNumber || '',
        fullName: `${formData.firstName} ${formData.middleName || ''} ${formData.lastName}`.replace(/\s+/g, ' ').trim(),
        transportRouteName: route?.routeName || '',
        totalBalance: selectedStudent ? selectedStudent.totalBalance : 0,
      };

      if (selectedStudent) {
        await studentService.updateStudent(school!.id, selectedStudent.id, payload);
        if (user) {
          await auditService.logAction(
            school!.id,
            { id: user.id, name: user.name, role: user.role },
            'UPDATE_STUDENT',
            'STUDENTS',
            `Updated profile for student ${payload.fullName} (Adm: ${cleanAdm})`
          );
        }
        showToast(`Student ${payload.fullName} updated successfully!`, 'success');
      } else {
        await studentService.createStudent(school!.id, payload);
        if (user) {
          await auditService.logAction(
            school!.id,
            { id: user.id, name: user.name, role: user.role },
            'REGISTER_STUDENT',
            'STUDENTS',
            `Registered new student ${payload.fullName} (Adm: ${cleanAdm}, Class: ${payload.currentClass})`
          );
        }
        showToast(`Student ${payload.fullName} registered successfully!`, 'success');
      }

      setIsAddModalOpen(false);
      setSelectedStudent(null);
      await loadStudents();
    } catch (e: any) {
      showToast('Error saving student: ' + e.message, 'error');
    }
  };

  const handleOpenDeleteModal = (student: Student) => {
    setStudentToDelete(student);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteStudent = async () => {
    if (!studentToDelete || !school?.id) return;
    setIsDeleting(true);
    try {
      await studentService.deleteStudent(school.id, studentToDelete.id);
      if (user) {
        await auditService.logAction(
          school.id,
          { id: user.id, name: user.name, role: user.role },
          'DELETE_STUDENT',
          'STUDENTS',
          `Permanently deleted learner ${studentToDelete.fullName} (Adm: ${studentToDelete.admissionNumber}, Class: ${studentToDelete.currentClass})`
        );
      }
      showToast(`Student ${studentToDelete.fullName} (Adm: ${studentToDelete.admissionNumber}) has been permanently deleted.`, 'success');
      setIsDeleteModalOpen(false);
      if (isViewModalOpen && selectedStudent?.id === studentToDelete.id) {
        setIsViewModalOpen(false);
        setSelectedStudent(null);
      }
      setStudentToDelete(null);
      await loadStudents();
    } catch (e: any) {
      showToast('Error deleting student: ' + e.message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenDeleteAllModal = (scope: 'ALL' | 'FILTERED' = 'ALL') => {
    setDeleteAllScope(scope);
    setDeleteAllConfirmationInput('');
    setIsDeleteAllModalOpen(true);
  };

  const confirmDeleteAllStudents = async () => {
    if (!school?.id) return;
    const targetCount = deleteAllScope === 'FILTERED' ? filteredStudents.length : students.length;
    if (targetCount === 0) {
      showToast('No students to delete in selected scope.', 'info');
      setIsDeleteAllModalOpen(false);
      return;
    }

    setIsDeletingAll(true);
    try {
      let count = 0;
      if (deleteAllScope === 'FILTERED') {
        const ids = filteredStudents.map((s) => s.id);
        count = await studentService.deleteStudentsBulk(school.id, ids);
      } else {
        count = await studentService.deleteAllStudents(school.id);
      }

      if (user) {
        await auditService.logAction(
          school.id,
          { id: user.id, name: user.name, role: user.role },
          'DELETE_ALL_STUDENTS',
          'STUDENTS',
          `Permanently deleted ${count} student records from school directory (Scope: ${deleteAllScope})`
        );
      }

      showToast(`Successfully deleted ${count} student records permanently.`, 'success');
      setIsDeleteAllModalOpen(false);
      setDeleteAllConfirmationInput('');
      setSelectedStudentIds([]);
      await loadStudents();
    } catch (e: any) {
      showToast('Error deleting students: ' + e.message, 'error');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map((s) => s.id));
    }
  };

  const handleToggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (!school?.id || selectedStudentIds.length === 0) return;
    if (
      !confirm(
        `Are you sure you want to permanently delete the ${selectedStudentIds.length} selected learner(s)? This cannot be undone.`
      )
    ) {
      return;
    }

    setIsDeletingAll(true);
    try {
      const count = await studentService.deleteStudentsBulk(school.id, selectedStudentIds);
      if (user) {
        await auditService.logAction(
          school.id,
          { id: user.id, name: user.name, role: user.role },
          'DELETE_SELECTED_STUDENTS',
          'STUDENTS',
          `Permanently deleted ${count} selected student records`
        );
      }
      showToast(`Successfully deleted ${count} selected student(s).`, 'success');
      setSelectedStudentIds([]);
      await loadStudents();
    } catch (e: any) {
      showToast('Error deleting selected students: ' + e.message, 'error');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handcodedStudents = students.filter((s) => studentService.isHandcodedStudent(s));

  const handlePurgeHandcoded = async () => {
    if (!school?.id) return;
    if (
      !confirm(
        `Are you sure you want to remove all ${handcodedStudents.length} sample/handcoded students (e.g. Brian Mwangi, Jane Wambui, Trevor Otieno, Chelsea Cherop, Liam Zawadi) and associated dummy entries?`
      )
    ) {
      return;
    }

    setIsDeletingAll(true);
    try {
      const purgedCount = await studentService.purgeHandcodedStudents(school.id);
      if (user) {
        await auditService.logAction(
          school.id,
          { id: user.id, name: user.name, role: user.role },
          'PURGE_HANDCODED_STUDENTS',
          'STUDENTS',
          `Purged ${purgedCount} handcoded/sample student records and mock invoices/results`
        );
      }
      showToast(`Removed ${purgedCount} handcoded student record(s) successfully!`, 'success');
      setSelectedStudentIds([]);
      await loadStudents();
    } catch (e: any) {
      showToast('Error removing handcoded students: ' + e.message, 'error');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleArchive = async (student: Student) => {
    const nextStatus = student.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const actionName = nextStatus === 'INACTIVE' ? 'Archive' : 'Reactivate';
    if (confirm(`${actionName} student ${student.fullName} (Adm: ${student.admissionNumber})?`)) {
      try {
        await studentService.archiveStudent(school!.id, student.id, nextStatus);
        if (user) {
          await auditService.logAction(
            school!.id,
            { id: user.id, name: user.name, role: user.role },
            'STATUS_CHANGE',
            'STUDENTS',
            `Changed status of student ${student.fullName} (Adm: ${student.admissionNumber}) to ${nextStatus}`
          );
        }
        showToast(`Student status changed to ${nextStatus}`, 'info');
        await loadStudents();
      } catch (e: any) {
        showToast('Error changing student status: ' + e.message, 'error');
      }
    }
  };

  const handlePromoteBatch = async () => {
    const activeStudentIds = filteredStudents.map((s) => s.id);
    if (activeStudentIds.length === 0) return;
    if (confirm(`Promote ${activeStudentIds.length} filtered students to ${targetPromotionClass}?`)) {
      try {
        await studentService.promoteStudents(school!.id, activeStudentIds, targetPromotionClass);
        showToast(`Successfully promoted ${activeStudentIds.length} students to ${targetPromotionClass}!`, 'success');
        setIsPromoteModalOpen(false);
        await loadStudents();
      } catch (e: any) {
        showToast('Error during promotion: ' + e.message, 'error');
      }
    }
  };

  const exportCSV = () => {
    const headers = ['Admission No', 'Assessment / KEMIS No', 'Full Name', 'Gender', 'Class', 'Stream', 'Status', 'Parent Name', 'Parent Phone', 'Balance'];
    const rows = filteredStudents.map((s) => [
      s.admissionNumber,
      `"${s.assessmentNumber || s.kemisNumber || s.upiNumber || s.nemisNumber || ''}"`,
      `"${s.fullName}"`,
      s.gender,
      s.currentClass,
      s.stream,
      s.status,
      `"${s.parentName || ''}"`,
      s.parentPhone || '',
      s.totalBalance || 0,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `students_${school?.code || 'GLC'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered list
  const filteredStudents = students.filter((s) => {
    const matchClass = selectedClass === 'ALL' || s.currentClass === selectedClass;
    const matchStatus = selectedStatus === 'ALL' || s.status === selectedStatus;
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      s.fullName?.toLowerCase().includes(q) ||
      s.admissionNumber?.toLowerCase().includes(q) ||
      s.assessmentNumber?.toLowerCase().includes(q) ||
      s.kemisNumber?.toLowerCase().includes(q) ||
      s.upiNumber?.toLowerCase().includes(q) ||
      s.nemisNumber?.toLowerCase().includes(q) ||
      s.birthCertNumber?.toLowerCase().includes(q) ||
      s.parentPhone?.includes(q) ||
      s.parentName?.toLowerCase().includes(q);
    return matchClass && matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Student Management Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Playgroup through Grade 9 learner registers, Assessment/KEMIS tracking, medical profiles, and CBC portfolios.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {handcodedStudents.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100 hover:border-amber-400"
              icon={<Trash2 className="w-4 h-4 text-amber-700" />}
              onClick={handlePurgeHandcoded}
              disabled={loading || isDeletingAll}
            >
              Remove Handcoded Students ({handcodedStudents.length})
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-blue-900 border-blue-200 bg-blue-50/70 hover:bg-blue-100 hover:border-blue-300 font-bold shadow-xs"
            icon={<Send className="w-4 h-4 text-blue-900" />}
            onClick={() => {
              setBatchBillingScope('ALL');
              setIsBatchBillingOpen(true);
            }}
          >
            Bill All Students
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300"
            icon={<Trash2 className="w-4 h-4 text-rose-600" />}
            onClick={() => handleOpenDeleteAllModal('ALL')}
            disabled={loading || students.length === 0}
          >
            Delete All Students
          </Button>
          <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />} onClick={exportCSV}>
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-blue-900 border-blue-200 bg-blue-50/70 hover:bg-blue-100 font-bold"
            icon={<Printer className="w-4 h-4 text-blue-900" />}
            onClick={async () => {
              if (school) {
                try {
                  await printerService.printAllStudentIDCards(filteredStudents.length > 0 ? filteredStudents : students, school);
                } catch (err: any) {
                  showToast('Error printing ID cards grid: ' + err.message, 'error');
                }
              }
            }}
            disabled={loading || students.length === 0}
          >
            Print All ID Cards (Grid)
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowRight className="w-4 h-4" />}
            onClick={() => setIsPromoteModalOpen(true)}
          >
            Promote Class
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<UserPlus className="w-4 h-4" />}
            onClick={() => {
              setSelectedStudent(null);
              const nextAdm = studentService.formatNextAdmissionNumber(
                students,
                school?.code || 'GLC',
                school?.academicYear || '2026'
              );
              setFormData({
                admissionNumber: nextAdm,
                assessmentNumber: '',
                kemisNumber: '',
                upiNumber: '',
                nemisNumber: '',
                firstName: '',
                middleName: '',
                lastName: '',
                gender: 'MALE',
                dateOfBirth: '2016-04-12',
                birthCertNumber: '',
                nationality: 'Kenyan',
                religion: 'Christian',
                admissionDate: new Date().toISOString().split('T')[0],
                currentClass: 'Grade 6',
                stream: 'East',
                status: 'ACTIVE',
                parentName: '',
                parentPhone: '',
                parentEmail: '',
                parentRelationship: 'Father',
                emergencyContact: '',
                emergencyPhone: '',
                allergies: '',
                medicalConditions: '',
                bloodGroup: 'O+',
                isBoarder: false,
                transportRouteId: '',
              });
              setIsAddModalOpen(true);
            }}
          >
            New Admission
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student name, admission no, or parent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 bg-slate-50/50"
          />
        </div>

        {/* Grade filter */}
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-blue-800"
        >
          <option value="ALL">All Grades (Playgroup - Grade 9)</option>
          {GRADE_LEVELS.map((lvl) => (
            <option key={lvl} value={lvl}>
              {lvl}
            </option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-blue-800"
        >
          <option value="ACTIVE">Active Learners</option>
          <option value="INACTIVE">Archived / Inactive</option>
          <option value="ALL">All Statuses</option>
        </select>
      </div>

      {/* Handcoded Sample Learners Detected Alert */}
      {handcodedStudents.length > 0 && (
        <div className="bg-amber-50 border border-amber-200/80 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2.5 text-amber-900">
            <div className="p-1.5 bg-amber-100 rounded-lg text-amber-800 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold">Handcoded Sample Data Detected: </span>
              <span className="text-amber-800">
                {handcodedStudents.length} sample learner record{handcodedStudents.length > 1 ? 's' : ''} (e.g., Brian Mwangi, Jane Wambui) found in the database.
              </span>
            </div>
          </div>
          <button
            onClick={handlePurgeHandcoded}
            disabled={isDeletingAll}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isDeletingAll ? 'Removing...' : `Purge ${handcodedStudents.length} Handcoded Student(s)`}
          </button>
        </div>
      )}

      {/* Multi-selection Action Banner */}
      {selectedStudentIds.length > 0 && (
        <div className="bg-rose-50/90 border border-rose-200 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2 text-rose-900 font-semibold">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-rose-600 text-white text-[11px] font-bold">
              {selectedStudentIds.length}
            </span>
            <span>
              {selectedStudentIds.length} learner{selectedStudentIds.length > 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setBatchBillingScope('SELECTED');
                setIsBatchBillingOpen(true);
              }}
              className="px-3.5 py-1.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              Bill Selected ({selectedStudentIds.length})
            </button>
            <button
              onClick={() => setSelectedStudentIds([])}
              className="px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-white/80 rounded-xl transition-colors font-medium border border-slate-200"
            >
              Deselect All
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={isDeletingAll}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isDeletingAll ? 'Deleting...' : `Delete Selected (${selectedStudentIds.length})`}
            </button>
          </div>
        </div>
      )}

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading student directory...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-sm font-semibold text-slate-700">No students found</div>
            <p className="text-xs text-slate-400">Try adjusting your search filters or add new learners using the 'Add Student' button.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredStudents.length > 0 &&
                        selectedStudentIds.length === filteredStudents.length
                      }
                      onChange={handleToggleSelectAll}
                      className="rounded text-blue-900 focus:ring-blue-800 h-4 w-4 cursor-pointer"
                      title="Select all filtered students"
                    />
                  </th>
                  <th className="p-3.5">Admission No</th>
                  <th className="p-3.5">Learner Name</th>
                  <th className="p-3.5">Gender</th>
                  <th className="p-3.5">Class & Stream</th>
                  <th className="p-3.5">Parent / Guardian</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Fee Balance</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((std) => {
                  const isSelected = selectedStudentIds.includes(std.id);
                  return (
                    <tr
                      key={std.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isSelected ? 'bg-rose-50/40' : ''
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectStudent(std.id)}
                          className="rounded text-blue-900 focus:ring-blue-800 h-4 w-4 cursor-pointer"
                        />
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">{std.admissionNumber}</td>
                      <td className="p-3.5">
                        <button
                          onClick={() => {
                            setSelectedStudent(std);
                            setIsViewModalOpen(true);
                          }}
                          className="font-semibold text-slate-900 hover:text-blue-900 text-left hover:underline cursor-pointer block"
                        >
                          {std.fullName}
                        </button>
                        {std.allergies && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-rose-600 font-medium">
                            <HeartPulse className="w-3 h-3" /> Allergy: {std.allergies}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-600 font-medium">{std.gender}</td>
                      <td className="p-3.5">
                        <Badge variant="primary" size="sm">
                          {std.currentClass} • {std.stream}
                        </Badge>
                      </td>
                      <td className="p-3.5">
                        <div className="font-medium text-slate-800">{std.parentName || 'N/A'}</div>
                        <div className="text-[10px] text-slate-400">{std.parentPhone}</div>
                      </td>
                      <td className="p-3.5">
                        <Badge variant={std.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm">
                          {std.status}
                        </Badge>
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">
                        {std.totalBalance && std.totalBalance > 0 ? (
                          <span className="text-rose-600">
                            {school?.currencySymbol || 'KSh'} {std.totalBalance.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-emerald-700">Cleared</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right space-x-1">
                        <button
                          onClick={() => {
                            setSelectedStudent(std);
                            setIsViewModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="View Full Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedStudent(std);
                            setFormData({
                              admissionNumber: std.admissionNumber,
                              assessmentNumber: std.assessmentNumber || std.upiNumber || '',
                              kemisNumber: std.kemisNumber || std.nemisNumber || '',
                              upiNumber: std.assessmentNumber || std.upiNumber || '',
                              nemisNumber: std.kemisNumber || std.nemisNumber || '',
                              firstName: std.firstName,
                              middleName: std.middleName || '',
                              lastName: std.lastName,
                              gender: std.gender,
                              dateOfBirth: std.dateOfBirth,
                              birthCertNumber: std.birthCertNumber || '',
                              nationality: std.nationality || 'Kenyan',
                              religion: std.religion || 'Christian',
                              admissionDate: std.admissionDate,
                              currentClass: std.currentClass,
                              stream: std.stream,
                              status: std.status,
                              parentName: std.parentName || '',
                              parentPhone: std.parentPhone || '',
                              parentEmail: std.parentEmail || '',
                              parentRelationship: std.parentRelationship || 'Father',
                              emergencyContact: std.emergencyContact || '',
                              emergencyPhone: std.emergencyPhone || '',
                              allergies: std.allergies || '',
                              medicalConditions: std.medicalConditions || '',
                              bloodGroup: std.bloodGroup || 'O+',
                              isBoarder: std.isBoarder || false,
                              transportRouteId: std.transportRouteId || '',
                            });
                            setIsAddModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit Student Profile"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleArchive(std)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            std.status === 'ACTIVE'
                              ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                              : 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                          }`}
                          title={std.status === 'ACTIVE' ? 'Archive / Deactivate Student' : 'Reactivate Student'}
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDeleteModal(std)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Student Permanently"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Student Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={selectedStudent ? 'Edit Learner Profile' : 'New Learner Registration'}
        subtitle="Complete Kenyan CBC student profile and parent details"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveStudent} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700">Admission No *</label>
                {!selectedStudent && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!school?.id) return;
                      const next = await studentService.generateNextAdmissionNumber(
                        school.id,
                        school.code || 'GLC',
                        school.academicYear || '2026'
                      );
                      setFormData((prev) => ({ ...prev, admissionNumber: next }));
                    }}
                    className="text-[10px] text-blue-700 hover:underline font-semibold cursor-pointer"
                  >
                    Auto-Generate
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                placeholder="e.g. GLCM/2026/001"
                value={formData.admissionNumber}
                onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value })}
                className={`w-full mt-1 px-3 py-2 border rounded-xl focus:ring-2 ${
                  duplicateAdmissionStudent
                    ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-rose-400'
                    : 'border-slate-200 focus:ring-blue-800'
                }`}
              />
              {duplicateAdmissionStudent && (
                <div className="mt-1 flex items-start gap-1 text-[11px] text-rose-600 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>
                    Already assigned to <strong>{duplicateAdmissionStudent.fullName}</strong> (
                    {duplicateAdmissionStudent.currentClass})
                  </span>
                </div>
              )}
              {!duplicateAdmissionStudent && formData.admissionNumber.trim() && (
                <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                  <CheckCircle className="w-3 h-3 shrink-0" />
                  <span>Admission number is available</span>
                </div>
              )}
            </div>
            <div>
              <label className="font-semibold text-slate-700">First Name *</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-800"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Last Name *</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-800"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700">Class Level *</label>
              <select
                value={formData.currentClass}
                onChange={(e) => setFormData({ ...formData, currentClass: e.target.value as GradeLevel })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-800"
              >
                {GRADE_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700">Stream</label>
              <input
                type="text"
                placeholder="e.g. East, West, Alpha"
                value={formData.stream}
                onChange={(e) => setFormData({ ...formData, stream: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Date of Birth</label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-800"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Birth Cert No</label>
              <input
                type="text"
                placeholder="e.g. BC-928192"
                value={formData.birthCertNumber}
                onChange={(e) => setFormData({ ...formData, birthCertNumber: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-800"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Assessment Number (KNEC)</label>
              <input
                type="text"
                placeholder="e.g. 269001-0045 or ASN-9281920"
                value={formData.assessmentNumber || formData.upiNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    assessmentNumber: e.target.value,
                    upiNumber: e.target.value,
                  })
                }
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-800"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">KEMIS Number</label>
              <input
                type="text"
                placeholder="e.g. KEMIS-12345"
                value={formData.kemisNumber || formData.nemisNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    kemisNumber: e.target.value,
                    nemisNumber: e.target.value,
                  })
                }
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Blood Group</label>
              <select
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white"
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700">Nationality</label>
              <input
                type="text"
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-800"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Religion</label>
              <input
                type="text"
                value={formData.religion}
                onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-800"
              />
            </div>
          </div>

          {/* Parent Info */}
          <div className="pt-3 border-t border-slate-200">
            <div className="font-bold text-slate-900 text-xs mb-2">Parent / Guardian Information</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700">Parent Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Joseph Kamau"
                  value={formData.parentName}
                  onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-800"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Parent Phone</label>
                <input
                  type="text"
                  placeholder="+254 722 000 000"
                  value={formData.parentPhone}
                  onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-800"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Parent Email</label>
                <input
                  type="email"
                  placeholder="parent@gmail.com"
                  value={formData.parentEmail}
                  onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-800"
                />
              </div>
            </div>
          </div>

          {/* Medical & Transport */}
          <div className="pt-3 border-t border-slate-200">
            <div className="font-bold text-slate-900 text-xs mb-2">Medical & Logistics</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700">Known Allergies</label>
                <input
                  type="text"
                  placeholder="e.g. Peanuts, Penicillin, Dust"
                  value={formData.allergies}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-800"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">School Bus Route</label>
                <select
                  value={formData.transportRouteId}
                  onChange={(e) => setFormData({ ...formData, transportRouteId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">No Transport (Self / Walking)</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.routeName} ({r.vehicleNumber})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-200">
            <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {selectedStudent ? 'Save Changes' : 'Complete Admission'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Comprehensive Student Profile Modal */}
      <StudentProfileModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        student={selectedStudent}
        school={school}
        onRefresh={loadStudents}
        onDelete={(std) => handleOpenDeleteModal(std)}
        onEdit={(std) => {
          setIsViewModalOpen(false);
          setSelectedStudent(std);
          setFormData({
            admissionNumber: std.admissionNumber,
            firstName: std.firstName,
            middleName: std.middleName || '',
            lastName: std.lastName,
            gender: std.gender,
            dateOfBirth: std.dateOfBirth,
            birthCertNumber: std.birthCertNumber || '',
            nationality: std.nationality || 'Kenyan',
            religion: std.religion || 'Christian',
            admissionDate: std.admissionDate,
            currentClass: std.currentClass,
            stream: std.stream,
            status: std.status,
            parentName: std.parentName || '',
            parentPhone: std.parentPhone || '',
            parentEmail: std.parentEmail || '',
            parentRelationship: std.parentRelationship || 'Father',
            emergencyContact: std.emergencyContact || '',
            emergencyPhone: std.emergencyPhone || '',
            allergies: std.allergies || '',
            medicalConditions: std.medicalConditions || '',
            bloodGroup: std.bloodGroup || 'O+',
            isBoarder: std.isBoarder || false,
            transportRouteId: std.transportRouteId || '',
          });
          setIsAddModalOpen(true);
        }}
      />

      {/* Delete Student Permanent Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) setIsDeleteModalOpen(false);
        }}
        title="Delete Learner Record"
        subtitle="Permanent record deletion from school directory"
        maxWidth="md"
      >
        {studentToDelete && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-900">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-900 text-sm">Are you sure you want to delete this student?</p>
                <p className="mt-1 text-rose-800">
                  This action is irreversible and will permanently remove the student profile from the school registry.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Learner Name:</span>
                <span className="font-bold text-slate-900">{studentToDelete.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Admission Number:</span>
                <span className="font-bold text-blue-900">{studentToDelete.admissionNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Class & Stream:</span>
                <span className="font-semibold text-slate-700">{studentToDelete.currentClass} • {studentToDelete.stream}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Fee Balance:</span>
                <span className={`font-bold ${studentToDelete.totalBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  KES {studentToDelete.totalBalance.toLocaleString()}
                </span>
              </div>
              {studentToDelete.totalBalance > 0 && (
                <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2">
                  Notice: This learner has an outstanding fee balance of KES {studentToDelete.totalBalance.toLocaleString()}.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-200">
              <Button
                variant="outline"
                type="button"
                disabled={isDeleting}
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancel
              </Button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteStudent}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                {isDeleting ? 'Deleting...' : 'Delete Student Permanently'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Class Batch Promotion Modal */}
      <Modal
        isOpen={isPromoteModalOpen}
        onClose={() => setIsPromoteModalOpen(false)}
        title="Batch Class Promotion"
        subtitle="Promote all filtered learners to the next academic level"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            This will update the class level for <strong>{filteredStudents.length} learners</strong> currently shown in the filter.
          </p>

          <div>
            <label className="font-semibold text-slate-700">Promote To Target Class:</label>
            <select
              value={targetPromotionClass}
              onChange={(e) => setTargetPromotionClass(e.target.value as GradeLevel)}
              className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-xl bg-white font-medium"
            >
              {GRADE_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" onClick={() => setIsPromoteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handlePromoteBatch}>
              Confirm Promotion
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete All Students Confirmation Modal */}
      <Modal
        isOpen={isDeleteAllModalOpen}
        onClose={() => {
          if (!isDeletingAll) setIsDeleteAllModalOpen(false);
        }}
        title="Delete All Student Records"
        subtitle="Permanent batch deletion from the school registry"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          {/* Critical Warning Callout */}
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3.5 text-rose-900 shadow-xs">
            <div className="p-2 bg-rose-100 rounded-xl shrink-0 text-rose-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-rose-900 text-sm">Danger: Irreversible Action</p>
              <p className="text-rose-800 leading-relaxed">
                You are about to permanently delete student profiles, admission numbers, KEMIS/NEMIS links, and student fee ledgers. This action <strong>CANNOT</strong> be undone.
              </p>
            </div>
          </div>

          {/* Scope Selector */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
            <label className="font-bold text-slate-800 block">Select Deletion Scope:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteAllScope('ALL')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  deleteAllScope === 'ALL'
                    ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-slate-900">All School Learners</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Entire school roster ({students.length} total students)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDeleteAllScope('FILTERED')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  deleteAllScope === 'FILTERED'
                    ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-slate-900">Current Filtered List</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Matching current grade/search ({filteredStudents.length} students)
                </div>
              </button>
            </div>
          </div>

          {/* Breakdown summary */}
          <div className="p-3 bg-slate-100/70 rounded-xl text-slate-700 flex items-center justify-between font-medium">
            <span>Total records to be deleted:</span>
            <span className="font-extrabold text-rose-600 text-sm">
              {deleteAllScope === 'ALL' ? students.length : filteredStudents.length} Learners
            </span>
          </div>

          {/* Confirmation Input Guard */}
          <div className="space-y-1.5 pt-1">
            <label className="font-semibold text-slate-700 block">
              To confirm, type <strong className="text-rose-600 font-mono bg-rose-50 px-1 py-0.5 rounded border border-rose-200">DELETE</strong> below:
            </label>
            <input
              type="text"
              placeholder="Type DELETE to enable confirmation"
              value={deleteAllConfirmationInput}
              onChange={(e) => setDeleteAllConfirmationInput(e.target.value)}
              disabled={isDeletingAll}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none placeholder:text-slate-400"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <Button
              variant="outline"
              type="button"
              disabled={isDeletingAll}
              onClick={() => setIsDeleteAllModalOpen(false)}
            >
              Cancel
            </Button>
            <button
              type="button"
              disabled={
                isDeletingAll ||
                (deleteAllScope === 'ALL' && students.length === 0) ||
                (deleteAllScope === 'FILTERED' && filteredStudents.length === 0) ||
                deleteAllConfirmationInput.trim().toUpperCase() !== 'DELETE'
              }
              onClick={confirmDeleteAllStudents}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              {isDeletingAll
                ? 'Deleting Records...'
                : `Permanently Delete ${
                    deleteAllScope === 'ALL' ? students.length : filteredStudents.length
                  } Students`}
            </button>
          </div>
        </div>
      </Modal>

      {/* Batch Billing Modal */}
      <BatchBillingModal
        isOpen={isBatchBillingOpen}
        onClose={() => setIsBatchBillingOpen(false)}
        onSuccess={() => {
          setSelectedStudentIds([]);
          loadStudents();
        }}
        initialScope={batchBillingScope}
        selectedStudentIds={selectedStudentIds}
      />
    </div>
  );
};

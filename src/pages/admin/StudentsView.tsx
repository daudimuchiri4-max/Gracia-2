import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { studentService } from '../../services/studentService';
import { operationsService } from '../../services/operationsService';
import { Student, GradeLevel, TransportRoute } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { StudentProfileModal } from '../../components/ui/StudentProfileModal';
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
  const { school } = useAuth();
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

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    admissionNumber: '',
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

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.admissionNumber) {
      showToast('Please fill in required fields (Name, Admission No)', 'error');
      return;
    }

    try {
      const route = routes.find((r) => r.id === formData.transportRouteId);
      const payload = {
        ...formData,
        fullName: `${formData.firstName} ${formData.middleName || ''} ${formData.lastName}`.replace(/\s+/g, ' ').trim(),
        transportRouteName: route?.routeName || '',
        totalBalance: 0,
      };

      if (selectedStudent) {
        await studentService.updateStudent(school!.id, selectedStudent.id, payload);
        showToast(`Student ${payload.fullName} updated successfully!`, 'success');
      } else {
        await studentService.createStudent(school!.id, payload);
        showToast(`Student ${payload.fullName} registered successfully!`, 'success');
      }

      setIsAddModalOpen(false);
      setSelectedStudent(null);
      await loadStudents();
    } catch (e: any) {
      showToast('Error saving student: ' + e.message, 'error');
    }
  };

  const handleArchive = async (student: Student) => {
    if (confirm(`Archive student ${student.fullName}?`)) {
      try {
        await studentService.archiveStudent(school!.id, student.id, 'INACTIVE');
        showToast('Student archived', 'info');
        await loadStudents();
      } catch (e: any) {
        showToast('Error archiving: ' + e.message, 'error');
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
    const headers = ['Admission No', 'UPI / NEMIS No', 'Full Name', 'Gender', 'Class', 'Stream', 'Status', 'Parent Name', 'Parent Phone', 'Balance'];
    const rows = filteredStudents.map((s) => [
      s.admissionNumber,
      `"${s.upiNumber || s.nemisNumber || ''}"`,
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
            Playgroup through Grade 9 learner registers, UPI/NEMIS tracking, medical profiles, and CBC portfolios.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />} onClick={exportCSV}>
            Export CSV
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

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading student directory...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-sm font-semibold text-slate-700">No students found</div>
            <p className="text-xs text-slate-400">Try adjusting your filters or click 'Load Sample Data' in the navbar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
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
                {filteredStudents.map((std) => (
                  <tr key={std.id} className="hover:bg-slate-50/70 transition-colors">
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
                            upiNumber: std.upiNumber || '',
                            nemisNumber: std.nemisNumber || '',
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
                        title="Edit Student"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleArchive(std)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Archive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
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
              <label className="font-semibold text-slate-700">Admission No *</label>
              <input
                type="text"
                required
                placeholder="e.g. GLCM/2026/001"
                value={formData.admissionNumber}
                onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-800"
              />
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
              <label className="font-semibold text-slate-700">UPI Number</label>
              <input
                type="text"
                placeholder="e.g. UPI-9281920"
                value={formData.upiNumber}
                onChange={(e) => setFormData({ ...formData, upiNumber: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-800"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">NEMIS Number</label>
              <input
                type="text"
                placeholder="e.g. NEMIS-12345"
                value={formData.nemisNumber}
                onChange={(e) => setFormData({ ...formData, nemisNumber: e.target.value })}
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
    </div>
  );
};

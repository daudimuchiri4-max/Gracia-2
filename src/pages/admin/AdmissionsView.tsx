import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { operationsService } from '../../services/operationsService';
import { studentService } from '../../services/studentService';
import { AdmissionApplication, GradeLevel } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import {
  CheckCircle,
  XCircle,
  UserPlus,
  Search,
  Eye,
  FileText,
  Clock,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';

export const AdmissionsView: React.FC = () => {
  const { school } = useAuth();
  const { showToast } = useToast();
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedApp, setSelectedApp] = useState<AdmissionApplication | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [converting, setConverting] = useState<boolean>(false);

  useEffect(() => {
    if (!school?.id) return;
    loadAdmissions();
  }, [school?.id]);

  const loadAdmissions = async () => {
    setLoading(true);
    try {
      const list = await operationsService.getAdmissions(school!.id);
      setApplications(list);
    } catch (e: any) {
      showToast('Error loading admission applications: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (appId: string, status: AdmissionApplication['status']) => {
    try {
      await operationsService.updateAdmissionStatus(school!.id, appId, status);
      showToast(`Application marked as ${status}`, 'success');
      await loadAdmissions();
      if (selectedApp && selectedApp.id === appId) {
        setSelectedApp({ ...selectedApp, status });
      }
    } catch (e: any) {
      showToast('Error updating status: ' + e.message, 'error');
    }
  };

  const handleEnrollAsStudent = async (app: AdmissionApplication) => {
    setConverting(true);
    try {
      const names = app.studentFullName.split(' ');
      const firstName = names[0] || 'Learner';
      const lastName = names.slice(1).join(' ') || 'Student';
      const admNumber = await studentService.generateNextAdmissionNumber(
        school!.id,
        school?.code || 'GLC',
        school?.academicYear || '2026'
      );

      await studentService.createStudent(school!.id, {
        admissionNumber: admNumber,
        firstName,
        lastName,
        fullName: app.studentFullName,
        gender: app.gender,
        dateOfBirth: app.dateOfBirth,
        birthCertNumber: app.birthCertNumber || '',
        assessmentNumber: (app.assessmentOrKemis || app.upiOrNemis)?.toUpperCase().startsWith('ASN') || (app.assessmentOrKemis || app.upiOrNemis)?.toUpperCase().startsWith('UPI') ? (app.assessmentOrKemis || app.upiOrNemis) : (app.assessmentOrKemis || app.upiOrNemis || ''),
        kemisNumber: (app.assessmentOrKemis || app.upiOrNemis)?.toUpperCase().startsWith('KEMIS') || (app.assessmentOrKemis || app.upiOrNemis)?.toUpperCase().startsWith('NEMIS') ? (app.assessmentOrKemis || app.upiOrNemis) : (app.assessmentOrKemis || app.upiOrNemis || ''),
        upiNumber: (app.assessmentOrKemis || app.upiOrNemis || ''),
        nemisNumber: (app.assessmentOrKemis || app.upiOrNemis || ''),
        nationality: 'Kenyan',
        admissionDate: new Date().toISOString().split('T')[0],
        currentClass: app.desiredClass,
        stream: 'East',
        status: 'ACTIVE',
        residentialAddress: app.residentialAddress || 'Kasarani Mwiki, Nairobi',
        parentName: app.parentFullName,
        parentPhone: app.parentPhone,
        parentEmail: app.parentEmail,
        emergencyContact: `${app.parentFullName} (Parent)`,
        emergencyPhone: app.parentPhone,
        totalBalance: 0,
      });

      await operationsService.updateAdmissionStatus(school!.id, app.id, 'ENROLLED');
      showToast(`Applicant ${app.studentFullName} successfully enrolled as student (${admNumber})!`, 'success');
      setIsDetailModalOpen(false);
      await loadAdmissions();
    } catch (e: any) {
      showToast('Error enrolling student: ' + e.message, 'error');
    } finally {
      setConverting(false);
    }
  };

  const filtered = applications.filter((a) => {
    const q = search.toLowerCase();
    return (
      !search ||
      a.studentFullName?.toLowerCase().includes(q) ||
      a.parentFullName?.toLowerCase().includes(q) ||
      a.parentPhone?.includes(q) ||
      a.applicationNumber?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Online Admission Applications</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Applications received directly from the public school website.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by student name, parent phone, or application number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-xs focus:outline-none bg-transparent"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading applications...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <FileText className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-sm font-semibold text-slate-700">No applications received yet</div>
            <p className="text-xs text-slate-400">
              Prospective parents can submit online applications directly via the Public Website.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">App Number</th>
                  <th className="p-3.5">Prospective Learner</th>
                  <th className="p-3.5">Desired Level</th>
                  <th className="p-3.5">Parent / Guardian</th>
                  <th className="p-3.5">Submitted Date</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/70">
                    <td className="p-3.5 font-bold text-slate-900">{app.applicationNumber}</td>
                    <td className="p-3.5 font-semibold text-slate-900">{app.studentFullName}</td>
                    <td className="p-3.5">
                      <Badge variant="primary" size="sm">
                        {app.desiredClass}
                      </Badge>
                    </td>
                    <td className="p-3.5">
                      <div className="font-medium text-slate-800">{app.parentFullName}</div>
                      <div className="text-[10px] text-slate-400">{app.parentPhone}</div>
                    </td>
                    <td className="p-3.5 text-slate-500">{new Date(app.createdAt).toLocaleDateString()}</td>
                    <td className="p-3.5">
                      <Badge
                        variant={
                          app.status === 'ENROLLED'
                            ? 'success'
                            : app.status === 'APPROVED'
                            ? 'primary'
                            : app.status === 'REJECTED'
                            ? 'danger'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {app.status}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-right space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setSelectedApp(app);
                          setIsDetailModalOpen(true);
                        }}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Application Review Modal */}
      {selectedApp && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Application: ${selectedApp.applicationNumber}`}
          subtitle={`Prospective Learner: ${selectedApp.studentFullName}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 font-medium">Desired Grade:</span>
                <p className="text-sm font-bold text-slate-900">{selectedApp.desiredClass}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Gender & DOB:</span>
                <p className="text-sm font-semibold text-slate-900">
                  {selectedApp.gender} • {selectedApp.dateOfBirth}
                </p>
              </div>
              {selectedApp.birthCertNumber && (
                <div>
                  <span className="text-slate-400 font-medium">Birth Cert Number:</span>
                  <p className="text-sm font-mono font-bold text-slate-900">{selectedApp.birthCertNumber}</p>
                </div>
              )}
              {(selectedApp.assessmentOrKemis || selectedApp.upiOrNemis) && (
                <div>
                  <span className="text-slate-400 font-medium">Assessment / KEMIS Number:</span>
                  <p className="text-sm font-mono font-bold text-blue-900">{selectedApp.assessmentOrKemis || selectedApp.upiOrNemis}</p>
                </div>
              )}
              <div className="col-span-2">
                <span className="text-slate-400 font-medium">Parent Contact:</span>
                <p className="text-sm font-bold text-slate-900">
                  {selectedApp.parentFullName} ({selectedApp.parentPhone} • {selectedApp.parentEmail})
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 font-medium">Residential Address:</span>
                <p className="text-slate-800">{selectedApp.residentialAddress}</p>
              </div>
              {selectedApp.previousSchool && (
                <div className="col-span-2">
                  <span className="text-slate-400 font-medium">Previous School:</span>
                  <p className="text-slate-800">{selectedApp.previousSchool}</p>
                </div>
              )}
            </div>

            {/* Decision Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-emerald-700 border-emerald-300"
                  icon={<CheckCircle className="w-3.5 h-3.5" />}
                  onClick={() => handleUpdateStatus(selectedApp.id, 'APPROVED')}
                >
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-rose-700 border-rose-300"
                  icon={<XCircle className="w-3.5 h-3.5" />}
                  onClick={() => handleUpdateStatus(selectedApp.id, 'REJECTED')}
                >
                  Reject
                </Button>
              </div>

              {selectedApp.status !== 'ENROLLED' && (
                <Button
                  variant="primary"
                  size="sm"
                  loading={converting}
                  icon={<UserPlus className="w-4 h-4" />}
                  onClick={() => handleEnrollAsStudent(selectedApp)}
                >
                  Convert & Enroll Student
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

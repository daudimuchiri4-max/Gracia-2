import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { operationsService } from '../../services/operationsService';
import { studentService } from '../../services/studentService';
import { HealthRecord, DisciplineIncident, Student, GradeLevel } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { HeartPulse, ShieldAlert, PlusCircle } from 'lucide-react';

export const HealthDisciplineView: React.FC = () => {
  const { school, user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'HEALTH' | 'DISCIPLINE'>('HEALTH');
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [disciplineRecords, setDisciplineRecords] = useState<DisciplineIncident[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [healthForm, setHealthForm] = useState({
    studentId: '',
    incidentType: 'First Aid' as HealthRecord['incidentType'],
    symptoms: 'Mild headache and fever after physical education class',
    treatmentGiven: 'Administered 250mg Paracetamol, rested for 45 mins at sick bay',
    parentNotified: true,
  });

  const [isDisciplineModalOpen, setIsDisciplineModalOpen] = useState(false);
  const [disciplineForm, setDisciplineForm] = useState({
    studentId: '',
    category: 'Disruptive' as DisciplineIncident['category'],
    description: 'Repeatedly used colloquial banter in hallway during quiet study',
    actionTaken: 'Guidance counseling with Tr. Grace and assigned 15 mins library cleanup',
    parentNotified: false,
  });

  useEffect(() => {
    if (!school?.id) return;
    loadData();
  }, [school?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [hList, dList, stdList] = await Promise.all([
        operationsService.getHealthRecords(school!.id),
        operationsService.getDisciplineIncidents(school!.id),
        studentService.getStudents(school!.id),
      ]);
      setHealthRecords(hList);
      setDisciplineRecords(dList);
      setStudents(stdList);

      if (stdList.length > 0) {
        if (!healthForm.studentId) setHealthForm((p) => ({ ...p, studentId: stdList[0].id }));
        if (!disciplineForm.studentId) setDisciplineForm((p) => ({ ...p, studentId: stdList[0].id }));
      }
    } catch (e: any) {
      showToast('Error loading wellness records: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveHealth = async (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === healthForm.studentId);
    if (!student) return;

    try {
      await operationsService.createHealthRecord(school!.id, {
        studentId: student.id,
        studentName: student.fullName,
        classLevel: student.currentClass,
        stream: student.stream,
        date: new Date().toISOString().split('T')[0],
        incidentType: healthForm.incidentType,
        symptoms: healthForm.symptoms,
        treatmentGiven: healthForm.treatmentGiven,
        nurseOrAttendant: user?.fullName || 'School Nurse',
        parentNotified: healthForm.parentNotified,
      });

      showToast(`Clinic visit recorded for ${student.fullName}!`, 'success');
      setIsHealthModalOpen(false);
      await loadData();
    } catch (e: any) {
      showToast('Error saving health record: ' + e.message, 'error');
    }
  };

  const handleSaveDiscipline = async (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === disciplineForm.studentId);
    if (!student) return;

    try {
      await operationsService.createDisciplineIncident(school!.id, {
        studentId: student.id,
        studentName: student.fullName,
        classLevel: student.currentClass,
        stream: student.stream,
        date: new Date().toISOString().split('T')[0],
        category: disciplineForm.category,
        description: disciplineForm.description,
        actionTaken: disciplineForm.actionTaken,
        reportedBy: user?.fullName || 'Teacher on Duty',
        parentNotified: disciplineForm.parentNotified,
        status: 'RESOLVED',
      });

      showToast(`Guidance incident logged for ${student.fullName}!`, 'success');
      setIsDisciplineModalOpen(false);
      await loadData();
    } catch (e: any) {
      showToast('Error logging discipline incident: ' + e.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Learner Health & Guidance Center</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sick bay medical dispensary visits, allergy alerts, and restorative discipline logs.
          </p>
        </div>

        <div className="flex gap-2">
          {activeTab === 'HEALTH' ? (
            <Button
              variant="primary"
              size="sm"
              icon={<HeartPulse className="w-4 h-4" />}
              onClick={() => setIsHealthModalOpen(true)}
            >
              Record Clinic Visit
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              icon={<ShieldAlert className="w-4 h-4" />}
              onClick={() => setIsDisciplineModalOpen(true)}
            >
              Log Incident
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-semibold gap-4">
        <button
          onClick={() => setActiveTab('HEALTH')}
          className={`pb-3 px-1 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'HEALTH' ? 'border-blue-900 text-blue-900 font-bold' : 'border-transparent text-slate-500'
          }`}
        >
          Clinic & Sick Bay Visits ({healthRecords.length})
        </button>
        <button
          onClick={() => setActiveTab('DISCIPLINE')}
          className={`pb-3 px-1 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'DISCIPLINE' ? 'border-blue-900 text-blue-900 font-bold' : 'border-transparent text-slate-500'
          }`}
        >
          Guidance & Discipline Logs ({disciplineRecords.length})
        </button>
      </div>

      {activeTab === 'HEALTH' ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading clinic records...</div>
          ) : healthRecords.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <HeartPulse className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="text-sm font-semibold text-slate-700">No clinic visits recorded</div>
              <p className="text-xs text-slate-400">All students are healthy and in class!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Learner / Class</th>
                    <th className="p-3.5">Visit Date</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Observed Symptoms</th>
                    <th className="p-3.5">Treatment Given</th>
                    <th className="p-3.5">Parent Notified</th>
                    <th className="p-3.5">Attendant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {healthRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/70">
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-900">{rec.studentName}</div>
                        <div className="text-[10px] text-slate-400">
                          {rec.classLevel} ({rec.stream})
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-600">{rec.date}</td>
                      <td className="p-3.5">
                        <Badge variant="primary" size="sm">
                          {rec.incidentType}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-slate-800">{rec.symptoms}</td>
                      <td className="p-3.5 text-slate-800 font-medium">{rec.treatmentGiven}</td>
                      <td className="p-3.5">
                        <Badge variant={rec.parentNotified ? 'success' : 'neutral'} size="sm">
                          {rec.parentNotified ? 'Notified' : 'No'}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-slate-600 font-medium">{rec.nurseOrAttendant}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {disciplineRecords.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">No disciplinary incidents logged.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Learner / Class</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Incident Details</th>
                    <th className="p-3.5">Restorative Action Taken</th>
                    <th className="p-3.5">Reported By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {disciplineRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/70">
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-900">{rec.studentName}</div>
                        <div className="text-[10px] text-slate-400">
                          {rec.classLevel} ({rec.stream})
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-600">{rec.date}</td>
                      <td className="p-3.5">
                        <Badge variant="warning" size="sm">
                          {rec.category}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-slate-800">{rec.description}</td>
                      <td className="p-3.5 text-slate-900 font-semibold">{rec.actionTaken}</td>
                      <td className="p-3.5 text-slate-600">{rec.reportedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Record Health Visit Modal */}
      <Modal isOpen={isHealthModalOpen} onClose={() => setIsHealthModalOpen(false)} title="Record Sick Bay Clinic Visit" maxWidth="md">
        <form onSubmit={handleSaveHealth} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700">Learner *</label>
            <select
              value={healthForm.studentId}
              onChange={(e) => setHealthForm({ ...healthForm, studentId: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white font-medium"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.currentClass} • {s.admissionNumber})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-semibold text-slate-700">Visit / Incident Type</label>
            <select
              value={healthForm.incidentType}
              onChange={(e) => setHealthForm({ ...healthForm, incidentType: e.target.value as any })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white font-medium"
            >
              <option value="First Aid">First Aid</option>
              <option value="Fever/Flu">Fever / Flu</option>
              <option value="Routine Check">Routine Check</option>
              <option value="Allergic Reaction">Allergic Reaction</option>
              <option value="Injury">Injury</option>
              <option value="Hospital Referral">Hospital Referral</option>
            </select>
          </div>
          <div>
            <label className="font-semibold text-slate-700">Symptoms / Complaint *</label>
            <textarea
              rows={2}
              required
              value={healthForm.symptoms}
              onChange={(e) => setHealthForm({ ...healthForm, symptoms: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700">Treatment Given / Medication *</label>
            <textarea
              rows={2}
              required
              value={healthForm.treatmentGiven}
              onChange={(e) => setHealthForm({ ...healthForm, treatmentGiven: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>
          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={healthForm.parentNotified}
                onChange={(e) => setHealthForm({ ...healthForm, parentNotified: e.target.checked })}
                className="rounded text-blue-900"
              />
              <span className="font-medium text-slate-700">Parent Notified via Phone / SMS</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" type="button" onClick={() => setIsHealthModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Clinic Record
            </Button>
          </div>
        </form>
      </Modal>

      {/* Record Discipline Modal */}
      <Modal isOpen={isDisciplineModalOpen} onClose={() => setIsDisciplineModalOpen(false)} title="Log Restorative Guidance Incident" maxWidth="md">
        <form onSubmit={handleSaveDiscipline} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700">Learner *</label>
            <select
              value={disciplineForm.studentId}
              onChange={(e) => setDisciplineForm({ ...disciplineForm, studentId: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white font-medium"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.currentClass} • {s.admissionNumber})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-semibold text-slate-700">Category</label>
            <select
              value={disciplineForm.category}
              onChange={(e) => setDisciplineForm({ ...disciplineForm, category: e.target.value as any })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white font-medium"
            >
              <option value="Disruptive">Disruptive Behavior</option>
              <option value="Late Coming">Late Coming</option>
              <option value="Uniform Violation">Uniform Violation</option>
              <option value="Incomplete Homework">Incomplete Homework</option>
              <option value="Bullying">Bullying</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="font-semibold text-slate-700">Incident Description *</label>
            <textarea
              rows={2}
              required
              value={disciplineForm.description}
              onChange={(e) => setDisciplineForm({ ...disciplineForm, description: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700">Restorative Action / Counseling *</label>
            <textarea
              rows={2}
              required
              value={disciplineForm.actionTaken}
              onChange={(e) => setDisciplineForm({ ...disciplineForm, actionTaken: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" type="button" onClick={() => setIsDisciplineModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Log Incident
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { studentService } from '../../services/studentService';
import { assessmentService, attendanceService } from '../../services/assessmentAndAttendanceService';
import { academicService } from '../../services/academicService';
import { Student, Subject, GradeLevel, CBCRating } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { CalendarCheck, Award, Users, Save, CheckCircle, Clock } from 'lucide-react';

export const TeacherPortal: React.FC = () => {
  const { school, user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'ATTENDANCE' | 'MARKS'>('ATTENDANCE');
  const [selectedClass, setSelectedClass] = useState<GradeLevel>('Grade 6');
  const [selectedStream, setSelectedStream] = useState('East');
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [loading, setLoading] = useState(true);

  // Attendance state
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'PRESENT' | 'ABSENT' | 'LATE' | 'SICK'>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Marks state
  const [markMap, setMarkMap] = useState<Record<string, { score: number; comment: string }>>({});
  const [savingMarks, setSavingMarks] = useState(false);

  useEffect(() => {
    if (!school?.id) return;
    loadTeacherData();
  }, [school?.id, selectedClass, selectedStream]);

  const loadTeacherData = async () => {
    setLoading(true);
    try {
      const [stdList, subList] = await Promise.all([
        studentService.getStudents(school!.id, { classLevel: selectedClass, stream: selectedStream }),
        academicService.getSubjects(school!.id),
      ]);
      setStudents(stdList);
      setSubjects(subList);
      if (subList.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(subList[0].id);
      }

      const initialAtt: Record<string, 'PRESENT' | 'ABSENT' | 'LATE' | 'SICK'> = {};
      const initialMarks: Record<string, { score: number; comment: string }> = {};
      stdList.forEach((s) => {
        initialAtt[s.id] = 'PRESENT';
        initialMarks[s.id] = { score: 80, comment: 'Good participation' };
      });
      setAttendanceMap(initialAtt);
      setMarkMap(initialMarks);
    } catch (e: any) {
      showToast('Error loading teacher portal: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAttendance = async () => {
    setSavingAttendance(true);
    try {
      await attendanceService.saveAttendance(school!.id, {
        date: attendanceDate,
        classLevel: selectedClass,
        stream: selectedStream,
        recordedBy: user?.fullName || 'Class Facilitator',
        entries: students.map((s) => ({
          studentId: s.id,
          studentName: s.fullName,
          admissionNumber: s.admissionNumber,
          status: attendanceMap[s.id] || 'PRESENT',
        })),
      });
      showToast('Attendance roll submitted to school records!', 'success');
    } catch (e: any) {
      showToast('Error saving attendance: ' + e.message, 'error');
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleSaveMarks = async () => {
    setSavingMarks(true);
    try {
      const sub = subjects.find((s) => s.id === selectedSubjectId);
      for (const std of students) {
        const m = markMap[std.id] || { score: 75, comment: '' };
        await assessmentService.saveResult(school!.id, {
          assessmentId: `ass_${selectedClass}_${selectedSubjectId}`,
          studentId: std.id,
          studentName: std.fullName,
          admissionNumber: std.admissionNumber,
          classLevel: std.currentClass,
          stream: std.stream,
          subjectName: sub?.name || 'Mathematics',
          score: m.score,
          maxScore: 100,
          teacherComment: m.comment,
        });
      }
      showToast('CBC competency evaluation saved!', 'success');
    } catch (e: any) {
      showToast('Error saving marks: ' + e.message, 'error');
    } finally {
      setSavingMarks(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-md">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-blue-200 mb-3 border border-white/15">
          <span>Teacher & CBC Facilitator Workspace</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Welcome, {user?.fullName || 'Teacher'}
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-blue-100/90 max-w-xl">
          Quick roll call register, continuous assessment recording, and CBC formative grading matrix.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-semibold gap-4">
        <button
          onClick={() => setActiveTab('ATTENDANCE')}
          className={`pb-3 px-1 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'ATTENDANCE'
              ? 'border-blue-900 text-blue-900 font-bold'
              : 'border-transparent text-slate-500'
          }`}
        >
          Daily Roll Call Attendance
        </button>
        <button
          onClick={() => setActiveTab('MARKS')}
          className={`pb-3 px-1 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'MARKS' ? 'border-blue-900 text-blue-900 font-bold' : 'border-transparent text-slate-500'
          }`}
        >
          Enter CBC Subject Scores
        </button>
      </div>

      {/* Selector Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block">Class Level</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value as GradeLevel)}
              className="text-xs font-bold text-slate-900 border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 mt-0.5"
            >
              {[
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
              ].map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block">Stream</label>
            <select
              value={selectedStream}
              onChange={(e) => setSelectedStream(e.target.value)}
              className="text-xs font-bold text-slate-900 border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 mt-0.5"
            >
              <option value="East">East</option>
              <option value="West">West</option>
              <option value="Alpha">Alpha</option>
            </select>
          </div>

          {activeTab === 'MARKS' && (
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block">Subject Area</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="text-xs font-bold text-slate-900 border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 mt-0.5"
              >
                {subjects.map((sb) => (
                  <option key={sb.id} value={sb.id}>
                    {sb.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div>
          {activeTab === 'ATTENDANCE' ? (
            <Button
              variant="primary"
              size="sm"
              loading={savingAttendance}
              icon={<Save className="w-4 h-4" />}
              onClick={handleSaveAttendance}
            >
              Submit Attendance
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              loading={savingMarks}
              icon={<Save className="w-4 h-4" />}
              onClick={handleSaveMarks}
            >
              Save Marks & Ratings
            </Button>
          )}
        </div>
      </div>

      {/* Content Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading student roster...</div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No students registered in this class.</div>
        ) : activeTab === 'ATTENDANCE' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Admission No</th>
                  <th className="p-3.5">Learner Name</th>
                  <th className="p-3.5">Attendance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((std) => {
                  const curr = attendanceMap[std.id] || 'PRESENT';
                  return (
                    <tr key={std.id} className="hover:bg-slate-50/70">
                      <td className="p-3.5 font-bold text-slate-900">{std.admissionNumber}</td>
                      <td className="p-3.5 font-semibold text-slate-900">{std.fullName}</td>
                      <td className="p-3.5">
                        <div className="flex gap-2">
                          {(['PRESENT', 'ABSENT', 'LATE', 'SICK'] as const).map((st) => (
                            <button
                              key={st}
                              onClick={() => setAttendanceMap((p) => ({ ...p, [std.id]: st }))}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                curr === st
                                  ? st === 'PRESENT'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : st === 'ABSENT'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'bg-amber-600 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Admission No</th>
                  <th className="p-3.5">Learner Name</th>
                  <th className="p-3.5 w-32">Score (/100)</th>
                  <th className="p-3.5">CBC Rating</th>
                  <th className="p-3.5">Facilitator Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((std) => {
                  const m = markMap[std.id] || { score: 80, comment: '' };
                  const rating: CBCRating =
                    m.score >= 80 ? 'EE' : m.score >= 60 ? 'ME' : m.score >= 40 ? 'AE' : 'BE';
                  return (
                    <tr key={std.id} className="hover:bg-slate-50/70">
                      <td className="p-3.5 font-bold text-slate-900">{std.admissionNumber}</td>
                      <td className="p-3.5 font-semibold text-slate-900">{std.fullName}</td>
                      <td className="p-3.5">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={m.score}
                          onChange={(e) =>
                            setMarkMap((p) => ({
                              ...p,
                              [std.id]: { ...m, score: Number(e.target.value) },
                            }))
                          }
                          className="w-20 px-3 py-1.5 border border-slate-200 rounded-xl font-bold"
                        />
                      </td>
                      <td className="p-3.5">
                        <Badge
                          variant={
                            rating === 'EE'
                              ? 'success'
                              : rating === 'ME'
                              ? 'primary'
                              : rating === 'AE'
                              ? 'warning'
                              : 'danger'
                          }
                          size="sm"
                        >
                          {rating}
                        </Badge>
                      </td>
                      <td className="p-3.5">
                        <input
                          type="text"
                          value={m.comment}
                          onChange={(e) =>
                            setMarkMap((p) => ({
                              ...p,
                              [std.id]: { ...m, comment: e.target.value },
                            }))
                          }
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

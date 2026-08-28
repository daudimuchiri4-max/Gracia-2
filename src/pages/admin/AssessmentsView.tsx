import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { assessmentService } from '../../services/assessmentAndAttendanceService';
import { academicService } from '../../services/academicService';
import { studentService } from '../../services/studentService';
import { Assessment, AssessmentResult, Subject, Student, GradeLevel, CBCRating } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Award, PlusCircle, Save, CheckCircle, Calculator, Search } from 'lucide-react';

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

export const AssessmentsView: React.FC = () => {
  const { school } = useAuth();
  const { showToast } = useToast();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Score Entry state
  const [scores, setScores] = useState<Record<string, { score: number; comment: string; rating: CBCRating }>>({});
  const [saving, setSaving] = useState(false);

  // Add Assessment Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAssForm, setNewAssForm] = useState({
    title: 'Term 1 Mid-Term CBC Assessment',
    type: 'MID_TERM' as Assessment['type'],
    academicYear: '2026',
    term: 'Term 1' as 'Term 1' | 'Term 2' | 'Term 3',
    classLevel: 'Grade 6' as GradeLevel,
    stream: 'East',
    subjectId: '',
    maxScore: 100,
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (!school?.id) return;
    loadData();
  }, [school?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assList, sList, stdList] = await Promise.all([
        assessmentService.getAssessments(school!.id),
        academicService.getSubjects(school!.id),
        studentService.getStudents(school!.id),
      ]);
      setAssessments(assList);
      setSubjects(sList);
      setStudents(stdList);

      if (assList.length > 0) {
        selectAssessment(assList[0]);
      }
    } catch (e: any) {
      showToast('Error loading assessments: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectAssessment = async (ass: Assessment) => {
    setSelectedAssessment(ass);
    try {
      const resList = await assessmentService.getResults(school!.id, { assessmentId: ass.id });
      setResults(resList);

      // Populate existing scores
      const scoreMap: Record<string, { score: number; comment: string; rating: CBCRating }> = {};
      resList.forEach((r) => {
        scoreMap[r.studentId] = {
          score: r.score,
          comment: r.teacherComment || '',
          rating: r.cbcRating,
        };
      });
      setScores(scoreMap);
    } catch (e) {
      console.error('Error fetching results:', e);
    }
  };

  const handleScoreChange = (studentId: string, value: number, maxScore: number) => {
    const validScore = Math.max(0, Math.min(maxScore, value || 0));
    const rating = assessmentService.calculateCBCRating(validScore, maxScore);
    setScores((prev) => ({
      ...prev,
      [studentId]: {
        score: validScore,
        comment: prev[studentId]?.comment || '',
        rating,
      },
    }));
  };

  const handleSaveAllResults = async () => {
    if (!selectedAssessment) return;
    setSaving(true);
    try {
      const relevantStudents = students.filter(
        (s) => s.currentClass === selectedAssessment.classLevel && (!selectedAssessment.stream || s.stream === selectedAssessment.stream)
      );

      for (const std of relevantStudents) {
        const studentScore = scores[std.id];
        if (studentScore && studentScore.score !== undefined) {
          await assessmentService.saveResult(school!.id, {
            assessmentId: selectedAssessment.id,
            studentId: std.id,
            studentName: std.fullName,
            admissionNumber: std.admissionNumber,
            classLevel: std.currentClass,
            stream: std.stream,
            subjectName: selectedAssessment.subjectName,
            score: studentScore.score,
            maxScore: selectedAssessment.maxScore,
            teacherComment: studentScore.comment,
          });
        }
      }

      showToast('CBC Assessment scores saved successfully to Firestore!', 'success');
      await selectAssessment(selectedAssessment);
    } catch (e: any) {
      showToast('Error saving marks: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    const subj = subjects.find((s) => s.id === newAssForm.subjectId) || subjects[0];
    if (!subj) {
      showToast('Please create learning areas first', 'error');
      return;
    }

    try {
      const newAss = await assessmentService.createAssessment(school!.id, {
        title: newAssForm.title,
        type: newAssForm.type,
        academicYear: newAssForm.academicYear,
        term: newAssForm.term,
        classLevel: newAssForm.classLevel,
        stream: newAssForm.stream,
        subjectId: subj.id,
        subjectName: subj.name,
        maxScore: Number(newAssForm.maxScore),
        date: newAssForm.date,
        status: 'PUBLISHED',
      });

      showToast(`Assessment ${newAss.title} created!`, 'success');
      setIsAddModalOpen(false);
      await loadData();
      selectAssessment(newAss);
    } catch (e: any) {
      showToast('Error creating assessment: ' + e.message, 'error');
    }
  };

  const classStudents = selectedAssessment
    ? students.filter(
        (s) =>
          s.currentClass === selectedAssessment.classLevel &&
          (!selectedAssessment.stream || s.stream === selectedAssessment.stream)
      )
    : [];

  const getCBCRatingBadge = (rating: CBCRating) => {
    switch (rating) {
      case 'EE':
        return <Badge variant="success" size="sm">EE (Exceeding)</Badge>;
      case 'ME':
        return <Badge variant="primary" size="sm">ME (Meeting)</Badge>;
      case 'AE':
        return <Badge variant="warning" size="sm">AE (Approaching)</Badge>;
      case 'BE':
        return <Badge variant="danger" size="sm">BE (Below)</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{rating}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">CBC / CBE Assessment & Evaluation</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Record Continuous Assessments, CATs, End-Term Exams & Kenyan Competency Rubrics.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<PlusCircle className="w-4 h-4" />}
          onClick={() => {
            if (subjects.length > 0 && !newAssForm.subjectId) {
              setNewAssForm((p) => ({ ...p, subjectId: subjects[0].id }));
            }
            setIsAddModalOpen(true);
          }}
        >
          New Assessment
        </Button>
      </div>

      {/* Assessment Selector Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Award className="w-5 h-5 text-blue-900" />
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Selected Assessment</span>
            <select
              value={selectedAssessment?.id || ''}
              onChange={(e) => {
                const found = assessments.find((a) => a.id === e.target.value);
                if (found) selectAssessment(found);
              }}
              className="text-xs font-bold text-slate-900 border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50"
            >
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} ({a.classLevel} {a.stream ? `• ${a.stream}` : ''} • {a.subjectName})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedAssessment && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500 font-medium">Max Score: <strong>{selectedAssessment.maxScore}</strong></span>
            <Button
              variant="secondary"
              size="sm"
              loading={saving}
              icon={<Save className="w-4 h-4" />}
              onClick={handleSaveAllResults}
            >
              Save Results
            </Button>
          </div>
        )}
      </div>

      {/* Scoring Matrix Table */}
      {selectedAssessment ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="text-xs font-bold text-slate-800">
              Entering Marks for: {selectedAssessment.classLevel} - {selectedAssessment.stream} ({selectedAssessment.subjectName})
            </div>
            <div className="text-xs text-slate-500 font-medium">
              {classStudents.length} Registered Learners
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Admission No</th>
                  <th className="p-3.5">Learner Name</th>
                  <th className="p-3.5 w-36">Raw Score (/{selectedAssessment.maxScore})</th>
                  <th className="p-3.5 text-center">Percentage</th>
                  <th className="p-3.5 text-center">Grade</th>
                  <th className="p-3.5 text-center">CBC Level Rating</th>
                  <th className="p-3.5">Facilitator Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classStudents.map((std) => {
                  const entry = scores[std.id] || { score: 0, comment: '', rating: 'ME' };
                  const pct = Math.round((entry.score / (selectedAssessment.maxScore || 100)) * 100);
                  const grade = assessmentService.calculateGrade(entry.score, selectedAssessment.maxScore);

                  return (
                    <tr key={std.id} className="hover:bg-slate-50/70">
                      <td className="p-3.5 font-bold text-slate-900">{std.admissionNumber}</td>
                      <td className="p-3.5 font-semibold text-slate-900">{std.fullName}</td>
                      <td className="p-3.5">
                        <input
                          type="number"
                          min="0"
                          max={selectedAssessment.maxScore}
                          value={entry.score}
                          onChange={(e) =>
                            handleScoreChange(std.id, Number(e.target.value), selectedAssessment.maxScore)
                          }
                          className="w-24 px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-800 bg-white"
                        />
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-900">{pct}%</td>
                      <td className="p-3.5 text-center font-black text-blue-900">{grade}</td>
                      <td className="p-3.5 text-center">{getCBCRatingBadge(entry.rating)}</td>
                      <td className="p-3.5">
                        <input
                          type="text"
                          placeholder="e.g. Excellent critical thinking"
                          value={entry.comment}
                          onChange={(e) =>
                            setScores((prev) => ({
                              ...prev,
                              [std.id]: { ...entry, comment: e.target.value },
                            }))
                          }
                          className="w-full px-3 py-1 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-800 bg-white"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
          No assessments configured yet. Click 'New Assessment' or load demo data.
        </div>
      )}

      {/* Add Assessment Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create New CBC Assessment" maxWidth="md">
        <form onSubmit={handleCreateAssessment} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700">Assessment Title *</label>
            <input
              type="text"
              required
              value={newAssForm.title}
              onChange={(e) => setNewAssForm({ ...newAssForm, title: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Assessment Type</label>
              <select
                value={newAssForm.type}
                onChange={(e) => setNewAssForm({ ...newAssForm, type: e.target.value as any })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white"
              >
                <option value="CAT">Continuous Assessment (CAT)</option>
                <option value="MID_TERM">Mid-Term Evaluation</option>
                <option value="END_TERM">End of Term Examination</option>
                <option value="CBC_PRACTICAL">CBC Practical / Project</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700">Term</label>
              <select
                value={newAssForm.term}
                onChange={(e) => setNewAssForm({ ...newAssForm, term: e.target.value as any })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white"
              >
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Grade Level</label>
              <select
                value={newAssForm.classLevel}
                onChange={(e) => setNewAssForm({ ...newAssForm, classLevel: e.target.value as GradeLevel })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white"
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
                placeholder="e.g. East"
                value={newAssForm.stream}
                onChange={(e) => setNewAssForm({ ...newAssForm, stream: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
          <div>
            <label className="font-semibold text-slate-700">Subject / Learning Area *</label>
            <select
              value={newAssForm.subjectId}
              onChange={(e) => setNewAssForm({ ...newAssForm, subjectId: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white"
            >
              {subjects.map((sb) => (
                <option key={sb.id} value={sb.id}>
                  {sb.name} ({sb.code})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Max Score</label>
              <input
                type="number"
                value={newAssForm.maxScore}
                onChange={(e) => setNewAssForm({ ...newAssForm, maxScore: Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Date</label>
              <input
                type="date"
                value={newAssForm.date}
                onChange={(e) => setNewAssForm({ ...newAssForm, date: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create Assessment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

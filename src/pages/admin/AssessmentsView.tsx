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
import { Award, PlusCircle, Save, CheckCircle, Calculator, Search, Printer, Calendar, Trash2, Edit3, RotateCcw, CheckSquare, Square } from 'lucide-react';
import { printerService } from '../../services/printerService';

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

  // Term selection state for marks entry
  const [selectedTerm, setSelectedTerm] = useState<'Term 1' | 'Term 2' | 'Term 3' | 'ALL'>('Term 1');
  const [registryTerm, setRegistryTerm] = useState<'ALL' | 'Term 1' | 'Term 2' | 'Term 3'>('ALL');

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

  // Edit Assessment Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editAssForm, setEditAssForm] = useState({
    title: '',
    type: 'MID_TERM' as Assessment['type'],
    academicYear: '2026',
    term: 'Term 1' as 'Term 1' | 'Term 2' | 'Term 3',
    classLevel: 'Grade 6' as GradeLevel,
    stream: '',
    subjectId: '',
    maxScore: 100,
    date: new Date().toISOString().split('T')[0],
  });

  // Registry state
  const [activeTab, setActiveTab] = useState<'scoring' | 'registry'>('scoring');
  const [allResults, setAllResults] = useState<AssessmentResult[]>([]);
  const [loadingRegistry, setLoadingRegistry] = useState(false);
  const [registrySearch, setRegistrySearch] = useState('');
  const [registryClass, setRegistryClass] = useState<string>('ALL');
  const [selectedResultIds, setSelectedResultIds] = useState<string[]>([]);
  const [deletingBulk, setDeletingBulk] = useState(false);

  // Edit Single Mark Modal state
  const [editingResult, setEditingResult] = useState<AssessmentResult | null>(null);
  const [isEditResultModalOpen, setIsEditResultModalOpen] = useState(false);
  const [editScoreValue, setEditScoreValue] = useState<number>(0);
  const [editMaxScoreValue, setEditMaxScoreValue] = useState<number>(100);
  const [editCommentValue, setEditCommentValue] = useState<string>('');
  const [editTermValue, setEditTermValue] = useState<'Term 1' | 'Term 2' | 'Term 3'>('Term 1');
  const [updatingResult, setUpdatingResult] = useState<boolean>(false);

  const handleUpdateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssessment || !school?.id) return;
    try {
      const sub = subjects.find((s) => s.id === editAssForm.subjectId);
      const updatedData = {
        ...editAssForm,
        subjectName: sub ? sub.name : selectedAssessment.subjectName,
      };
      await assessmentService.updateAssessment(school.id, selectedAssessment.id, updatedData);
      showToast('Assessment updated successfully!', 'success');
      setIsEditModalOpen(false);
      await loadData();
      const updatedList = await assessmentService.getAssessments(school.id);
      const newlyUpdated = updatedList.find((a) => a.id === selectedAssessment.id);
      if (newlyUpdated) setSelectedAssessment(newlyUpdated);
    } catch (e: any) {
      showToast('Error updating assessment: ' + e.message, 'error');
    }
  };

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

  // Filter assessments based on selected term
  const filteredAssessments = assessments.filter((a) => {
    if (selectedTerm === 'ALL') return true;
    return a.term === selectedTerm;
  });

  const handleSelectTerm = (term: 'ALL' | 'Term 1' | 'Term 2' | 'Term 3') => {
    setSelectedTerm(term);
    if (term === 'ALL') {
      if (!selectedAssessment && assessments.length > 0) {
        selectAssessment(assessments[0]);
      }
      return;
    }

    const termAssessments = assessments.filter((a) => a.term === term);
    if (termAssessments.length > 0) {
      if (selectedAssessment) {
        const matching = termAssessments.find(
          (a) =>
            a.classLevel === selectedAssessment.classLevel &&
            a.subjectId === selectedAssessment.subjectId
        );
        if (matching) {
          selectAssessment(matching);
          return;
        }
      }
      selectAssessment(termAssessments[0]);
    } else {
      setSelectedAssessment(null);
      setScores({});
    }
  };

  // Quick switch term or create assessment for current class & subject
  const handleTermSwitchForClassSubject = async (targetTerm: 'Term 1' | 'Term 2' | 'Term 3') => {
    setSelectedTerm(targetTerm);
    const existing = assessments.find(
      (a) =>
        a.term === targetTerm &&
        selectedAssessment &&
        a.classLevel === selectedAssessment.classLevel &&
        (!selectedAssessment.stream || a.stream === selectedAssessment.stream) &&
        a.subjectId === selectedAssessment.subjectId
    );

    if (existing) {
      selectAssessment(existing);
      showToast(`Switched to ${targetTerm} (${existing.title})`, 'info');
      return;
    }

    // Auto-create assessment for targetTerm if user switches to it
    if (selectedAssessment && school?.id) {
      try {
        const newTitle = `${targetTerm} ${selectedAssessment.type === 'END_TERM' ? 'End-Term Exam' : selectedAssessment.type === 'CAT' ? 'CAT Assessment' : 'Mid-Term Evaluation'} (${selectedAssessment.classLevel} • ${selectedAssessment.stream || 'East'} • ${selectedAssessment.subjectName})`;
        const created = await assessmentService.createAssessment(school.id, {
          title: newTitle,
          type: selectedAssessment.type || 'MID_TERM',
          academicYear: selectedAssessment.academicYear || '2026',
          term: targetTerm,
          classLevel: selectedAssessment.classLevel,
          stream: selectedAssessment.stream || '',
          subjectId: selectedAssessment.subjectId,
          subjectName: selectedAssessment.subjectName,
          maxScore: selectedAssessment.maxScore || 100,
          date: new Date().toISOString().split('T')[0],
          status: 'PUBLISHED',
        });
        setAssessments((prev) => [created, ...prev]);
        selectAssessment(created);
        showToast(`Created & opened new ${targetTerm} assessment for ${selectedAssessment.classLevel}!`, 'success');
      } catch (err: any) {
        showToast('Error setting up ' + targetTerm + ': ' + err.message, 'error');
      }
    }
  };

  // Quick reassign term of current assessment
  const handleQuickChangeAssessmentTerm = async (newTerm: 'Term 1' | 'Term 2' | 'Term 3') => {
    if (!selectedAssessment || !school?.id) return;
    try {
      await assessmentService.updateAssessment(school.id, selectedAssessment.id, {
        term: newTerm,
      });
      const updated = { ...selectedAssessment, term: newTerm };
      setSelectedAssessment(updated);
      setAssessments((prev) => prev.map((a) => (a.id === selectedAssessment.id ? updated : a)));
      setSelectedTerm(newTerm);
      showToast(`Assessment term updated to ${newTerm}!`, 'success');
    } catch (e: any) {
      showToast('Error updating term: ' + e.message, 'error');
    }
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
            term: selectedAssessment.term,
          });
        }
      }

      showToast(`Scores saved successfully for ${selectedAssessment.term}!`, 'success');
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

  const handleUpdateRemark = async (resId: string, newRemark: string) => {
    try {
      const targetRes = allResults.find((r) => r.id === resId);
      if (!targetRes || !school?.id) return;
      await assessmentService.saveResult(school.id, {
        assessmentId: targetRes.assessmentId,
        studentId: targetRes.studentId,
        studentName: targetRes.studentName,
        admissionNumber: targetRes.admissionNumber,
        classLevel: targetRes.classLevel,
        stream: targetRes.stream || '',
        subjectName: targetRes.subjectName,
        score: targetRes.score,
        maxScore: targetRes.maxScore,
        teacherComment: newRemark,
      });
      setAllResults((prev) =>
        prev.map((r) => (r.id === resId ? { ...r, teacherComment: newRemark } : r))
      );
      showToast('Remark updated successfully!', 'success');
    } catch (e: any) {
      showToast('Error updating remark: ' + e.message, 'error');
    }
  };

  const handleOpenEditResult = (res: AssessmentResult) => {
    setEditingResult(res);
    setEditScoreValue(res.score);
    setEditMaxScoreValue(res.maxScore || 100);
    setEditCommentValue(res.teacherComment || '');
    setEditTermValue(res.term || 'Term 1');
    setIsEditResultModalOpen(true);
  };

  const handleOpenStudentEdit = (std: Student) => {
    if (!selectedAssessment || !school?.id) return;
    const existing = results.find((r) => r.studentId === std.id) || allResults.find((r) => r.assessmentId === selectedAssessment.id && r.studentId === std.id);
    const entry = scores[std.id] || { score: 0, comment: '', rating: 'ME' };

    if (existing) {
      handleOpenEditResult(existing);
    } else {
      const tempResult: AssessmentResult = {
        id: `${selectedAssessment.id}_${std.id}`.replace(/\s+/g, '_'),
        schoolId: school.id,
        assessmentId: selectedAssessment.id,
        studentId: std.id,
        studentName: std.fullName,
        admissionNumber: std.admissionNumber,
        classLevel: selectedAssessment.classLevel,
        stream: selectedAssessment.stream || '',
        subjectId: selectedAssessment.subjectId,
        subjectName: selectedAssessment.subjectName,
        score: entry.score,
        maxScore: selectedAssessment.maxScore || 100,
        percentage: Math.round((entry.score / (selectedAssessment.maxScore || 100)) * 100),
        grade: assessmentService.calculateGrade(entry.score, selectedAssessment.maxScore),
        cbcRating: entry.rating || assessmentService.calculateCBCRating(entry.score, selectedAssessment.maxScore),
        term: selectedAssessment.term,
        teacherComment: entry.comment,
        updatedAt: new Date().toISOString(),
      };
      handleOpenEditResult(tempResult);
    }
  };

  const handleSaveEditedResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResult || !school?.id) return;
    setUpdatingResult(true);
    try {
      const existsInDb = results.some((r) => r.id === editingResult.id) || allResults.some((r) => r.id === editingResult.id);
      let updated: AssessmentResult;
      if (existsInDb) {
        updated = await assessmentService.updateResultScore(
          school.id,
          editingResult.id,
          editScoreValue,
          editMaxScoreValue,
          editCommentValue,
          editTermValue
        );
      } else {
        updated = await assessmentService.saveResult(school.id, {
          assessmentId: editingResult.assessmentId,
          studentId: editingResult.studentId,
          studentName: editingResult.studentName,
          admissionNumber: editingResult.admissionNumber,
          classLevel: editingResult.classLevel,
          stream: editingResult.stream,
          subjectName: editingResult.subjectName,
          score: editScoreValue,
          maxScore: editMaxScoreValue,
          teacherComment: editCommentValue,
          term: editTermValue,
        });
      }

      setAllResults((prev) => {
        const found = prev.some((r) => r.id === updated.id);
        if (found) {
          return prev.map((r) => (r.id === updated.id ? updated : r));
        }
        return [updated, ...prev];
      });

      setResults((prev) => {
        const found = prev.some((r) => r.id === updated.id);
        if (found) {
          return prev.map((r) => (r.id === updated.id ? updated : r));
        }
        return [updated, ...prev];
      });

      if (selectedAssessment && editingResult.assessmentId === selectedAssessment.id) {
        setScores((prev) => ({
          ...prev,
          [editingResult.studentId]: {
            score: updated.score,
            comment: updated.teacherComment || '',
            rating: updated.cbcRating,
          },
        }));
      }

      showToast(`Mark for ${editingResult.studentName} updated successfully!`, 'success');
      setIsEditResultModalOpen(false);
      setEditingResult(null);
    } catch (e: any) {
      showToast('Error updating mark: ' + e.message, 'error');
    } finally {
      setUpdatingResult(false);
    }
  };

  const handleDeleteResult = async (res: AssessmentResult) => {
    if (!school?.id) return;
    const confirmMsg = `Are you sure you want to permanently delete the entered mark of ${res.score}/${res.maxScore} for ${res.studentName} (${res.subjectName})?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await assessmentService.deleteResult(school.id, res.id);
      setAllResults((prev) => prev.filter((r) => r.id !== res.id));
      setResults((prev) => prev.filter((r) => r.id !== res.id));
      if (selectedAssessment && res.assessmentId === selectedAssessment.id) {
        setScores((prev) => {
          const next = { ...prev };
          delete next[res.studentId];
          return next;
        });
      }
      setSelectedResultIds((prev) => prev.filter((id) => id !== res.id));
      showToast(`Mark for ${res.studentName} deleted successfully!`, 'success');
    } catch (e: any) {
      showToast('Error deleting mark: ' + e.message, 'error');
    }
  };

  const handleDeleteStudentMark = async (studentId: string, studentName: string) => {
    if (!selectedAssessment || !school?.id) return;
    const docId = `${selectedAssessment.id}_${studentId}`.replace(/\s+/g, '_');
    const existingEntry = scores[studentId];
    const scoreText = existingEntry ? ` (score: ${existingEntry.score}/${selectedAssessment.maxScore})` : '';

    if (!window.confirm(`Are you sure you want to delete the entered mark${scoreText} for ${studentName}? This will permanently remove it from the school database.`)) {
      return;
    }

    try {
      await assessmentService.deleteResult(school.id, docId);
      setScores((prev) => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
      setResults((prev) => prev.filter((r) => r.studentId !== studentId));
      setAllResults((prev) => prev.filter((r) => r.id !== docId));
      showToast(`Mark for ${studentName} successfully deleted!`, 'success');
    } catch (e: any) {
      setScores((prev) => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
      setResults((prev) => prev.filter((r) => r.studentId !== studentId));
      setAllResults((prev) => prev.filter((r) => r.id !== docId));
      showToast(`Mark cleared for ${studentName}.`, 'info');
    }
  };

  const handleBulkDeleteResults = async () => {
    if (!school?.id || selectedResultIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete the ${selectedResultIds.length} selected student marks from the database? This cannot be undone.`)) {
      return;
    }

    setDeletingBulk(true);
    try {
      await assessmentService.deleteMultipleResults(school.id, selectedResultIds);
      const deletedSet = new Set(selectedResultIds);
      setAllResults((prev) => prev.filter((r) => !deletedSet.has(r.id)));
      setResults((prev) => prev.filter((r) => !deletedSet.has(r.id)));

      setScores((prev) => {
        const next = { ...prev };
        for (const res of allResults) {
          if (deletedSet.has(res.id) && selectedAssessment && res.assessmentId === selectedAssessment.id) {
            delete next[res.studentId];
          }
        }
        return next;
      });

      showToast(`Successfully deleted ${selectedResultIds.length} marks from database!`, 'success');
      setSelectedResultIds([]);
    } catch (e: any) {
      showToast('Error deleting marks: ' + e.message, 'error');
    } finally {
      setDeletingBulk(false);
    }
  };

  const handleInlineScoreUpdate = async (resId: string, newScore: number, maxScore: number) => {
    if (!school?.id) return;
    try {
      const updated = await assessmentService.updateResultScore(school.id, resId, newScore, maxScore);
      setAllResults((prev) => prev.map((r) => (r.id === resId ? updated : r)));
      if (selectedAssessment && updated.assessmentId === selectedAssessment.id) {
        setScores((prev) => ({
          ...prev,
          [updated.studentId]: {
            score: updated.score,
            comment: updated.teacherComment || '',
            rating: updated.cbcRating,
          },
        }));
      }
      showToast('Score updated!', 'success');
    } catch (e: any) {
      showToast('Error updating score: ' + e.message, 'error');
    }
  };

  const handleClearAllTableMarks = async () => {
    if (!selectedAssessment || !school?.id) return;
    if (!window.confirm(`Are you sure you want to permanently delete all entered student marks for "${selectedAssessment.title}"? This will delete all student records for this evaluation from the database.`)) return;

    try {
      for (const std of classStudents) {
        const docId = `${selectedAssessment.id}_${std.id}`.replace(/\s+/g, '_');
        await assessmentService.deleteResult(school.id, docId).catch(() => {});
      }
      setScores({});
      setAllResults((prev) => prev.filter((r) => r.assessmentId !== selectedAssessment.id));
      setResults([]);
      showToast(`All marks deleted for ${selectedAssessment.title}!`, 'success');
    } catch (e: any) {
      setScores({});
      showToast('Marks reset.', 'info');
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

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('scoring')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'scoring'
              ? 'border-blue-900 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          📝 Enter & Score Marks
        </button>
        <button
          onClick={async () => {
            setActiveTab('registry');
            if (allResults.length === 0 && school?.id) {
              setLoadingRegistry(true);
              try {
                const res = await assessmentService.getResults(school.id);
                setAllResults(res);
              } catch (e: any) {
                showToast('Error loading results registry', 'error');
              } finally {
                setLoadingRegistry(false);
              }
            }
          }}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'registry'
              ? 'border-blue-900 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          📊 View All Saved Marks Registry
        </button>
      </div>

      {activeTab === 'scoring' && (
        <>
          {/* Top Term Selection Bar */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-4 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-xl">
                <Calendar className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-blue-200 uppercase tracking-wider block">
                  Select Academic Term
                </span>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Recording Marks for {selectedTerm === 'ALL' ? 'All Terms' : selectedTerm}
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-extrabold uppercase">
                    Active
                  </span>
                </h3>
              </div>
            </div>

            {/* Term Buttons */}
            <div className="flex items-center gap-1.5 bg-black/25 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
              {(['Term 1', 'Term 2', 'Term 3', 'ALL'] as const).map((t) => {
                const isSelected = selectedTerm === t;
                const count = t === 'ALL' ? assessments.length : assessments.filter((a) => a.term === t).length;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleSelectTerm(t)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      isSelected
                        ? 'bg-white text-blue-950 shadow-sm'
                        : 'text-blue-100 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span>{t === 'ALL' ? 'All Terms' : t}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-blue-100 text-blue-900 font-extrabold' : 'bg-white/15 text-blue-200'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Assessment Selector Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <Award className="w-5 h-5 text-blue-900 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Selected Assessment
                  </span>
                  {selectedAssessment && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200 uppercase">
                      {selectedAssessment.term}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedAssessment?.id || ''}
                    onChange={(e) => {
                      const found = assessments.find((a) => a.id === e.target.value);
                      if (found) selectAssessment(found);
                    }}
                    className="text-xs font-bold text-slate-900 border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 min-w-[240px] max-w-full"
                  >
                    {filteredAssessments.length === 0 ? (
                      <option value="">No assessments found for {selectedTerm}</option>
                    ) : (
                      filteredAssessments.map((a) => (
                        <option key={a.id} value={a.id}>
                          [{a.term}] {a.title} ({a.classLevel} {a.stream ? `• ${a.stream}` : ''} • {a.subjectName})
                        </option>
                      ))
                    )}
                  </select>

                  {/* Direct Term Switcher dropdown for current assessment */}
                  {selectedAssessment && (
                    <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-xl text-xs border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Term:</span>
                      <select
                        value={selectedAssessment.term}
                        onChange={(e) => handleQuickChangeAssessmentTerm(e.target.value as any)}
                        className="text-xs font-bold text-blue-900 bg-white border border-slate-300 rounded-lg px-2 py-0.5 cursor-pointer focus:ring-1 focus:ring-blue-900"
                        title="Reassign or change the academic term for this assessment"
                      >
                        <option value="Term 1">Term 1</option>
                        <option value="Term 2">Term 2</option>
                        <option value="Term 3">Term 3</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {selectedAssessment && (
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                <span className="text-slate-500 font-medium">Max Score: <strong>{selectedAssessment.maxScore}</strong></span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditAssForm({
                      title: selectedAssessment.title,
                      type: selectedAssessment.type,
                      academicYear: selectedAssessment.academicYear,
                      term: selectedAssessment.term,
                      classLevel: selectedAssessment.classLevel,
                      stream: selectedAssessment.stream || '',
                      subjectId: selectedAssessment.subjectId || '',
                      maxScore: selectedAssessment.maxScore || 100,
                      date: selectedAssessment.date || new Date().toISOString().split('T')[0],
                    });
                    setIsEditModalOpen(true);
                  }}
                >
                  Edit Assessment
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    if (!window.confirm(`Are you sure you want to delete "${selectedAssessment.title}" and all its recorded student results?`)) return;
                    try {
                      await assessmentService.deleteAssessment(school!.id, selectedAssessment.id);
                      showToast('Assessment deleted successfully', 'success');
                      const updated = assessments.filter((a) => a.id !== selectedAssessment.id);
                      setAssessments(updated);
                      if (updated.length > 0) {
                        selectAssessment(updated[0]);
                      } else {
                        setSelectedAssessment(null);
                      }
                    } catch (e: any) {
                      showToast('Error deleting assessment: ' + e.message, 'error');
                    }
                  }}
                >
                  Delete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Printer className="w-4 h-4" />}
                  onClick={async () => {
                    if (!selectedAssessment || !school?.id) return;
                    showToast('Preparing class marks sheet for printing...', 'info');
                    try {
                      const assessmentResults = await assessmentService.getResults(school.id, { assessmentId: selectedAssessment.id });
                      const targetStudents = students.filter(
                        (s) =>
                          s.currentClass === selectedAssessment.classLevel &&
                          (!selectedAssessment.stream || s.stream === selectedAssessment.stream)
                      );
                      printerService.printAssessmentMarksSheet(selectedAssessment, assessmentResults, targetStudents, school);
                      showToast('Print dialog opened successfully!', 'success');
                    } catch (e: any) {
                      showToast('Error generating print sheet: ' + e.message, 'error');
                    }
                  }}
                >
                  Print / Save PDF (Per Class)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Trash2 className="w-3.5 h-3.5 text-rose-600" />}
                  onClick={handleClearAllTableMarks}
                  className="text-rose-700 border-rose-200 hover:bg-rose-50 hover:border-rose-300"
                  title="Permanently delete all entered student scores for this assessment"
                >
                  Delete All Marks
                </Button>
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
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-800">
                    Entering Marks for: {selectedAssessment.classLevel} - {selectedAssessment.stream || 'East'} ({selectedAssessment.subjectName})
                  </span>
                  <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-blue-900 text-white shadow-2xs uppercase tracking-wide">
                    {selectedAssessment.term}
                  </span>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Quick Term Switcher buttons for this class & subject */}
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-slate-400 mr-1 font-bold">Term:</span>
                    {(['Term 1', 'Term 2', 'Term 3'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleTermSwitchForClassSubject(t)}
                        className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          selectedAssessment.term === t
                            ? 'bg-blue-900 text-white shadow-xs'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  <div className="text-xs text-slate-500 font-medium">
                    {classStudents.length} Registered Learners
                  </div>
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
                  <th className="p-3.5 text-center w-28">Actions</th>
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
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenStudentEdit(std)}
                            className="p-1.5 text-blue-700 hover:text-blue-900 hover:bg-blue-100 bg-blue-50 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                            title={`Edit entered mark for ${std.fullName}`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStudentMark(std.id, std.fullName)}
                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-100 bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                            title={`Delete entered mark for ${std.fullName}`}
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
        </div>
      ) : (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <Award className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-800">
            No assessments found for {selectedTerm === 'ALL' ? 'the selected filter' : selectedTerm}
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Choose another term above or click below to create a new evaluation sheet for {selectedTerm === 'ALL' ? 'Term 1' : selectedTerm}.
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <Button
              variant="primary"
              size="sm"
              icon={<PlusCircle className="w-4 h-4" />}
              onClick={() => {
                setNewAssForm((p) => ({
                  ...p,
                  term: selectedTerm === 'ALL' ? 'Term 1' : selectedTerm,
                }));
                setIsAddModalOpen(true);
              }}
            >
              Create {selectedTerm === 'ALL' ? 'Term 1' : selectedTerm} Assessment
            </Button>
          </div>
        </div>
      )}
        </>
      )}

      {activeTab === 'registry' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4 p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Saved Marks & Competency Registry</h3>
              <p className="text-xs text-slate-500">Browse, edit, and delete recorded student results across all terms and assessments.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              {/* Term Pills */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                {(['ALL', 'Term 1', 'Term 2', 'Term 3'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setRegistryTerm(t)}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      registryTerm === t
                        ? 'bg-white text-blue-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t === 'ALL' ? 'All Terms' : t}
                  </button>
                ))}
              </div>

              {/* Class Filter */}
              <select
                value={registryClass}
                onChange={(e) => setRegistryClass(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-medium text-slate-700"
              >
                <option value="ALL">All Classes</option>
                {GRADE_LEVELS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>

              {/* Search */}
              <div className="relative flex-1 sm:w-60">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search learner, adm, subject..."
                  value={registrySearch}
                  onChange={(e) => setRegistrySearch(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
                />
              </div>

              {/* Bulk Delete Button if selected */}
              {selectedResultIds.length > 0 && (
                <Button
                  variant="danger"
                  size="sm"
                  loading={deletingBulk}
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                  onClick={handleBulkDeleteResults}
                >
                  Delete Selected ({selectedResultIds.length})
                </Button>
              )}
            </div>
          </div>

          {loadingRegistry ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading saved marks registry...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          allResults.length > 0 &&
                          selectedResultIds.length ===
                            allResults.filter((r) => {
                              const ass = assessments.find((a) => a.id === r.assessmentId);
                              const resultTerm = r.term || ass?.term || 'Term 1';
                              if (registryTerm !== 'ALL' && resultTerm !== registryTerm) return false;
                              if (registryClass !== 'ALL' && r.classLevel !== registryClass) return false;
                              if (!registrySearch) return true;
                              const s = students.find((st) => st.id === r.studentId);
                              const sName = s ? s.fullName.toLowerCase() : '';
                              const adm = s ? (s.admissionNumber || '').toLowerCase() : '';
                              const q = registrySearch.toLowerCase();
                              return sName.includes(q) || adm.includes(q) || r.subjectName.toLowerCase().includes(q);
                            }).length
                        }
                        onChange={(e) => {
                          const filtered = allResults.filter((r) => {
                            const ass = assessments.find((a) => a.id === r.assessmentId);
                            const resultTerm = r.term || ass?.term || 'Term 1';
                            if (registryTerm !== 'ALL' && resultTerm !== registryTerm) return false;
                            if (registryClass !== 'ALL' && r.classLevel !== registryClass) return false;
                            if (!registrySearch) return true;
                            const s = students.find((st) => st.id === r.studentId);
                            const sName = s ? s.fullName.toLowerCase() : '';
                            const adm = s ? (s.admissionNumber || '').toLowerCase() : '';
                            const q = registrySearch.toLowerCase();
                            return sName.includes(q) || adm.includes(q) || r.subjectName.toLowerCase().includes(q);
                          });
                          if (e.target.checked) {
                            setSelectedResultIds(filtered.map((r) => r.id));
                          } else {
                            setSelectedResultIds([]);
                          }
                        }}
                        className="rounded border-slate-300 text-blue-900 focus:ring-blue-800"
                        title="Select All Filtered Marks"
                      />
                    </th>
                    <th className="p-3">Learner Name</th>
                    <th className="p-3">Academic Term</th>
                    <th className="p-3">Class & Stream</th>
                    <th className="p-3">Assessment Title</th>
                    <th className="p-3">Subject / Area</th>
                    <th className="p-3 text-center">Score</th>
                    <th className="p-3 text-center">Percentage</th>
                    <th className="p-3 text-center">Grade</th>
                    <th className="p-3 text-center">CBC Rating</th>
                    <th className="p-3">Teacher Remarks</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allResults
                    .filter((r) => {
                      const ass = assessments.find((a) => a.id === r.assessmentId);
                      const resultTerm = r.term || ass?.term || 'Term 1';
                      if (registryTerm !== 'ALL' && resultTerm !== registryTerm) return false;
                      if (registryClass !== 'ALL' && r.classLevel !== registryClass) return false;

                      if (!registrySearch) return true;
                      const s = students.find((st) => st.id === r.studentId);
                      const sName = s ? s.fullName.toLowerCase() : '';
                      const adm = s ? (s.admissionNumber || '').toLowerCase() : '';
                      const q = registrySearch.toLowerCase();
                      return sName.includes(q) || adm.includes(q) || r.subjectName.toLowerCase().includes(q);
                    })
                    .map((res) => {
                      const std = students.find((s) => s.id === res.studentId);
                      const ass = assessments.find((a) => a.id === res.assessmentId);
                      const termBadge = res.term || ass?.term || 'Term 1';
                      const isSelected = selectedResultIds.includes(res.id);
                      return (
                        <tr key={res.id} className={`hover:bg-slate-50/80 ${isSelected ? 'bg-blue-50/40' : ''}`}>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedResultIds((p) => [...p, res.id]);
                                } else {
                                  setSelectedResultIds((p) => p.filter((id) => id !== res.id));
                                }
                              }}
                              className="rounded border-slate-300 text-blue-900 focus:ring-blue-800"
                            />
                          </td>
                          <td className="p-3 font-semibold text-slate-900">
                            {std ? std.fullName : res.studentId}
                            <span className="block font-mono text-[10px] text-slate-400">{std?.admissionNumber}</span>
                          </td>
                          <td className="p-3 font-bold text-blue-900">
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-extrabold uppercase">
                              {termBadge}
                            </span>
                          </td>
                          <td className="p-3 text-slate-700 font-medium">
                            {res.classLevel} {res.stream && <span className="text-slate-400 font-normal">• {res.stream}</span>}
                          </td>
                          <td className="p-3 text-slate-700 font-medium">{ass ? ass.title : res.assessmentId}</td>
                          <td className="p-3 text-slate-700">{res.subjectName}</td>
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center gap-1 font-bold text-blue-900 bg-blue-50/70 border border-blue-200/80 rounded-lg px-2 py-0.5">
                              <span>{res.score}</span>
                              <span className="text-slate-400 font-normal">/{res.maxScore}</span>
                            </div>
                          </td>
                          <td className="p-3 text-center font-semibold">{res.percentage}%</td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded font-bold">{res.grade}</span>
                          </td>
                          <td className="p-3 text-center">{getCBCRatingBadge(res.cbcRating)}</td>
                          <td className="p-3">
                            <input
                              type="text"
                              defaultValue={res.teacherComment || ''}
                              onBlur={(e) => {
                                if (e.target.value !== (res.teacherComment || '')) {
                                  handleUpdateRemark(res.id, e.target.value);
                                }
                              }}
                              placeholder="Type remark..."
                              className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-800"
                            />
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditResult(res)}
                                className="p-1.5 text-blue-700 hover:bg-blue-100/80 bg-blue-50 rounded-lg transition-colors cursor-pointer border border-blue-200"
                                title="Edit entered mark"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteResult(res)}
                                className="p-1.5 text-rose-700 hover:bg-rose-100/80 bg-rose-50 rounded-lg transition-colors cursor-pointer border border-rose-200"
                                title="Delete entered mark"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  {allResults.length === 0 && (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-400">
                        No saved assessment marks found in the registry yet. Enter and save marks in the scoring tab.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit Single Mark Modal */}
      <Modal
        isOpen={isEditResultModalOpen}
        onClose={() => setIsEditResultModalOpen(false)}
        title="Edit Entered Mark"
        maxWidth="md"
      >
        {editingResult && (
          <form onSubmit={handleSaveEditedResult} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Learner:</span>
                <span className="font-bold text-slate-900">{editingResult.studentName} ({editingResult.admissionNumber})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Subject / Area:</span>
                <span className="font-bold text-slate-900">{editingResult.subjectName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Class / Stream:</span>
                <span className="font-bold text-slate-900">{editingResult.classLevel} {editingResult.stream && `• ${editingResult.stream}`}</span>
              </div>
            </div>

            {/* Academic Term Switcher */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Academic Term *</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Term 1', 'Term 2', 'Term 3'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEditTermValue(t)}
                    className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                      editTermValue === t
                        ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Score Obtained *</label>
                <input
                  type="number"
                  min="0"
                  max={editMaxScoreValue}
                  required
                  value={editScoreValue}
                  onChange={(e) => setEditScoreValue(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-sm bg-white"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Max Score</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={editMaxScoreValue}
                  onChange={(e) => setEditMaxScoreValue(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-sm bg-white"
                />
              </div>
            </div>

            {/* Live Recalculated Preview */}
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="text-[11px] font-semibold text-blue-800 uppercase block">Percentage</span>
                <span className="text-base font-black text-blue-950">
                  {Math.round((editScoreValue / (editMaxScoreValue || 100)) * 100)}%
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-blue-800 uppercase block">Grade</span>
                <span className="text-base font-black text-blue-900">
                  {assessmentService.calculateGrade(editScoreValue, editMaxScoreValue)}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-blue-800 uppercase block">CBC Rating</span>
                {getCBCRatingBadge(assessmentService.calculateCBCRating(editScoreValue, editMaxScoreValue))}
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Facilitator / Teacher Remark</label>
              <textarea
                rows={2}
                value={editCommentValue}
                onChange={(e) => setEditCommentValue(e.target.value)}
                placeholder="e.g. Excellent critical thinking and problem solving"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <Button
                type="button"
                variant="danger"
                size="sm"
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={() => {
                  setIsEditResultModalOpen(false);
                  handleDeleteResult(editingResult);
                }}
              >
                Delete Mark
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditResultModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={updatingResult}
                  icon={<Save className="w-3.5 h-3.5" />}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>

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

      {/* Edit Assessment Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit CBC Assessment" maxWidth="md">
        <form onSubmit={handleUpdateAssessment} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700">Assessment Title *</label>
            <input
              type="text"
              required
              value={editAssForm.title}
              onChange={(e) => setEditAssForm({ ...editAssForm, title: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Assessment Type</label>
              <select
                value={editAssForm.type}
                onChange={(e) => setEditAssForm({ ...editAssForm, type: e.target.value as any })}
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
                value={editAssForm.term}
                onChange={(e) => setEditAssForm({ ...editAssForm, term: e.target.value as any })}
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
                value={editAssForm.classLevel}
                onChange={(e) => setEditAssForm({ ...editAssForm, classLevel: e.target.value as GradeLevel })}
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
                value={editAssForm.stream}
                onChange={(e) => setEditAssForm({ ...editAssForm, stream: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
          <div>
            <label className="font-semibold text-slate-700">Subject / Learning Area *</label>
            <select
              value={editAssForm.subjectId}
              onChange={(e) => setEditAssForm({ ...editAssForm, subjectId: e.target.value })}
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
                value={editAssForm.maxScore}
                onChange={(e) => setEditAssForm({ ...editAssForm, maxScore: Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Date</label>
              <input
                type="date"
                value={editAssForm.date}
                onChange={(e) => setEditAssForm({ ...editAssForm, date: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Update Assessment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

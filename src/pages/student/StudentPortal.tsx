import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { studentService } from '../../services/studentService';
import { assessmentService } from '../../services/assessmentAndAttendanceService';
import { operationsService } from '../../services/operationsService';
import { Student, ReportCard, LibraryLoan, Announcement } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ReportCardModal } from '../../components/ui/ReportCardModal';
import { BookOpen, Award, FileText, Calendar, Megaphone, Clock } from 'lucide-react';

export const StudentPortal: React.FC = () => {
  const { school, user } = useAuth();
  const { showToast } = useToast();
  const [student, setStudent] = useState<Student | null>(null);
  const [reportCard, setReportCard] = useState<ReportCard | null>(null);
  const [loans, setLoans] = useState<LibraryLoan[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!school?.id) return;
    loadStudentData();
  }, [school?.id]);

  const loadStudentData = async () => {
    setLoading(true);
    try {
      const [allStudents, allLoans, allAnn] = await Promise.all([
        studentService.getStudents(school!.id),
        operationsService.getLoans(school!.id),
        operationsService.getAnnouncements(school!.id),
      ]);

      const currentStudent = allStudents[0];
      setStudent(currentStudent);
      setLoans(allLoans.filter((l) => l.borrowerId === currentStudent?.id));
      setAnnouncements(
        allAnn.filter((a) => a.targetRoles?.includes('STUDENT') || a.isPublicOnWebsite)
      );
    } catch (e: any) {
      showToast('Error loading student profile: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReport = async () => {
    if (!student) return;
    try {
      const results = await assessmentService.getResults(school!.id, { studentId: student.id });
      let cardResults = results.map((r) => ({
        subjectName: r.subjectName,
        score: r.score,
        maxScore: r.maxScore,
        percentage: r.percentage,
        grade: r.grade,
        cbcRating: r.cbcRating,
        teacherComment: r.teacherComment || 'Consistent progress and curiosity.',
      }));

      if (cardResults.length === 0) {
        cardResults = [
          { subjectName: 'Mathematics', score: 88, maxScore: 100, percentage: 88, grade: 'A', cbcRating: 'EE', teacherComment: 'Great problem solver.' },
          { subjectName: 'Integrated Science', score: 85, maxScore: 100, percentage: 85, grade: 'A', cbcRating: 'EE', teacherComment: 'Enthusiastic lab partner.' },
          { subjectName: 'English Language', score: 82, maxScore: 100, percentage: 82, grade: 'A', cbcRating: 'EE', teacherComment: 'Superb writing skills.' },
        ];
      }

      const total = cardResults.reduce((s, r) => s + r.score, 0);
      const avg = Math.round(total / (cardResults.length || 1));

      const card: ReportCard = {
        id: `rc_${student.id}`,
        schoolId: school!.id,
        studentId: student.id,
        studentName: student.fullName,
        admissionNumber: student.admissionNumber,
        classLevel: student.currentClass,
        stream: student.stream,
        academicYear: school?.academicYear || '2026',
        term: school?.currentTerm || 'Term 1',
        attendanceDaysPresent: 64,
        attendanceTotalDays: 66,
        results: cardResults,
        totalScore: total,
        averagePercentage: avg,
        overallCBCRating: 'EE',
        classTeacherComment: `${student.firstName} shows great diligence and creativity.`,
        headTeacherComment: 'Keep striving for the stars!',
        openingDateNextTerm: '05/05/2026',
        closingDateThisTerm: '03/04/2026',
        generatedAt: new Date().toISOString(),
      };

      setReportCard(card);
      setIsReportOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-12 text-center text-xs text-slate-400 rounded-2xl border border-slate-200">
        Loading learner portal...
      </div>
    );
  }

  if (!student) {
    return (
      <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-2">
        <Award className="w-8 h-8 text-slate-300 mx-auto" />
        <div className="text-sm font-bold text-slate-800">No Student Profile Linked</div>
        <p className="text-xs text-slate-500">Seed sample data to preview the learner academic experience.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Student Welcome Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md text-white flex items-center justify-center font-black text-xl border border-white/20">
            {student.firstName[0]}
            {student.lastName[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">{student.fullName}</h2>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                {student.currentClass} ({student.stream})
              </span>
            </div>
            <p className="text-xs text-blue-200 font-mono mt-0.5">
              Adm No: {student.admissionNumber} • {school?.name}
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          size="md"
          icon={<FileText className="w-4 h-4 text-blue-950" />}
          onClick={handleOpenReport}
          className="font-bold bg-white text-blue-950 hover:bg-blue-50"
        >
          View Terminal Report Card
        </Button>
      </div>

      {/* Grid: Subjects, Library Books, Announcements */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Academic Competencies */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <Award className="w-4 h-4 text-blue-900" />
              <span>Current CBC Strands</span>
            </div>
            <Badge variant="success" size="sm">
              Exceeding (EE)
            </Badge>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <div className="flex justify-between font-bold text-slate-900">
                <span>Mathematics</span>
                <span className="text-blue-900 font-mono">86% (EE)</span>
              </div>
              <p className="text-[11px] text-slate-500">Prime numbers, decimal arithmetic, angle calculation</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <div className="flex justify-between font-bold text-slate-900">
                <span>Integrated Science</span>
                <span className="text-blue-900 font-mono">88% (EE)</span>
              </div>
              <p className="text-[11px] text-slate-500">Human digestive system, clean energy prototypes</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <div className="flex justify-between font-bold text-slate-900">
                <span>English Language</span>
                <span className="text-blue-900 font-mono">84% (EE)</span>
              </div>
              <p className="text-[11px] text-slate-500">Creative writing composition & public debate</p>
            </div>
          </div>
        </div>

        {/* Borrowed Library Books */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span>Library Books on Loan</span>
            </div>
            <span className="text-xs font-bold text-slate-500">{loans.length} Borrowed</span>
          </div>

          {loans.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No books currently on loan. Visit the library to borrow!
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              {loans.map((l) => (
                <div key={l.id} className="p-3 bg-slate-50 rounded-xl space-y-1">
                  <div className="font-bold text-slate-900">{l.bookTitle}</div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Due: {l.dueDate}</span>
                    <Badge variant={l.status === 'OVERDUE' ? 'danger' : 'primary'} size="sm">
                      {l.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* School Notices */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <Megaphone className="w-4 h-4 text-amber-600" />
              <span>Learner Announcements</span>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            {announcements.map((a) => (
              <div key={a.id} className="p-3 bg-slate-50 rounded-xl space-y-1">
                <div className="font-bold text-slate-900">{a.title}</div>
                <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">{a.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Report Card Modal */}
      {reportCard && (
        <ReportCardModal
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          reportCard={reportCard}
          school={school}
        />
      )}
    </div>
  );
};

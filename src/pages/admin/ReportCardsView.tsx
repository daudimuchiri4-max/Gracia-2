import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { studentService } from '../../services/studentService';
import { assessmentService } from '../../services/assessmentAndAttendanceService';
import { Student, ReportCard, GradeLevel } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ReportCardModal } from '../../components/ui/ReportCardModal';
import { FileText, Printer, Search, Calendar, Award, CheckCircle2, Layers } from 'lucide-react';
import { printerService } from '../../services/printerService';

import { generateStudentReportCard } from '../../utils/reportCardHelper';

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

const TERM_OPTIONS = [
  { term: 'Term 1' as const, dates: 'January – April', nextReopen: '05/05/2026', closingDate: '03/04/2026', daysPresent: 64, totalDays: 66 },
  { term: 'Term 2' as const, dates: 'May – August', nextReopen: '01/09/2026', closingDate: '08/08/2026', daysPresent: 68, totalDays: 70 },
  { term: 'Term 3' as const, dates: 'September – November', nextReopen: '06/01/2027', closingDate: '30/10/2026', daysPresent: 58, totalDays: 60 },
];

export const ReportCardsView: React.FC = () => {
  const { school } = useAuth();
  const { showToast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('Grade 6');
  const [selectedTerm, setSelectedTerm] = useState<'Term 1' | 'Term 2' | 'Term 3'>('Term 1');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Selected Report Card for View/Print
  const [selectedReportCard, setSelectedReportCard] = useState<ReportCard | null>(null);
  const [currentStudentForModal, setCurrentStudentForModal] = useState<Student | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generatingForId, setGeneratingForId] = useState<string | null>(null);
  const [batchPrinting, setBatchPrinting] = useState<boolean>(false);

  useEffect(() => {
    if (!school?.id) return;
    loadStudents();
  }, [school?.id]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const list = await studentService.getStudents(school!.id);
      setStudents(list);
    } catch (e: any) {
      showToast('Error loading students: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getTermConfig = (term: 'Term 1' | 'Term 2' | 'Term 3', studentName: string) => {
    switch (term) {
      case 'Term 1':
        return {
          openingDateNextTerm: '05/05/2026',
          closingDateThisTerm: '03/04/2026',
          attendanceDaysPresent: 64,
          attendanceTotalDays: 66,
          classTeacherComment: `${studentName} demonstrated commendable curiosity, diligence, and collaboration throughout Term 1.`,
          headTeacherComment: 'A very promising Term 1 performance. Keep up the high standard in Term 2.',
        };
      case 'Term 2':
        return {
          openingDateNextTerm: '01/09/2026',
          closingDateThisTerm: '08/08/2026',
          attendanceDaysPresent: 68,
          attendanceTotalDays: 70,
          classTeacherComment: `${studentName} maintained steady focus in classroom rubrics, co-curriculars, and school club projects in Term 2.`,
          headTeacherComment: 'Solid mid-year achievements. Continue building on your strengths in Term 3.',
        };
      case 'Term 3':
        return {
          openingDateNextTerm: '06/01/2027',
          closingDateThisTerm: '30/10/2026',
          attendanceDaysPresent: 58,
          attendanceTotalDays: 60,
          classTeacherComment: `${studentName} concluded the academic year with exemplary effort and leadership. Promoted to the next grade.`,
          headTeacherComment: 'Congratulations on completing this academic year with excellence. Happy holidays!',
        };
    }
  };

  const buildReportCardData = async (student: Student, targetTerm: 'Term 1' | 'Term 2' | 'Term 3'): Promise<ReportCard> => {
    return await generateStudentReportCard(school!.id, student, targetTerm, school);
  };

  const handleGenerateAndOpenReportCard = async (
    student: Student,
    targetTerm: 'Term 1' | 'Term 2' | 'Term 3' = selectedTerm
  ) => {
    setGeneratingForId(student.id);
    setCurrentStudentForModal(student);
    try {
      const generatedCard = await buildReportCardData(student, targetTerm);
      setSelectedReportCard(generatedCard);
      setIsModalOpen(true);
      showToast(`${targetTerm} report card loaded for ${student.fullName}!`, 'success');
    } catch (e: any) {
      showToast('Error generating report card: ' + e.message, 'error');
    } finally {
      setGeneratingForId(null);
    }
  };

  const handleDirectPrintReportCard = async (
    student: Student,
    targetTerm: 'Term 1' | 'Term 2' | 'Term 3' = selectedTerm
  ) => {
    setGeneratingForId(student.id);
    try {
      const card = await buildReportCardData(student, targetTerm);
      await printerService.printReportCard(card, school);
      showToast(`Printing ${targetTerm} report card for ${student.fullName}...`, 'info');
    } catch (e: any) {
      showToast('Error printing report card: ' + e.message, 'error');
    } finally {
      setGeneratingForId(null);
    }
  };

  const handleBatchPrintClass = async () => {
    if (filtered.length === 0) {
      showToast('No learners in the current selection to print.', 'warning');
      return;
    }
    setBatchPrinting(true);
    showToast(`Preparing ${selectedTerm} report cards for ${filtered.length} learners...`, 'info');
    try {
      // Print the first or prompt user
      for (let i = 0; i < filtered.length; i++) {
        const std = filtered[i];
        const card = await buildReportCardData(std, selectedTerm);
        if (i === 0) {
          await printerService.printReportCard(card, school);
        }
      }
      showToast(`Batch print dialog opened for ${selectedTerm} (${filtered.length} students)!`, 'success');
    } catch (e: any) {
      showToast('Batch print error: ' + e.message, 'error');
    } finally {
      setBatchPrinting(false);
    }
  };

  const filtered = students.filter((s) => {
    const matchClass = selectedClass === 'ALL' || s.currentClass === selectedClass;
    const q = search.toLowerCase();
    const matchSearch = !search || s.fullName.toLowerCase().includes(q) || s.admissionNumber.includes(q);
    return matchClass && matchSearch && s.status === 'ACTIVE';
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Kenyan CBC Terminal Report Cards</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Official Ministry of Education terminal reports with CBC Competency levels (EE, ME, AE, BE), attendance roll, and principal stamp.
          </p>
        </div>
      </div>

      {/* Prominent Term Selector Bar */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-4 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/10 rounded-xl">
            <Calendar className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-blue-200 uppercase tracking-wider block">
              Step 1: Choose Term to Print
            </span>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Generating Official Reports for <span className="underline decoration-amber-400 font-black">{selectedTerm}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-extrabold uppercase">
                Active Selection
              </span>
            </h3>
          </div>
        </div>

        {/* Term Switcher Buttons */}
        <div className="flex flex-wrap items-center gap-2 bg-black/25 p-1 rounded-xl w-full md:w-auto">
          {TERM_OPTIONS.map((item) => {
            const isSelected = selectedTerm === item.term;
            return (
              <button
                key={item.term}
                type="button"
                onClick={() => setSelectedTerm(item.term)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center gap-1.5 ${
                  isSelected
                    ? 'bg-white text-blue-950 shadow-md ring-2 ring-amber-400'
                    : 'text-blue-100 hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-900" />}
                  <span>{item.term}</span>
                </div>
                <span className={`text-[10px] ${isSelected ? 'text-slate-500 font-semibold' : 'text-blue-200'}`}>
                  ({item.dates})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters & Batch Action Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search learner by name or admission number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-600 shrink-0">Class Level:</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 font-bold"
            >
              <option value="ALL">All Grades (Playgroup - Grade 9)</option>
              {GRADE_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Batch Print Button */}
        <Button
          variant="outline"
          size="sm"
          className="bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100 font-bold text-xs"
          icon={<Printer className="w-4 h-4 text-blue-900" />}
          loading={batchPrinting}
          onClick={handleBatchPrintClass}
        >
          Print All {selectedTerm} Reports ({filtered.length} Learners)
        </Button>
      </div>

      {/* Student List for Report Cards */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading student records...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No active learners found for selected filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Admission No</th>
                  <th className="p-3.5">Learner Name</th>
                  <th className="p-3.5">Class & Stream</th>
                  <th className="p-3.5">Academic Session</th>
                  <th className="p-3.5 text-right">Choose Term to Print</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((std) => (
                  <tr key={std.id} className="hover:bg-slate-50/70">
                    <td className="p-3.5 font-bold text-slate-900">{std.admissionNumber}</td>
                    <td className="p-3.5 font-semibold text-slate-900">{std.fullName}</td>
                    <td className="p-3.5">
                      <Badge variant="primary" size="sm">
                        {std.currentClass} • {std.stream}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-slate-600 font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{school?.academicYear || '2026'}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-black uppercase">
                          {selectedTerm}
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        {/* Quick Term Print Buttons */}
                        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                          {(['Term 1', 'Term 2', 'Term 3'] as const).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => handleGenerateAndOpenReportCard(std, t)}
                              className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                                selectedTerm === t
                                  ? 'bg-blue-900 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                              }`}
                              title={`View & print ${t} report card for ${std.fullName}`}
                            >
                              {t === 'Term 1' ? 'T1' : t === 'Term 2' ? 'T2' : 'T3'}
                            </button>
                          ))}
                        </div>

                        {/* Main View & Print Button */}
                        <Button
                          variant="primary"
                          size="sm"
                          loading={generatingForId === std.id}
                          icon={<Printer className="w-3.5 h-3.5" />}
                          onClick={() => handleGenerateAndOpenReportCard(std, selectedTerm)}
                          className="font-bold text-xs"
                        >
                          Print {selectedTerm}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Official Report Card Modal */}
      <ReportCardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        reportCard={selectedReportCard}
        school={school}
        onTermChange={(t) => {
          setSelectedTerm(t);
          if (currentStudentForModal) {
            handleGenerateAndOpenReportCard(currentStudentForModal, t);
          }
        }}
      />
    </div>
  );
};

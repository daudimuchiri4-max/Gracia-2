import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { studentService } from '../../services/studentService';
import { feeService } from '../../services/feeAndPaymentService';
import { assessmentService, attendanceService } from '../../services/assessmentAndAttendanceService';
import { printerService } from '../../services/printerService';
import { Student, Payment, Invoice, AssessmentResult, GradeLevel } from '../../types';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { Download, FileSpreadsheet, BarChart2, TrendingUp, Users, DollarSign, CalendarCheck, Printer, Calendar } from 'lucide-react';

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

export const ReportsView: React.FC = () => {
  const { school } = useAuth();
  const { showToast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [generatingAttendance, setGeneratingAttendance] = useState(false);

  useEffect(() => {
    if (!school?.id) return;
    loadAllReportsData();
  }, [school?.id]);

  const loadAllReportsData = async () => {
    setLoading(true);
    try {
      const [stdList, payList, invList, resList] = await Promise.all([
        studentService.getStudents(school!.id),
        feeService.getPayments(school!.id),
        feeService.getInvoices(school!.id),
        assessmentService.getResults(school!.id),
      ]);
      setStudents(stdList);
      setPayments(payList);
      setInvoices(invList);
      setResults(resList);
    } catch (e: any) {
      showToast('Error generating reports: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const totalCollected = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalInvoiced = invoices.reduce((s, i) => s + (i.totalAmount || 0), 0);
  const totalArrears = Math.max(0, totalInvoiced - totalCollected);

  // CBC Ratings breakdown
  const eeCount = results.filter((r) => r.cbcRating === 'EE').length;
  const meCount = results.filter((r) => r.cbcRating === 'ME').length;
  const aeCount = results.filter((r) => r.cbcRating === 'AE').length;
  const beCount = results.filter((r) => r.cbcRating === 'BE').length;

  const downloadCSV = (title: string, headers: string[], rows: string[][]) => {
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${title}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Downloaded ${title}.csv successfully!`, 'success');
  };

  const exportStudentsReport = () => {
    const headers = ['AdmNo', 'Name', 'Gender', 'Class', 'Stream', 'Status', 'Parent', 'Phone', 'Balance'];
    const rows = students.map((s) => [
      s.admissionNumber,
      `"${s.fullName}"`,
      s.gender,
      s.currentClass,
      s.stream,
      s.status,
      `"${s.parentName || ''}"`,
      s.parentPhone || '',
      s.totalBalance?.toString() || '0',
    ]);
    downloadCSV('students_master_register', headers, rows);
  };

  const exportPaymentsReport = () => {
    const headers = ['ReceiptNo', 'Student', 'AdmNo', 'Amount', 'Mode', 'Ref', 'Date', 'Cashier'];
    const rows = payments.map((p) => [
      p.receiptNumber,
      `"${p.studentName}"`,
      p.admissionNumber || '',
      p.amount.toString(),
      p.paymentMethod,
      p.transactionReference || '',
      p.paymentDate,
      `"${p.cashierName}"`,
    ]);
    downloadCSV('fee_payments_ledger', headers, rows);
  };

  const exportCBCResultsReport = () => {
    const headers = ['Student', 'AdmNo', 'Class', 'Subject', 'Score', 'Max', 'Pct', 'Rating', 'Comment'];
    const rows = results.map((r) => [
      `"${r.studentName}"`,
      r.admissionNumber,
      r.classLevel,
      `"${r.subjectName}"`,
      r.score.toString(),
      r.maxScore.toString(),
      r.percentage.toString(),
      r.cbcRating,
      `"${r.teacherComment || ''}"`,
    ]);
    downloadCSV('cbc_assessment_scores', headers, rows);
  };

  const generateDailyAttendanceData = async (targetDate: string) => {
    if (!school?.id) return null;
    const records = await attendanceService.getAttendanceRecords(school.id, { date: targetDate });

    const statusMap: Record<string, { status: string; remarks: string }> = {};
    records.forEach((r) => {
      r.entries.forEach((e) => {
        statusMap[e.studentId] = { status: e.status, remarks: e.remarks || '' };
        if (e.admissionNumber) {
          statusMap[e.admissionNumber] = { status: e.status, remarks: e.remarks || '' };
        }
      });
    });

    const totalEnrolled = students.length;
    let present = 0;
    let late = 0;
    let absent = 0;
    let excused = 0;
    let boysEnrolled = 0;
    let boysPresent = 0;
    let girlsEnrolled = 0;
    let girlsPresent = 0;

    students.forEach((st) => {
      if (st.gender === 'MALE') boysEnrolled++;
      else girlsEnrolled++;

      const stat = statusMap[st.id]?.status || (records.some((r) => r.classLevel === st.currentClass) ? 'ABSENT' : 'NOT_RECORDED');
      if (stat === 'PRESENT') {
        present++;
        if (st.gender === 'MALE') boysPresent++;
        else girlsPresent++;
      } else if (stat === 'LATE') {
        late++;
        present++;
        if (st.gender === 'MALE') boysPresent++;
        else girlsPresent++;
      } else if (stat === 'EXCUSED' || stat === 'SICK') {
        excused++;
      } else {
        absent++;
      }
    });

    const attendanceRate = totalEnrolled > 0 ? (present / totalEnrolled) * 100 : 0;

    const classSummaries = GRADE_LEVELS.map((grade) => {
      const classStudents = students.filter((s) => s.currentClass === grade);
      const streams: string[] = Array.from(new Set<string>(classStudents.map((s) => s.stream || 'East')));

      return streams.map((str: string) => {
        const streamStudents = classStudents.filter((s) => (s.stream || 'East') === str);
        const enrolled = streamStudents.length;
        let cPresent = 0;
        let cLate = 0;
        let cAbsent = 0;
        let cExcused = 0;

        streamStudents.forEach((st) => {
          const stat = statusMap[st.id]?.status || (records.some((r) => r.classLevel === grade && r.stream === str) ? 'ABSENT' : 'NOT_RECORDED');
          if (stat === 'PRESENT') cPresent++;
          else if (stat === 'LATE') {
            cLate++;
            cPresent++;
          } else if (stat === 'EXCUSED' || stat === 'SICK') cExcused++;
          else cAbsent++;
        });

        const rate = enrolled > 0 ? (cPresent / enrolled) * 100 : 0;
        const rec = records.find((r) => r.classLevel === grade && r.stream === str);

        return {
          classLevel: grade,
          stream: str,
          enrolled,
          present: cPresent,
          late: cLate,
          absent: cAbsent,
          excused: cExcused,
          rate,
          recordedBy: rec?.recordedBy || (enrolled === 0 ? '-' : 'Roll Record'),
        };
      });
    })
      .flat()
      .filter((c) => c.enrolled > 0);

    const absenteeList = students
      .filter((st) => {
        const stat = statusMap[st.id]?.status || (records.some((r) => r.classLevel === st.currentClass) ? 'ABSENT' : 'NOT_RECORDED');
        return stat === 'ABSENT' || stat === 'LATE' || stat === 'EXCUSED' || stat === 'SICK' || stat === 'NOT_RECORDED';
      })
      .map((st) => {
        const info = statusMap[st.id];
        const status = (info?.status || 'ABSENT') as 'ABSENT' | 'LATE' | 'EXCUSED' | 'SICK';
        return {
          admissionNumber: st.admissionNumber,
          studentName: st.fullName,
          classLevel: st.currentClass,
          stream: st.stream || 'East',
          parentName: st.parentName,
          parentPhone: st.parentPhone,
          status,
          remarks: info?.remarks || (status === 'ABSENT' ? 'Unexcused Absence' : ''),
        };
      });

    return {
      date: targetDate,
      academicYear: `${new Date(targetDate).getFullYear()}`,
      term: 'Term 1',
      totalEnrolled,
      totalPresent: present,
      totalLate: late,
      totalAbsent: absent,
      totalExcused: excused,
      attendanceRate,
      boysEnrolled,
      boysPresent,
      girlsEnrolled,
      girlsPresent,
      classSummaries,
      absenteeList,
    };
  };

  const handlePrintAttendanceDiary = async () => {
    setGeneratingAttendance(true);
    try {
      const data = await generateDailyAttendanceData(attendanceDate);
      if (data) {
        printerService.printDailyAttendanceReport(data, school);
        showToast(`Printed Daily Attendance Diary for ${attendanceDate}`, 'success');
      }
    } catch (e: any) {
      showToast('Error generating attendance report: ' + e.message, 'error');
    } finally {
      setGeneratingAttendance(false);
    }
  };

  const handleExportAttendanceCSV = async () => {
    setGeneratingAttendance(true);
    try {
      const records = await attendanceService.getAttendanceRecords(school!.id, { date: attendanceDate });
      const statusMap: Record<string, { status: string; remarks: string }> = {};
      records.forEach((r) => {
        r.entries.forEach((e) => {
          statusMap[e.studentId] = { status: e.status, remarks: e.remarks || '' };
        });
      });

      const headers = ['AdmNo', 'StudentName', 'Gender', 'Class', 'Stream', 'Status', 'Remarks', 'ParentName', 'ParentPhone', 'Date'];
      const rows = students.map((st) => {
        const info = statusMap[st.id];
        const status = info?.status || (records.some((r) => r.classLevel === st.currentClass) ? 'ABSENT' : 'NOT_RECORDED');
        return [
          st.admissionNumber,
          `"${st.fullName}"`,
          st.gender,
          st.currentClass,
          st.stream || '',
          status,
          `"${info?.remarks || ''}"`,
          `"${st.parentName || ''}"`,
          st.parentPhone || '',
          attendanceDate,
        ];
      });

      downloadCSV(`daily_attendance_diary_${attendanceDate}`, headers, rows);
      showToast(`Exported Attendance Diary for ${attendanceDate}`, 'success');
    } catch (e: any) {
      showToast('Error exporting attendance CSV: ' + e.message, 'error');
    } finally {
      setGeneratingAttendance(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Executive Analytics & Reports Center</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Institutional performance, fee collection ledgers, and CBC competency distributions.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Enrollment"
          value={students.length}
          subtitle="Playgroup to Grade 9"
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Total Revenue Collected"
          value={`${school?.currencySymbol || 'KSh'} ${totalCollected.toLocaleString()}`}
          subtitle={`${payments.length} verified receipts`}
          icon={<DollarSign className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title="Fee Collection Health"
          value={`${totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 100}%`}
          subtitle={`${school?.currencySymbol || 'KSh'} ${totalArrears.toLocaleString()} arrears`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="indigo"
        />
      </div>

      {/* Exportable Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Daily Attendance Diary Report */}
        <div className="bg-white rounded-2xl p-6 border-2 border-blue-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-900 text-white rounded-xl shadow-xs">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Daily Attendance Diary</h3>
                <p className="text-xs text-blue-900 font-semibold">A4 Diary & Absentee Ledger</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Official school attendance diary including grade turnout rates, gender metrics, late check-ins, and guardian follow-up roster.
            </p>

            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-900" />
                Select Diary Date
              </label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-900 cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <Button
              variant="primary"
              size="sm"
              className="w-full justify-center"
              icon={<Printer className="w-4 h-4" />}
              onClick={handlePrintAttendanceDiary}
              disabled={generatingAttendance}
            >
              {generatingAttendance ? 'Compiling...' : 'Print Diary (A4)'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center"
              icon={<Download className="w-4 h-4" />}
              onClick={handleExportAttendanceCSV}
              disabled={generatingAttendance}
            >
              Export CSV
            </Button>
          </div>
        </div>

        {/* Student Register Export */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 text-blue-900 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Learners Master Register</h3>
                <p className="text-xs text-slate-500">{students.length} Total Registered</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Full demographical register containing admission numbers, CBC grade levels, streams, parent telephone contacts, and medical alerts.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center"
            icon={<Download className="w-4 h-4" />}
            onClick={exportStudentsReport}
          >
            Export Register (CSV)
          </Button>
        </div>

        {/* Financial Ledger Export */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Fee Collection Ledger</h3>
                <p className="text-xs text-slate-500">{payments.length} Transaction Records</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Complete transaction journal containing receipt numbers, Lipa na M-Pesa transaction references, bank deposits, and bursar logs.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center"
            icon={<Download className="w-4 h-4" />}
            onClick={exportPaymentsReport}
          >
            Export Finance Ledger (CSV)
          </Button>
        </div>

        {/* CBC Scores Export */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-50 text-amber-800 rounded-xl">
                <BarChart2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">CBC Scores & Ratings</h3>
                <p className="text-xs text-slate-500">{results.length} Formative/Summative</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Kenyan CBC rubric scores, percentage grades, competency ratings (EE, ME, AE, BE), and facilitators' descriptive strands.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center"
            icon={<Download className="w-4 h-4" />}
            onClick={exportCBCResultsReport}
          >
            Export CBC Scores (CSV)
          </Button>
        </div>
      </div>
    </div>
  );
};

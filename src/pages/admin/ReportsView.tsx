import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { studentService } from '../../services/studentService';
import { feeService } from '../../services/feeAndPaymentService';
import { assessmentService } from '../../services/assessmentAndAttendanceService';
import { Student, Payment, Invoice, AssessmentResult } from '../../types';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { Download, FileSpreadsheet, BarChart2, TrendingUp, Users, DollarSign } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { school } = useAuth();
  const { showToast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [loading, setLoading] = useState(true);

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Student Register Export */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-900 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Learners Master Register</h3>
              <p className="text-xs text-slate-500">{students.length} Total Registered Learners</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Full demographical register containing admission numbers, CBC grade levels, streams, parent telephone contacts, and medical alerts.
          </p>
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
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Fee Collection & Payments Ledger</h3>
              <p className="text-xs text-slate-500">{payments.length} Transaction Records</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Complete transaction journal containing receipt numbers, Lipa na M-Pesa transaction references, bank deposits, and bursar logs.
          </p>
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
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 text-amber-800 rounded-xl">
              <BarChart2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">CBC Competency Evaluations</h3>
              <p className="text-xs text-slate-500">{results.length} Formative/Summative Marks</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Kenyan CBC rubric scores, percentage grades, competency ratings (EE, ME, AE, BE), and facilitators' descriptive strands.
          </p>
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

import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Badge } from './Badge';
import { ReceiptModal } from './ReceiptModal';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  HeartPulse,
  DollarSign,
  BookOpen,
  Award,
  Clock,
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  FileText,
  CreditCard,
  QrCode,
  School as SchoolIcon,
  Sparkles,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { Student, School, Invoice, Payment, ReportCard, CBCRating } from '../../types';
import { feeService } from '../../services/feeAndPaymentService';
import { assessmentService } from '../../services/assessmentAndAttendanceService';
import { generateStudentQrCode } from '../../utils/qrCodeGenerator';
import { printerService } from '../../services/printerService';

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  school: School | null;
  onEdit?: (student: Student) => void;
  onRecordPayment?: (student: Student) => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  isOpen,
  onClose,
  student,
  school,
  onEdit,
  onRecordPayment,
}) => {
  const [activeTab, setActiveTab] = useState<'bio' | 'academics' | 'fees' | 'attendance' | 'health' | 'idcard'>('bio');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Payment | null>(null);
  const [studentQrCodeUrl, setStudentQrCodeUrl] = useState<string>('');

  useEffect(() => {
    if (student?.id && school?.id && isOpen) {
      loadStudentDetails();
      generateQr();
    }
  }, [student?.id, school?.id, isOpen]);

  const generateQr = async () => {
    if (!student || !school) return;
    try {
      const url = await generateStudentQrCode({
        type: 'STUDENT_ATTENDANCE',
        schoolId: school.id,
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        fullName: student.fullName,
        classLevel: `${student.currentClass} ${student.stream}`,
      });
      setStudentQrCodeUrl(url);
    } catch (e) {
      console.error('Failed generating student QR:', e);
    }
  };

  const loadStudentDetails = async () => {
    if (!student || !school) return;
    setLoadingData(true);
    try {
      const [invList, payList, rcList] = await Promise.all([
        feeService.getInvoices(school.id, { studentId: student.id }),
        feeService.getPayments(school.id, { studentId: student.id }),
        assessmentService.getReportCards(school.id, student.id),
      ]);
      setInvoices(invList);
      setPayments(payList);
      setReportCards(rcList);
    } catch (e) {
      console.error('Error loading student profile details:', e);
    } finally {
      setLoadingData(false);
    }
  };

  if (!student) return null;

  // Calculate age from DOB
  const calculateAge = (dobString?: string) => {
    if (!dobString) return 'N/A';
    const birthDate = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} years`;
  };

  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const totalPaid = payments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
  const calculatedBalance = Math.max(0, totalInvoiced - totalPaid);

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Learner Comprehensive Profile"
      subtitle={`${student.fullName} • Admission No: ${student.admissionNumber}`}
      maxWidth="4xl"
    >
      <div className="space-y-5 text-slate-800">
        {/* Header Profile Summary Card */}
        <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-slate-900 text-white rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-800/80 border-2 border-blue-400/40 flex items-center justify-center text-white font-bold text-2xl shadow-inner shrink-0 overflow-hidden">
                {student.photoUrl ? (
                  <img src={student.photoUrl} alt={student.fullName} className="w-full h-full object-cover" />
                ) : (
                  <span>{student.firstName?.[0]}{student.lastName?.[0]}</span>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-black tracking-tight">{student.fullName}</h3>
                  <Badge variant={student.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm">
                    {student.status}
                  </Badge>
                  {student.isBoarder ? (
                    <Badge variant="warning" size="sm">Boarding Scholar</Badge>
                  ) : (
                    <Badge variant="neutral" size="sm">Day Scholar</Badge>
                  )}
                </div>
                <div className="text-xs text-blue-200 flex items-center gap-3 flex-wrap font-medium">
                  <span className="font-mono bg-blue-900/80 px-2 py-0.5 rounded border border-blue-700/50">
                    ADM: {student.admissionNumber}
                  </span>
                  <span>Class: <strong className="text-white">{student.currentClass}</strong> ({student.stream} Stream)</span>
                  <span>Age: <strong className="text-white">{calculateAge(student.dateOfBirth)}</strong></span>
                </div>
              </div>
            </div>

            {/* Financial Quick Glance & Action */}
            <div className="flex sm:flex-col items-end justify-between sm:justify-center w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-blue-800/60">
              <div className="text-left sm:text-right">
                <span className="text-[10px] text-blue-300 font-semibold uppercase tracking-wider block">
                  Fee Balance
                </span>
                <span className={`text-base font-black ${calculatedBalance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {school?.currencySymbol || 'KSh'} {calculatedBalance.toLocaleString()}
                </span>
              </div>
              <div className="flex gap-2 mt-1">
                {onRecordPayment && (
                  <button
                    onClick={() => onRecordPayment(student)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Pay Fee
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={() => onEdit(student)}
                    className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Edit Bio
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-1 text-xs font-bold">
          <button
            onClick={() => setActiveTab('bio')}
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'bio'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Personal & Bio
          </button>
          <button
            onClick={() => setActiveTab('academics')}
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'academics'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            CBC Academics & Progress
          </button>
          <button
            onClick={() => setActiveTab('fees')}
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'fees'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Fee Ledger & Receipts ({payments.length})
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'attendance'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Attendance & Conduct
          </button>
          <button
            onClick={() => setActiveTab('health')}
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'health'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Health & Medical
          </button>
          <button
            onClick={() => setActiveTab('idcard')}
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'idcard'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Learner Student ID Card
          </button>
        </div>

        {/* Tab 1: Personal & Bio */}
        {activeTab === 'bio' && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <span className="text-slate-400 font-semibold block">Full Legal Name:</span>
                <span className="text-sm font-bold text-slate-900">{student.fullName}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Gender:</span>
                <span className="font-bold text-slate-900">{student.gender}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Date of Birth:</span>
                <span className="font-bold text-slate-900">{student.dateOfBirth} ({calculateAge(student.dateOfBirth)})</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Assessment Number (KNEC):</span>
                <span className="font-bold font-mono text-blue-900">{student.assessmentNumber || student.upiNumber || 'ASN-PENDING'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">KEMIS Number (MoE):</span>
                <span className="font-bold font-mono text-slate-900">{student.kemisNumber || student.nemisNumber || 'KEMIS-PENDING'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Birth Certificate No:</span>
                <span className="font-bold font-mono text-slate-900">{student.birthCertNumber || 'BC-PENDING'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Nationality:</span>
                <span className="font-bold text-slate-900">{student.nationality || 'Kenyan'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Religion / Faith:</span>
                <span className="font-bold text-slate-900">{student.religion || 'Christian'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Admission Date:</span>
                <span className="font-bold text-slate-900">{student.admissionDate}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Current Grade & Stream:</span>
                <span className="font-bold text-blue-900">{student.currentClass} • {student.stream}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Transport Mode:</span>
                <span className="font-bold text-slate-900">
                  {student.transportRouteName || 'Self / Private Drop-off'}
                </span>
              </div>
            </div>

            {/* Parent & Guardian Contact Card */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-900" /> Parent / Guardian Information
                </span>
                <Badge variant="primary" size="sm">{student.parentRelationship || 'Primary Guardian'}</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="space-y-0.5">
                  <span className="text-slate-400 font-semibold block">Guardian Name:</span>
                  <p className="font-bold text-slate-900">{student.parentName || 'Dr. Joseph Kamau'}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-slate-400 font-semibold block">Phone Number:</span>
                  <a
                    href={`tel:${student.parentPhone}`}
                    className="font-bold text-blue-900 hover:underline inline-flex items-center gap-1"
                  >
                    <Phone className="w-3.5 h-3.5 text-blue-800" /> {student.parentPhone || '+254 722 345 678'}
                  </a>
                </div>
                <div className="space-y-0.5">
                  <span className="text-slate-400 font-semibold block">Email Address:</span>
                  <a
                    href={`mailto:${student.parentEmail}`}
                    className="font-bold text-blue-900 hover:underline inline-flex items-center gap-1"
                  >
                    <Mail className="w-3.5 h-3.5 text-blue-800" /> {student.parentEmail || 'guardian@email.com'}
                  </a>
                </div>
                <div className="space-y-0.5">
                  <span className="text-slate-400 font-semibold block">Emergency Contact:</span>
                  <p className="font-bold text-slate-900">{student.emergencyContact || 'Mary Kamau (Mother)'}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-slate-400 font-semibold block">Emergency Phone:</span>
                  <p className="font-bold text-rose-700">{student.emergencyPhone || '+254 721 999 111'}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-slate-400 font-semibold block">Residential Estate:</span>
                  <p className="font-bold text-slate-900">{student.residentialAddress || 'Kasarani Mwiki, Nairobi'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: CBC Academics & Progress */}
        {activeTab === 'academics' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-blue-950 text-sm">Competency-Based Curriculum (CBC) Portfolio</h4>
                <p className="text-blue-700 text-[11px] mt-0.5">
                  Kenyan KNEC & KICD aligned performance ratings across Core Learning Areas.
                </p>
              </div>
              <Badge variant="primary" size="md">
                Overall: Meeting Expectations (ME)
              </Badge>
            </div>

            {/* Core Learning Areas Rating Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { subject: 'Mathematics & Numeracy', score: '88%', rating: 'EE' as CBCRating, comment: 'Exceptional speed in multiplication and fractions.' },
                { subject: 'English Language & Literacy', score: '82%', rating: 'ME' as CBCRating, comment: 'Active participant in creative writing and reading aloud.' },
                { subject: 'Kiswahili & Insha', score: '79%', rating: 'ME' as CBCRating, comment: 'Good command of sarufi and msamiati.' },
                { subject: 'Integrated Science & Tech', score: '91%', rating: 'EE' as CBCRating, comment: 'Demonstrated high innovation in laboratory experiments.' },
                { subject: 'Creative Arts & Music', score: '85%', rating: 'EE' as CBCRating, comment: 'Passionate recorder player and choir vocalist.' },
                { subject: 'Agriculture & Nutrition', score: '76%', rating: 'ME' as CBCRating, comment: 'Diligent work in the school kitchen garden plots.' },
              ].map((sub, i) => (
                <div key={i} className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{sub.subject}</span>
                    {getCBCRatingBadge(sub.rating)}
                  </div>
                  <div className="flex items-center justify-between text-slate-600 text-[11px]">
                    <span>Score: <strong>{sub.score}</strong></span>
                    <span className="text-slate-400 italic">Term 1 Assessment</span>
                  </div>
                  <p className="text-slate-500 text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                    "{sub.comment}"
                  </p>
                </div>
              ))}
            </div>

            {/* Report Cards Generated */}
            {reportCards.length > 0 && (
              <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 text-sm">Archived Term Report Cards</h4>
                <div className="divide-y divide-slate-100">
                  {reportCards.map((rc) => (
                    <div key={rc.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900">{rc.academicYear} • {rc.term}</span>
                        <p className="text-slate-500 text-[11px]">
                          Average: {rc.averagePercentage}% • Overall: {rc.overallCBCRating}
                        </p>
                      </div>
                      <Badge variant="success" size="sm">Issued</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Fee Ledger & Receipts */}
        {activeTab === 'fees' && (
          <div className="space-y-4 text-xs">
            {/* Financial Summary Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-slate-500 font-semibold block">Total Invoiced</span>
                <span className="text-lg font-black text-slate-900">
                  {school?.currencySymbol || 'KSh'} {totalInvoiced > 0 ? totalInvoiced.toLocaleString() : '60,000'}
                </span>
              </div>
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                <span className="text-emerald-700 font-semibold block">Total Paid to Date</span>
                <span className="text-lg font-black text-emerald-800">
                  {school?.currencySymbol || 'KSh'} {totalPaid > 0 ? totalPaid.toLocaleString() : '47,500'}
                </span>
              </div>
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200">
                <span className="text-rose-700 font-semibold block">Outstanding Balance</span>
                <span className="text-lg font-black text-rose-800">
                  {school?.currencySymbol || 'KSh'} {calculatedBalance.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Payment Receipts History */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-3.5 bg-slate-50 font-bold text-slate-900 border-b border-slate-200 flex items-center justify-between">
                <span>Official Payment Receipts</span>
                {onRecordPayment && (
                  <Button variant="primary" size="sm" icon={<PlusCircleIcon />} onClick={() => onRecordPayment(student)}>
                    Record Payment
                  </Button>
                )}
              </div>

              {payments.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p>No recent payment transactions recorded in this session.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <div key={p.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{p.receiptNumber}</span>
                          <Badge variant="primary" size="sm">{p.paymentMethod}</Badge>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Ref: <strong className="font-mono">{p.transactionReference}</strong> • Date: {p.paymentDate}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-emerald-800 text-sm">
                          {school?.currencySymbol || 'KSh'} {p.amount.toLocaleString()}
                        </span>
                        <button
                          onClick={() => setSelectedReceipt(p)}
                          className="p-1.5 text-blue-900 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                          title="Print Receipt"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Attendance & Conduct */}
        {activeTab === 'attendance' && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                <span className="text-emerald-700 font-semibold block">Attendance Rate</span>
                <span className="text-2xl font-black text-emerald-900">96.4%</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <span className="text-slate-500 font-semibold block">Days Present</span>
                <span className="text-2xl font-black text-slate-900">68 Days</span>
              </div>
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-center">
                <span className="text-amber-700 font-semibold block">Late Arrivals</span>
                <span className="text-2xl font-black text-amber-900">2 Times</span>
              </div>
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-center">
                <span className="text-rose-700 font-semibold block">Excused Absences</span>
                <span className="text-2xl font-black text-rose-900">1 Day</span>
              </div>
            </div>

            {/* Commendations & Discipline Notes */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" /> Teacher Commendations & Merits
              </h4>
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-1">
                <span className="font-bold text-amber-950 block">Class Prefect & Science Fair Lead</span>
                <p className="text-amber-800 text-[11px]">
                  Commended by Tr. David Ochieng for leadership during the County Junior Robotics exhibition.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Health & Medical */}
        {activeTab === 'health' && (
          <div className="space-y-4 text-xs">
            {/* Allergy Alert Banner */}
            {student.allergies ? (
              <div className="p-4 bg-rose-50 rounded-2xl border-2 border-rose-300 flex items-start gap-3">
                <HeartPulse className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-rose-900 text-sm">Critical Medical / Allergy Advisory</h4>
                  <p className="text-rose-800 font-semibold">
                    Known Allergy: <span className="bg-rose-200 px-2 py-0.5 rounded text-rose-950 font-bold">{student.allergies}</span>
                  </p>
                  <p className="text-rose-700 text-[11px]">
                    School caterers and class teachers must ensure strict dietary compliance.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="text-emerald-900 font-semibold">No known chronic allergies or dietary restrictions recorded.</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <span className="text-slate-400 font-semibold block">Blood Group:</span>
                <span className="text-sm font-bold text-slate-900">{student.bloodGroup || 'O+'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Special Education Needs:</span>
                <span className="font-bold text-slate-900">{student.specialNeeds || 'None'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Sick Bay Checkups:</span>
                <span className="font-bold text-slate-900">1 visit (Routine checkup)</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Learner Student ID Card */}
        {activeTab === 'idcard' && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Digital CBC Gate Pass & Student Identity Card</span>
              <div className="flex items-center gap-2">
                {studentQrCodeUrl && (
                  <a
                    href={studentQrCodeUrl}
                    download={`Badge-QR-${student.admissionNumber.replace(/\//g, '-')}.png`}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5 text-blue-900" />
                    Download QR
                  </a>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Printer className="w-4 h-4" />}
                  onClick={() => {
                    if (student) {
                      printerService.printStudentIDCard(student, school);
                    }
                  }}
                >
                  Print Student ID Badge
                </Button>
              </div>
            </div>

            {/* Printable ID Card Graphic */}
            <div className="max-w-md mx-auto bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 text-white rounded-2xl p-5 border-2 border-blue-700 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-blue-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/10 p-1 flex items-center justify-center">
                    <SchoolIcon className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs uppercase tracking-tight">{school?.name || 'Gracia Learning Centre'}</h5>
                    <p className="text-[9px] text-blue-200">Official Student Identity Card</p>
                  </div>
                </div>
                <Badge variant="primary" size="sm">2026 VALID</Badge>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-20 h-24 bg-blue-800 rounded-xl border-2 border-blue-400/60 overflow-hidden shrink-0 flex items-center justify-center text-xl font-bold">
                  {student.photoUrl ? (
                    <img src={student.photoUrl} alt={student.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <span>{student.firstName?.[0]}{student.lastName?.[0]}</span>
                  )}
                </div>

                <div className="space-y-1 text-[11px]">
                  <div>
                    <span className="text-blue-300 block text-[9px] uppercase">Name of Learner</span>
                    <strong className="text-sm font-black text-white">{student.fullName}</strong>
                  </div>
                  <div>
                    <span className="text-blue-300 block text-[9px] uppercase">Admission Number</span>
                    <strong className="font-mono text-amber-400">{student.admissionNumber}</strong>
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <span className="text-blue-300 block text-[9px] uppercase">Class</span>
                      <strong>{student.currentClass}</strong>
                    </div>
                    <div>
                      <span className="text-blue-300 block text-[9px] uppercase">Blood</span>
                      <strong>{student.bloodGroup || 'O+'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2.5 border-t border-blue-800/80 flex items-center justify-between text-[10px] text-blue-300">
                <span>Emergency: {student.parentPhone || '+254 722 345 678'}</span>
                {studentQrCodeUrl ? (
                  <div className="w-14 h-14 p-1 bg-white rounded-lg shadow-xs shrink-0 border border-slate-300">
                    <img src={studentQrCodeUrl} alt="QR Code" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <QrCode className="w-8 h-8 text-white" />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Official Receipt Sub-Modal */}
      {selectedReceipt && (
        <ReceiptModal
          isOpen={!!selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
          payment={selectedReceipt}
          school={school}
        />
      )}
    </Modal>
  );
};

function PlusCircleIcon() {
  return <CreditCard className="w-3.5 h-3.5" />;
}

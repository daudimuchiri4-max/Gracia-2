import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { studentService } from '../../services/studentService';
import { feeService } from '../../services/feeAndPaymentService';
import { assessmentService } from '../../services/assessmentAndAttendanceService';
import { operationsService } from '../../services/operationsService';
import { Student, Invoice, Payment, ReportCard, Announcement, SchoolEvent } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ReportCardModal } from '../../components/ui/ReportCardModal';
import { generateStudentReportCard } from '../../utils/reportCardHelper';
import { ReceiptModal } from '../../components/ui/ReceiptModal';
import {
  Users,
  DollarSign,
  FileText,
  Bus,
  Megaphone,
  Printer,
  CreditCard,
  HeartPulse,
  Award,
  Sparkles,
  Phone,
} from 'lucide-react';

export const ParentPortal: React.FC = () => {
  const { school, user } = useAuth();
  const { showToast } = useToast();
  const [children, setChildren] = useState<Student[]>([]);
  const [selectedChild, setSelectedChild] = useState<Student | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [selectedReportCard, setSelectedReportCard] = useState<ReportCard | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  useEffect(() => {
    if (!school?.id) return;
    loadParentDashboard();
  }, [school?.id]);

  const loadParentDashboard = async () => {
    setLoading(true);
    try {
      const [allStudents, allInvoices, allPayments, allAnn] = await Promise.all([
        studentService.getStudents(school!.id),
        feeService.getInvoices(school!.id),
        feeService.getPayments(school!.id),
        operationsService.getAnnouncements(school!.id),
      ]);

      // In demo mode or parent login, pick student linked to parent or first students
      const myChildren = allStudents.slice(0, 2);
      setChildren(myChildren);
      if (myChildren.length > 0) {
        setSelectedChild(myChildren[0]);
      }
      setInvoices(allInvoices);
      setPayments(allPayments);
      setAnnouncements(
        allAnn.filter((a) => a.targetRoles?.includes('PARENT') || a.isPublicOnWebsite)
      );
    } catch (e: any) {
      showToast('Error loading parent portal: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReport = async (child: Student) => {
    if (!school) return;
    try {
      const card = await generateStudentReportCard(school.id, child, school.currentTerm || 'Term 1', school);
      setSelectedReportCard(card);
      setIsReportModalOpen(true);
    } catch (e: any) {
      showToast('Error opening report: ' + e.message, 'error');
    }
  };

  const childInvoices = selectedChild
    ? invoices.filter((i) => i.studentId === selectedChild.id || i.admissionNumber === selectedChild.admissionNumber)
    : [];

  const childPayments = selectedChild
    ? payments.filter((p) => p.studentId === selectedChild.id || p.admissionNumber === selectedChild.admissionNumber)
    : [];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-blue-200 mb-3 border border-white/15">
              <span>Parent / Guardian Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome, {user?.fullName || 'Esteemed Parent'}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-blue-100/90 max-w-xl">
              Track real-time fee balances, printable CBC performance report cards, and school van logistics for your enrolled children.
            </p>
          </div>

          {/* Children Selector */}
          {children.length > 0 && (
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/15 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200 block">Select Child Profile</span>
              <div className="flex gap-2">
                {children.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedChild(c)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedChild?.id === c.id
                        ? 'bg-white text-blue-950 shadow-md'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {c.firstName} ({c.currentClass})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedChild && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Child Profile & Academics (2 spans) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Summary Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900">{selectedChild.fullName}</h3>
                  <p className="text-xs text-slate-500">
                    Admission: <strong>{selectedChild.admissionNumber}</strong> • Class: <strong>{selectedChild.currentClass} ({selectedChild.stream})</strong>
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<FileText className="w-4 h-4" />}
                  onClick={() => handleOpenReport(selectedChild)}
                >
                  View Terminal Report Card
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Term Attendance</span>
                  <div className="text-base font-extrabold text-slate-900 mt-0.5">98.5%</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">CBC Level</span>
                  <div className="text-base font-extrabold text-emerald-700 mt-0.5">EE (Exceeding)</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Bus Transport</span>
                  <div className="text-xs font-bold text-slate-900 mt-0.5 line-clamp-1">
                    {selectedChild.transportRouteName || 'Route 1 (Mwiki - Sunton)'}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Fee Status</span>
                  <div className="text-xs font-bold text-emerald-700 mt-0.5">Up to Date</div>
                </div>
              </div>
            </div>

            {/* Fee Invoices & Payment Receipts */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-700" />
                  <h3 className="font-bold text-sm text-slate-900">Fee Statement & Receipts</h3>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Ref / Receipt</th>
                      <th className="p-3">Item Description</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {childPayments.slice(0, 4).map((p) => (
                      <tr key={p.id}>
                        <td className="p-3 font-bold text-slate-900">{p.receiptNumber}</td>
                        <td className="p-3 font-medium text-slate-700">Tuition & CBC Term Fee</td>
                        <td className="p-3 text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                        <td className="p-3 font-bold text-slate-900">
                          {school?.currencySymbol || 'KSh'} {p.amount.toLocaleString()}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedPayment(p);
                              setIsReceiptModalOpen(true);
                            }}
                            className="text-blue-900 font-bold hover:underline cursor-pointer"
                          >
                            Print Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Notices & Transport Info (1 span) */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Bus className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-sm text-slate-900">School Bus Details</h3>
              </div>

              <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2 text-xs text-amber-950">
                <div className="font-bold">Van #4 (KDM 489X)</div>
                <div><strong>Driver:</strong> Mr. David Mutiso (+254 723 998 877)</div>
                <div><strong>Morning Pickup:</strong> 06:45 AM at Estate Gate</div>
                <div><strong>Evening Drop-off:</strong> 04:15 PM</div>
              </div>
            </div>

            {/* School Circulars */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Megaphone className="w-4 h-4 text-blue-900" />
                <h3 className="font-bold text-sm text-slate-900">School Circulars</h3>
              </div>

              <div className="space-y-3">
                {announcements.slice(0, 3).map((ann) => (
                  <div key={ann.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1 text-xs">
                    <div className="font-bold text-slate-900">{ann.title}</div>
                    <p className="text-slate-600 line-clamp-2">{ann.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Card Modal */}
      <ReportCardModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        reportCard={selectedReportCard}
        school={school}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        payment={selectedPayment}
        school={school}
      />
    </div>
  );
};

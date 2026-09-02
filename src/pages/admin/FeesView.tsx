import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { feeService, DEFAULT_CBC_FEE_STRUCTURES } from '../../services/feeAndPaymentService';
import { studentService } from '../../services/studentService';
import { printerService } from '../../services/printerService';
import { auditService } from '../../services/auditService';
import { FeeStructure, Invoice, Payment, Student, GradeLevel } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ReceiptModal } from '../../components/ui/ReceiptModal';
import { StudentProfileModal } from '../../components/ui/StudentProfileModal';
import { StudentSearchSelect } from '../../components/ui/StudentSearchSelect';
import { BatchBillingModal } from '../../components/ui/BatchBillingModal';
import {
  DollarSign,
  PlusCircle,
  Receipt,
  FileText,
  Search,
  CheckCircle,
  Printer,
  CreditCard,
  Building,
  Smartphone,
  Layers,
  Edit2,
  Trash2,
  Download,
  BookOpen,
  Calendar,
  Sparkles,
  School as SchoolIcon,
  Eye,
  Plus,
  RefreshCw,
  Send,
  Zap,
  Check,
  Loader2,
  Phone,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Users,
  Filter,
  UserCheck,
} from 'lucide-react';

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

export const FeesView: React.FC = () => {
  const { school, user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'STRUCTURES' | 'PAYMENTS' | 'INVOICES'>('STRUCTURES');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('ALL');
  const [selectedTermFilter, setSelectedTermFilter] = useState<string>('Term 1');

  // Student Ledger & Balances Tab Filter States
  const [balanceSearch, setBalanceSearch] = useState<string>('');
  const [balanceClassFilter, setBalanceClassFilter] = useState<string>('ALL');
  const [balanceStatusFilter, setBalanceStatusFilter] = useState<'ALL' | 'ARREARS' | 'CLEARED'>('ALL');

  // Payment Recording Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payFormData, setPayFormData] = useState({
    studentId: '',
    invoiceId: '',
    amount: 15000,
    paymentMethod: 'MPESA' as Payment['paymentMethod'],
    transactionReference: '',
    notes: 'Term 1 school fee installment',
  });

  // Edit Payment Modal
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [isEditPayModalOpen, setIsEditPayModalOpen] = useState(false);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [editPayFormData, setEditPayFormData] = useState({
    studentId: '',
    amount: 0,
    paymentMethod: 'MPESA' as Payment['paymentMethod'],
    transactionReference: '',
    paymentDate: '',
    notes: '',
  });

  // Delete Payment Modal
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [isDeletePayModalOpen, setIsDeletePayModalOpen] = useState(false);
  const [isDeletingPayment, setIsDeletingPayment] = useState(false);

  // Receipt Modal
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Student Profile Modal
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
  const [isStudentProfileOpen, setIsStudentProfileOpen] = useState(false);

  // Batch Billing Modal
  const [isBatchBillingOpen, setIsBatchBillingOpen] = useState(false);
  const [batchBillingScope, setBatchBillingScope] = useState<'ALL' | 'GRADE' | 'SELECTED'>('ALL');
  const [batchBillingGrade, setBatchBillingGrade] = useState<GradeLevel>('Grade 1');

  // New Invoice Modal
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invFormData, setInvFormData] = useState({
    studentId: '',
    academicYear: '2026',
    term: 'Term 1' as 'Term 1' | 'Term 2' | 'Term 3',
    tuitionFee: 35000,
    cbcMaterialsFee: 6500,
    lunchFee: 12000,
    activityFee: 4500,
    dueDate: '2026-03-15',
  });

  // Fee Structure Add/Edit Modal
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [editingStructureId, setEditingStructureId] = useState<string | null>(null);
  const [structureToDelete, setStructureToDelete] = useState<FeeStructure | null>(null);
  const [isDeleteStructureModalOpen, setIsDeleteStructureModalOpen] = useState(false);
  const [isClearAllStructuresModalOpen, setIsClearAllStructuresModalOpen] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [structureFormData, setStructureFormData] = useState({
    academicYear: '2026',
    term: 'Term 1' as 'Term 1' | 'Term 2' | 'Term 3',
    classLevel: 'Grade 1' as GradeLevel,
    items: [
      { name: 'Tuition Fee', amount: 32000, isOptional: false },
      { name: 'CBC Learning Materials & Tech Fee', amount: 5500, isOptional: false },
      { name: 'Nutritious Lunch Program', amount: 11000, isOptional: false },
      { name: 'Activity, Swimming & Sports', amount: 4000, isOptional: false },
    ],
  });

  // Print Fee Structure Modal
  const [selectedStructureForPrint, setSelectedStructureForPrint] = useState<FeeStructure | null>(null);
  const [isPrintStructureModalOpen, setIsPrintStructureModalOpen] = useState(false);

  useEffect(() => {
    if (!school?.id) return;
    loadFinanceData();
  }, [school?.id]);

  const loadFinanceData = async () => {
    setLoading(true);
    try {
      const [payList, invList, fsList, stdList] = await Promise.all([
        feeService.getPayments(school!.id),
        feeService.getInvoices(school!.id),
        feeService.getFeeStructures(school!.id),
        studentService.getStudents(school!.id),
      ]);
      setPayments(payList);
      setInvoices(invList);
      setFeeStructures(fsList);
      setStudents(stdList);

      if (stdList.length > 0 && !payFormData.studentId) {
        setPayFormData((p) => ({ ...p, studentId: stdList[0].id }));
        setInvFormData((p) => ({ ...p, studentId: stdList[0].id }));
      }
    } catch (e: any) {
      showToast('Error loading finance records: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === payFormData.studentId);
    if (!student) {
      showToast('Please select a student', 'error');
      return;
    }

    try {
      const payment = await feeService.recordPayment(school!.id, {
        invoiceId: payFormData.invoiceId || undefined,
        studentId: student.id,
        studentName: student.fullName,
        admissionNumber: student.admissionNumber,
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        amount: Number(payFormData.amount),
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: payFormData.paymentMethod,
        transactionReference: payFormData.transactionReference || `MPESA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        cashierName: user?.fullName || 'Finance Bursar',
        cashierId: user?.id || 'bursar',
        notes: payFormData.notes,
      });

      showToast(`Payment of ${school?.currencySymbol || 'KSh'} ${payment.amount.toLocaleString()} recorded successfully!`, 'success');
      setIsPayModalOpen(false);
      setSelectedPayment(payment);
      setIsReceiptModalOpen(true);
      await loadFinanceData();
    } catch (e: any) {
      showToast('Error recording payment: ' + e.message, 'error');
    }
  };

  const handleOpenEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setEditPayFormData({
      studentId: payment.studentId,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      transactionReference: payment.transactionReference || '',
      paymentDate: payment.paymentDate || (payment.createdAt ? payment.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
      notes: payment.notes || '',
    });
    setIsEditPayModalOpen(true);
  };

  const handleSaveEditPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id || !editingPayment) return;

    const student = students.find((s) => s.id === editPayFormData.studentId);
    if (!student) {
      showToast('Please select a student', 'error');
      return;
    }

    setIsUpdatingPayment(true);
    try {
      const oldAmount = editingPayment.amount;
      const updated = await feeService.updatePayment(school.id, editingPayment.id, {
        studentId: student.id,
        studentName: student.fullName,
        admissionNumber: student.admissionNumber,
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        amount: Number(editPayFormData.amount),
        paymentMethod: editPayFormData.paymentMethod,
        transactionReference: editPayFormData.transactionReference,
        paymentDate: editPayFormData.paymentDate,
        notes: editPayFormData.notes,
      });

      if (user) {
        await auditService.logAction(
          school.id,
          { id: user.id, name: user.fullName, role: user.role },
          'UPDATE_PAYMENT',
          'FINANCE',
          `Updated receipt ${editingPayment.receiptNumber} for ${student.fullName} (${student.admissionNumber}). Amount: ${school?.currencySymbol || 'KSh'} ${oldAmount.toLocaleString()} -> ${school?.currencySymbol || 'KSh'} ${updated.amount.toLocaleString()}. Ref: ${updated.transactionReference}`
        );
      }

      showToast(`Receipt ${editingPayment.receiptNumber} updated successfully!`, 'success');
      setIsEditPayModalOpen(false);
      setEditingPayment(null);
      await loadFinanceData();
    } catch (err: any) {
      showToast('Error updating payment: ' + err.message, 'error');
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  const handleOpenDeletePayment = (payment: Payment) => {
    setPaymentToDelete(payment);
    setIsDeletePayModalOpen(true);
  };

  const handleConfirmDeletePayment = async () => {
    if (!school?.id || !paymentToDelete) return;
    setIsDeletingPayment(true);
    try {
      await feeService.deletePayment(school.id, paymentToDelete.id);

      if (user) {
        await auditService.logAction(
          school.id,
          { id: user.id, name: user.fullName, role: user.role },
          'DELETE_PAYMENT',
          'FINANCE',
          `Deleted receipt ${paymentToDelete.receiptNumber} of ${school?.currencySymbol || 'KSh'} ${paymentToDelete.amount.toLocaleString()} for student ${paymentToDelete.studentName} (${paymentToDelete.admissionNumber}). Outstanding balance reverted.`
        );
      }

      showToast(`Receipt ${paymentToDelete.receiptNumber} deleted and fee balance reverted.`, 'success');
      setIsDeletePayModalOpen(false);
      setPaymentToDelete(null);
      await loadFinanceData();
    } catch (err: any) {
      showToast('Error deleting payment: ' + err.message, 'error');
    } finally {
      setIsDeletingPayment(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === invFormData.studentId);
    if (!student) return;

    try {
      const items = [
        { description: 'Tuition Fee', amount: Number(invFormData.tuitionFee) },
        { description: 'CBC Learning Materials & Technology', amount: Number(invFormData.cbcMaterialsFee) },
        { description: 'Nutritious Lunch Program', amount: Number(invFormData.lunchFee) },
        { description: 'Activity, Swimming & Sports', amount: Number(invFormData.activityFee) },
      ].filter((i) => i.amount > 0);

      const totalAmount = items.reduce((s, i) => s + i.amount, 0);

      await feeService.createInvoice(school!.id, {
        studentId: student.id,
        studentName: student.fullName,
        admissionNumber: student.admissionNumber,
        classLevel: student.currentClass,
        stream: student.stream,
        academicYear: invFormData.academicYear,
        term: invFormData.term,
        items,
        totalAmount,
        dueDate: invFormData.dueDate,
      });

      showToast(`Invoice generated for ${student.fullName}!`, 'success');
      setIsInvoiceModalOpen(false);
      await loadFinanceData();
    } catch (e: any) {
      showToast('Error generating invoice: ' + e.message, 'error');
    }
  };

  // Save or Update Fee Structure
  const handleSaveFeeStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id) return;

    try {
      const cleanItems = structureFormData.items
        .filter((item) => item.name.trim() && Number(item.amount) > 0)
        .map((item) => ({
          name: item.name.trim(),
          amount: Number(item.amount),
          isOptional: item.isOptional || false,
        }));

      if (cleanItems.length === 0) {
        showToast('Please add at least one valid fee line item', 'warning');
        return;
      }

      await feeService.saveFeeStructure(school.id, {
        id: editingStructureId || undefined,
        academicYear: structureFormData.academicYear,
        term: structureFormData.term,
        classLevel: structureFormData.classLevel,
        items: cleanItems,
      });

      showToast(`Fee Structure for ${structureFormData.classLevel} (${structureFormData.term}) saved!`, 'success');
      setIsStructureModalOpen(false);
      setEditingStructureId(null);
      await loadFinanceData();
    } catch (err: any) {
      showToast('Error saving fee structure: ' + err.message, 'error');
    }
  };

  const handleEditFeeStructure = (fs: FeeStructure) => {
    setEditingStructureId(fs.id);
    setStructureFormData({
      academicYear: fs.academicYear,
      term: fs.term,
      classLevel: fs.classLevel,
      items: fs.items.map((i) => ({ name: i.name, amount: i.amount, isOptional: i.isOptional || false })),
    });
    setIsStructureModalOpen(true);
  };

  const handleDeleteFeeStructure = (fs: FeeStructure) => {
    setStructureToDelete(fs);
    setIsDeleteStructureModalOpen(true);
  };

  const handleConfirmDeleteFeeStructure = async () => {
    if (!school?.id || !structureToDelete) return;
    const target = structureToDelete;
    // Optimistic UI update
    setFeeStructures((prev) => prev.filter((f) => f.id !== target.id));
    setIsDeleteStructureModalOpen(false);
    setStructureToDelete(null);

    try {
      await feeService.deleteFeeStructure(school.id, target.id);
      showToast(`Fee structure for ${target.classLevel} (${target.term}) deleted successfully.`, 'info');
      await loadFinanceData();
    } catch (e: any) {
      showToast('Error deleting structure: ' + e.message, 'error');
      await loadFinanceData();
    }
  };

  const handleConfirmClearAllFeeStructures = async () => {
    if (!school?.id) return;
    setIsClearingAll(true);
    // Optimistic UI update
    setFeeStructures([]);
    setIsClearAllStructuresModalOpen(false);

    try {
      await feeService.clearAllFeeStructures(school.id);
      showToast('All fee structures have been cleared.', 'info');
      await loadFinanceData();
    } catch (e: any) {
      showToast('Error clearing fee structures: ' + e.message, 'error');
      await loadFinanceData();
    } finally {
      setIsClearingAll(false);
    }
  };

  // Add line item in modal
  const handleAddStructureItem = () => {
    setStructureFormData((prev) => ({
      ...prev,
      items: [...prev.items, { name: '', amount: 0, isOptional: false }],
    }));
  };

  // Remove line item in modal
  const handleRemoveStructureItem = (index: number) => {
    setStructureFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Batch invoice generation from fee structure
  const handleBatchInvoiceFromStructure = async (fs: FeeStructure) => {
    if (!school?.id) return;
    const enrolledStudents = students.filter((s) => s.currentClass === fs.classLevel && s.status === 'ACTIVE');
    if (enrolledStudents.length === 0) {
      showToast(`No active students found in ${fs.classLevel} to invoice.`, 'warning');
      return;
    }

    if (
      confirm(
        `Issue ${fs.term} ${fs.academicYear} invoices of ${school.currencySymbol || 'KSh'} ${fs.totalAmount.toLocaleString()} to all ${enrolledStudents.length} active students in ${fs.classLevel}?`
      )
    ) {
      try {
        let count = 0;
        for (const std of enrolledStudents) {
          await feeService.createInvoice(school.id, {
            studentId: std.id,
            studentName: std.fullName,
            admissionNumber: std.admissionNumber,
            classLevel: std.currentClass,
            stream: std.stream,
            academicYear: fs.academicYear,
            term: fs.term,
            items: fs.items.map((it) => ({ description: it.name, amount: it.amount })),
            totalAmount: fs.totalAmount,
            dueDate: `${fs.academicYear}-03-30`,
          });
          count++;
        }
        showToast(`Successfully issued ${count} invoices for ${fs.classLevel}!`, 'success');
        await loadFinanceData();
      } catch (err: any) {
        showToast('Error issuing batch invoices: ' + err.message, 'error');
      }
    }
  };

  const totalCollected = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalBilled = invoices.reduce((s, i) => s + (i.totalAmount || 0), 0);
  const totalOutstanding = Math.max(0, totalBilled - totalCollected);

  // Open Payment modal for specific student
  const handleOpenPayForStudent = (std: Student) => {
    setPayFormData({
      studentId: std.id,
      invoiceId: '',
      amount: std.totalBalance && std.totalBalance > 0 ? std.totalBalance : 15000,
      paymentMethod: 'MPESA',
      transactionReference: '',
      notes: `School fee installment for ${std.fullName} (${std.currentClass})`,
    });
    setIsPayModalOpen(true);
  };

  // Filter Fee Structures
  const filteredFeeStructures = feeStructures.filter((fs) => {
    const matchGrade = selectedGradeFilter === 'ALL' || fs.classLevel === selectedGradeFilter;
    const matchTerm = !selectedTermFilter || fs.term === selectedTermFilter;
    return matchGrade && matchTerm;
  });

  // Filter Student Balances (Search per class, name, admission #, status)
  const filteredStudentBalances = students.filter((s) => {
    // 1. Class filter
    if (balanceClassFilter !== 'ALL' && s.currentClass !== balanceClassFilter) return false;
    
    // 2. Status filter
    const bal = s.totalBalance || 0;
    if (balanceStatusFilter === 'ARREARS' && bal <= 0) return false;
    if (balanceStatusFilter === 'CLEARED' && bal > 0) return false;

    // 3. Search query
    if (!balanceSearch.trim()) return true;
    const q = balanceSearch.toLowerCase().trim();
    return (
      s.fullName?.toLowerCase().includes(q) ||
      s.firstName?.toLowerCase().includes(q) ||
      s.lastName?.toLowerCase().includes(q) ||
      s.admissionNumber?.toLowerCase().includes(q) ||
      s.parentPhone?.toLowerCase().includes(q) ||
      s.parentName?.toLowerCase().includes(q)
    );
  });

  const filteredPayments = payments.filter((p) => {
    const q = search.toLowerCase();
    return (
      !search ||
      p.studentName?.toLowerCase().includes(q) ||
      p.receiptNumber?.toLowerCase().includes(q) ||
      p.admissionNumber?.toLowerCase().includes(q) ||
      p.transactionReference?.toLowerCase().includes(q)
    );
  });

  const filteredInvoices = invoices.filter((inv) => {
    const q = search.toLowerCase();
    return (
      !search ||
      inv.studentName?.toLowerCase().includes(q) ||
      inv.invoiceNumber?.toLowerCase().includes(q) ||
      inv.admissionNumber?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">School Fees & Financial Management</h2>
            <Badge variant="primary" size="sm">Kenyan CBC Rates</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure termly fee structures, issue student invoices, record M-Pesa/Bank payments, and print official receipts.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Button
            variant="outline"
            size="sm"
            className="text-blue-900 border-blue-200 bg-blue-50/70 hover:bg-blue-100 hover:border-blue-300 font-bold shadow-xs"
            icon={<Send className="w-4 h-4 text-blue-900" />}
            onClick={() => {
              setBatchBillingScope('ALL');
              setIsBatchBillingOpen(true);
            }}
          >
            Bill All Students
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<PlusCircle className="w-4 h-4" />}
            onClick={() => {
              setEditingStructureId(null);
              setStructureFormData({
                academicYear: '2026',
                term: 'Term 1',
                classLevel: 'Grade 1',
                items: [
                  { name: 'Tuition Fee', amount: 32000, isOptional: false },
                  { name: 'CBC Learning Materials & Tech Fee', amount: 5500, isOptional: false },
                  { name: 'Nutritious Lunch Program', amount: 11000, isOptional: false },
                  { name: 'Activity, Swimming & Sports', amount: 4000, isOptional: false },
                ],
              });
              setIsStructureModalOpen(true);
            }}
          >
            + New Fee Structure
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<FileText className="w-4 h-4" />}
            onClick={() => setIsInvoiceModalOpen(true)}
          >
            Issue Invoice
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Receipt className="w-4 h-4" />}
            onClick={() => setIsPayModalOpen(true)}
          >
            Record Fee Payment
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-900 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">Fee Structures</span>
            <span className="text-xl font-bold text-slate-900">{feeStructures.length} Configured</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">Total Collections</span>
            <span className="text-xl font-bold text-emerald-800">
              {school?.currencySymbol || 'KSh'} {totalCollected.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">Total Invoiced</span>
            <span className="text-xl font-bold text-slate-900">
              {school?.currencySymbol || 'KSh'} {totalBilled.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-rose-50 text-rose-700 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">Outstanding Arrears</span>
            <span className="text-xl font-bold text-rose-700">
              {school?.currencySymbol || 'KSh'} {totalOutstanding.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('STRUCTURES')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'STRUCTURES'
              ? 'bg-blue-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> Class Fee Structures ({feeStructures.length})
        </button>
        <button
          onClick={() => setActiveTab('PAYMENTS')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'PAYMENTS'
              ? 'bg-blue-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" /> Payments & Receipts ({payments.length})
        </button>
        <button
          onClick={() => setActiveTab('INVOICES')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'INVOICES'
              ? 'bg-blue-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> Student Invoices ({invoices.length})
        </button>
      </div>

      {/* TAB 1: FEE STRUCTURES */}
      {activeTab === 'STRUCTURES' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-bold text-slate-700">Filter Grade:</span>
              <select
                value={selectedGradeFilter}
                onChange={(e) => setSelectedGradeFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl bg-white font-medium"
              >
                <option value="ALL">All Grades (Playgroup - Grade 9)</option>
                {GRADE_LEVELS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>

              <span className="font-bold text-slate-700 ml-2">Term:</span>
              <select
                value={selectedTermFilter}
                onChange={(e) => setSelectedTermFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl bg-white font-medium"
              >
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              {feeStructures.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-rose-600 border-rose-200 bg-white hover:bg-rose-50 font-medium"
                  icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                  onClick={() => setIsClearAllStructuresModalOpen(true)}
                  title="Clear all fee structures"
                >
                  Clear All ({feeStructures.length})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="text-blue-900 border-blue-200 bg-white hover:bg-blue-50 font-bold"
                icon={<Send className="w-3.5 h-3.5 text-blue-900" />}
                onClick={() => {
                  setBatchBillingScope('ALL');
                  setIsBatchBillingOpen(true);
                }}
              >
                Bill All School Learners
              </Button>
              <span className="text-slate-500 font-medium">
                Showing {filteredFeeStructures.length} of {feeStructures.length} structures
              </span>
            </div>
          </div>

          {/* Structures Grid or Empty State */}
          {feeStructures.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 bg-blue-50 text-blue-900 rounded-2xl flex items-center justify-center mx-auto">
                <Layers className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-slate-900">No Fee Structures Configured</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Create custom fee structures for your school's grades and terms using your exact tuition, lunch, CBC materials, and activity amounts.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                icon={<PlusCircle className="w-4 h-4" />}
                onClick={() => {
                  setEditingStructureId(null);
                  setStructureFormData({
                    academicYear: '2026',
                    term: 'Term 1',
                    classLevel: 'Grade 1',
                    items: [
                      { name: 'Tuition Fee', amount: 0, isOptional: false },
                    ],
                  });
                  setIsStructureModalOpen(true);
                }}
              >
                + Create First Fee Structure
              </Button>
            </div>
          ) : filteredFeeStructures.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-700">No matching fee structures found</p>
              <p className="text-xs text-slate-400">Try changing the Grade or Term filter above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFeeStructures.map((fs) => {
              const enrolledCount = students.filter((s) => s.currentClass === fs.classLevel).length;

              return (
                <div
                  key={fs.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-slate-900 text-base">{fs.classLevel}</h3>
                          <Badge variant="primary" size="sm">
                            {fs.term}
                          </Badge>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                          Academic Year: {fs.academicYear} • {enrolledCount} Learners enrolled
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block font-medium">Total Term Fee</span>
                        <span className="text-lg font-black text-blue-950">
                          {school?.currencySymbol || 'KSh'} {fs.totalAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Breakdown List */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Itemized Fee Breakdown
                      </span>
                      <div className="divide-y divide-slate-50 text-xs bg-slate-50/80 p-3 rounded-xl border border-slate-100 space-y-1.5">
                        {fs.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between pt-1 text-slate-700">
                            <span className="font-medium text-slate-800">{item.name}</span>
                            <span className="font-bold text-slate-900">
                              {school?.currencySymbol || 'KSh'} {item.amount.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedStructureForPrint(fs);
                          setIsPrintStructureModalOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-blue-900 hover:bg-white rounded-lg transition-colors cursor-pointer"
                        title="Print Official Fee Schedule"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditFeeStructure(fs)}
                        className="p-1.5 text-slate-500 hover:text-blue-900 hover:bg-white rounded-lg transition-colors cursor-pointer"
                        title="Edit Structure"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteFeeStructure(fs)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                        title="Delete Structure"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Send className="w-3.5 h-3.5 text-blue-900" />}
                      onClick={() => handleBatchInvoiceFromStructure(fs)}
                    >
                      Bill {enrolledCount} Learners
                    </Button>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>
      )}

      {/* TAB: LEARNER BALANCES & SEARCH */}
      {false && (
        <div className="space-y-4">
          {/* Search & Filter Header */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative w-full sm:flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search student by full name, admission number, or parent contact..."
                  value={balanceSearch}
                  onChange={(e) => setBalanceSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
                {balanceSearch && (
                  <button
                    onClick={() => setBalanceSearch('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Class Filter Dropdown & Batch Billing */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-48">
                  <select
                    value={balanceClassFilter}
                    onChange={(e) => setBalanceClassFilter(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                  >
                    <option value="ALL">All Classes ({students.length})</option>
                    {GRADE_LEVELS.map((g) => {
                      const count = students.filter((s) => s.currentClass === g).length;
                      return (
                        <option key={g} value={g}>
                          {g} ({count})
                        </option>
                      );
                    })}
                  </select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-blue-900 border-blue-200 bg-blue-50/70 hover:bg-blue-100 font-bold shrink-0"
                  icon={<Send className="w-3.5 h-3.5 text-blue-900" />}
                  onClick={() => {
                    if (balanceClassFilter !== 'ALL') {
                      setBatchBillingScope('GRADE');
                      setBatchBillingGrade(balanceClassFilter as GradeLevel);
                    } else {
                      setBatchBillingScope('ALL');
                    }
                    setIsBatchBillingOpen(true);
                  }}
                >
                  {balanceClassFilter !== 'ALL' ? `Bill ${balanceClassFilter}` : 'Bill All Students'}
                </Button>
              </div>
            </div>

            {/* Quick Status Filters & Metrics */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setBalanceStatusFilter('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    balanceStatusFilter === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({students.filter((s) => balanceClassFilter === 'ALL' || s.currentClass === balanceClassFilter).length})
                </button>
                <button
                  onClick={() => setBalanceStatusFilter('ARREARS')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    balanceStatusFilter === 'ARREARS'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  <span>In Arrears</span>
                  <span className="px-1.5 py-0.2 bg-white/30 rounded-full text-[10px]">
                    {students.filter((s) => (balanceClassFilter === 'ALL' || s.currentClass === balanceClassFilter) && (s.totalBalance || 0) > 0).length}
                  </span>
                </button>
                <button
                  onClick={() => setBalanceStatusFilter('CLEARED')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    balanceStatusFilter === 'CLEARED'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  <span>100% Cleared</span>
                  <span className="px-1.5 py-0.2 bg-white/30 rounded-full text-[10px]">
                    {students.filter((s) => (balanceClassFilter === 'ALL' || s.currentClass === balanceClassFilter) && (s.totalBalance || 0) <= 0).length}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-3 text-slate-500 font-medium text-[11px]">
                <span>
                  Showing <strong className="text-slate-800 font-bold">{filteredStudentBalances.length}</strong> learners
                </span>
                <span>•</span>
                <span>
                  Total Arrears in View:{' '}
                  <strong className="text-rose-700 font-bold">
                    {school?.currencySymbol || 'KSh'}{' '}
                    {filteredStudentBalances
                      .reduce((acc, s) => acc + Math.max(0, s.totalBalance || 0), 0)
                      .toLocaleString()}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Student Balances Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            {filteredStudentBalances.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs space-y-2">
                <Users className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-600">No learners found matching your criteria</p>
                <p className="text-[11px]">
                  Try adjusting your search keyword or selected class filter.
                </p>
                {(balanceSearch || balanceClassFilter !== 'ALL' || balanceStatusFilter !== 'ALL') && (
                  <button
                    onClick={() => {
                      setBalanceSearch('');
                      setBalanceClassFilter('ALL');
                      setBalanceStatusFilter('ALL');
                    }}
                    className="mt-2 text-xs font-bold text-blue-900 hover:underline cursor-pointer"
                  >
                    Reset all filters
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Learner</th>
                      <th className="p-3.5">Class / Stream</th>
                      <th className="p-3.5">Parent / Contact</th>
                      <th className="p-3.5">Total Invoiced</th>
                      <th className="p-3.5">Total Paid</th>
                      <th className="p-3.5">Current Balance</th>
                      <th className="p-3.5 text-right">Fee Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudentBalances.map((std) => {
                      const balance = std.totalBalance || 0;
                      const invoiced = std.totalInvoiced || 0;
                      const paid = std.totalPaid || (invoiced > balance ? invoiced - balance : 0);

                      return (
                        <tr key={std.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Student Info */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                {std.photoUrl ? (
                                  <img
                                    src={std.photoUrl}
                                    alt={std.fullName}
                                    className="w-full h-full object-cover rounded-lg"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <span>
                                    {std.firstName?.[0]}
                                    {std.lastName?.[0]}
                                  </span>
                                )}
                              </div>
                              <div>
                                <button
                                  onClick={() => {
                                    setSelectedStudentForProfile(std);
                                    setIsStudentProfileOpen(true);
                                  }}
                                  className="font-bold text-slate-900 hover:text-blue-900 hover:underline cursor-pointer block text-left"
                                >
                                  {std.fullName}
                                </button>
                                <span className="font-mono text-[10px] text-slate-400 block">
                                  {std.admissionNumber}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Class / Stream */}
                          <td className="p-3.5 font-medium text-slate-700">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-900 rounded font-semibold text-[11px]">
                                {std.currentClass}
                              </span>
                              {std.stream && (
                                <span className="text-[10px] text-slate-400">
                                  Stream {std.stream}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Parent */}
                          <td className="p-3.5 text-slate-600">
                            <div className="font-medium text-slate-900 text-[11px]">
                              {std.parentName || 'Guardian'}
                            </div>
                            {std.parentPhone ? (
                              <div className="flex items-center gap-1 text-slate-500 font-mono text-[10px] mt-0.5">
                                <Phone className="w-2.5 h-2.5 text-slate-400" />
                                <span>{std.parentPhone}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">No phone</span>
                            )}
                          </td>

                          {/* Invoiced */}
                          <td className="p-3.5 font-medium text-slate-700">
                            {school?.currencySymbol || 'KSh'} {invoiced.toLocaleString()}
                          </td>

                          {/* Paid */}
                          <td className="p-3.5 text-emerald-700 font-semibold">
                            {school?.currencySymbol || 'KSh'} {paid.toLocaleString()}
                          </td>

                          {/* Balance */}
                          <td className="p-3.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-black ${
                                balance > 0
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {balance > 0
                                ? `${school?.currencySymbol || 'KSh'} ${balance.toLocaleString()}`
                                : 'Cleared'}
                            </span>
                          </td>

                          {/* Fee Actions */}
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Direct Record Payment */}
                              <button
                                onClick={() => handleOpenPayForStudent(std)}
                                className="px-2.5 py-1 text-xs font-bold bg-blue-900 hover:bg-blue-950 text-white rounded-lg cursor-pointer transition-colors shadow-2xs flex items-center gap-1"
                                title="Record Fee Payment for this student"
                              >
                                <Receipt className="w-3 h-3" />
                                <span>Pay</span>
                              </button>

                              {/* View Full Ledger */}
                              <button
                                onClick={() => {
                                  setSelectedStudentForProfile(std);
                                  setIsStudentProfileOpen(true);
                                }}
                                className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                                title="View Student Fee Profile & Receipts"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
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
      )}

      {/* TAB 2: PAYMENTS */}
      {activeTab === 'PAYMENTS' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search receipt, student, reference..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl"
              />
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Showing {filteredPayments.length} transactions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Receipt No</th>
                  <th className="p-3.5">Student / Admission</th>
                  <th className="p-3.5">Payment Method</th>
                  <th className="p-3.5">Reference Code</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Amount Paid</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((p) => {
                  const studentObj = students.find((s) => s.id === p.studentId);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="p-3.5 font-bold text-slate-900">{p.receiptNumber}</td>
                      <td className="p-3.5">
                        <button
                          onClick={() => {
                            if (studentObj) {
                              setSelectedStudentForProfile(studentObj);
                              setIsStudentProfileOpen(true);
                            }
                          }}
                          className="font-semibold text-slate-900 hover:text-blue-900 hover:underline cursor-pointer block text-left"
                        >
                          {p.studentName}
                        </button>
                        <div className="text-[10px] text-slate-400">{p.admissionNumber}</div>
                      </td>
                      <td className="p-3.5">
                        <Badge variant="primary" size="sm">
                          {p.paymentMethod}
                        </Badge>
                      </td>
                      <td className="p-3.5 font-mono text-slate-700 font-bold">{p.transactionReference}</td>
                      <td className="p-3.5 text-slate-600">{p.paymentDate}</td>
                      <td className="p-3.5 font-black text-emerald-700 text-sm">
                        {school?.currencySymbol || 'KSh'} {p.amount.toLocaleString()}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedPayment(p);
                              setIsReceiptModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-900 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                            title="Print Official Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditPayment(p)}
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg cursor-pointer transition-colors"
                            title="Edit Payment / Receipt"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDeletePayment(p)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                            title="Delete Payment / Receipt"
                          >
                            <Trash2 className="w-4 h-4" />
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
      )}

      {/* TAB 3: INVOICES */}
      {activeTab === 'INVOICES' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search invoice number, student..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl"
                />
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                className="text-blue-900 border-blue-200 bg-blue-50/60 hover:bg-blue-100 font-bold"
                icon={<Send className="w-3.5 h-3.5 text-blue-900" />}
                onClick={() => {
                  setBatchBillingScope('ALL');
                  setIsBatchBillingOpen(true);
                }}
              >
                Bill All Students
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setIsInvoiceModalOpen(true)}
              >
                + Single Invoice
              </Button>
              <span className="text-xs text-slate-500 font-medium ml-1">
                Showing {filteredInvoices.length} invoices
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Invoice No</th>
                  <th className="p-3.5">Student / Class</th>
                  <th className="p-3.5">Term Session</th>
                  <th className="p-3.5">Total Billed</th>
                  <th className="p-3.5">Paid Amount</th>
                  <th className="p-3.5">Balance</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => {
                  const studentObj = students.find((s) => s.id === inv.studentId);

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70">
                      <td className="p-3.5 font-bold text-slate-900">{inv.invoiceNumber}</td>
                      <td className="p-3.5">
                        <button
                          onClick={() => {
                            if (studentObj) {
                              setSelectedStudentForProfile(studentObj);
                              setIsStudentProfileOpen(true);
                            }
                          }}
                          className="font-semibold text-slate-900 hover:text-blue-900 hover:underline cursor-pointer block text-left"
                        >
                          {inv.studentName}
                        </button>
                        <div className="text-[10px] text-slate-400">
                          {inv.classLevel} • {inv.admissionNumber}
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-700">
                        {inv.academicYear} • {inv.term}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">
                        {school?.currencySymbol || 'KSh'} {inv.totalAmount.toLocaleString()}
                      </td>
                      <td className="p-3.5 text-emerald-700 font-semibold">
                        {school?.currencySymbol || 'KSh'} {inv.paidAmount.toLocaleString()}
                      </td>
                      <td className="p-3.5 font-bold text-rose-700">
                        {school?.currencySymbol || 'KSh'} {inv.balance.toLocaleString()}
                      </td>
                      <td className="p-3.5">
                        <Badge
                          variant={
                            inv.status === 'PAID'
                              ? 'success'
                              : inv.status === 'PARTIALLY_PAID'
                              ? 'warning'
                              : 'danger'
                          }
                          size="sm"
                        >
                          {inv.status.replace('_', ' ')}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title="Record Fee Payment Receipt"
        maxWidth="md"
      >
        <form onSubmit={handleRecordPayment} className="space-y-3.5 text-xs">
          <StudentSearchSelect
            students={students}
            selectedStudentId={payFormData.studentId}
            currencySymbol={school?.currencySymbol || 'KSh'}
            label="Search & Select Student (Filter by Class or Name)"
            required
            placeholder="Type student name, admission #, or parent phone..."
            onSelectStudent={(st) => {
              setPayFormData({
                ...payFormData,
                studentId: st.id,
                amount: st.totalBalance && st.totalBalance > 0 ? st.totalBalance : payFormData.amount,
                notes: `Fee payment for ${st.fullName} (${st.currentClass})`,
              });
            }}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Amount ({school?.currencySymbol || 'KSh'}) *</label>
              <input
                type="number"
                required
                value={payFormData.amount}
                onChange={(e) => setPayFormData({ ...payFormData, amount: Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl font-bold"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Payment Mode *</label>
              <select
                value={payFormData.paymentMethod}
                onChange={(e) => {
                  const m = e.target.value as any;
                  setPayFormData({ ...payFormData, paymentMethod: m });
                }}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white font-medium"
              >
                <option value="MPESA">M-Pesa (Till / Paybill)</option>
                <option value="BANK_TRANSFER">Bank Slip / Deposit</option>
                <option value="CASH">Cash Office</option>
                <option value="CHEQUE">Banker's Cheque</option>
                <option value="CARD">Debit / Credit Card</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700">
              Transaction Reference Code {payFormData.paymentMethod === 'MPESA' ? '(M-Pesa Code)' : '(Slip / Cheque / Ref)'}
            </label>
            <input
              type="text"
              placeholder={payFormData.paymentMethod === 'MPESA' ? 'e.g. QKB78219LM' : 'e.g. SLIP-091823'}
              value={payFormData.transactionReference}
              onChange={(e) => setPayFormData({ ...payFormData, transactionReference: e.target.value })}
              className={`w-full mt-1 px-3 py-2 border rounded-xl font-mono font-bold ${
                payFormData.transactionReference.startsWith('QK') || payFormData.transactionReference.startsWith('TK')
                  ? 'border-emerald-400 bg-emerald-50/40 text-emerald-900'
                  : 'border-slate-200'
              }`}
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700">Payment Description / Remarks</label>
            <input
              type="text"
              value={payFormData.notes}
              onChange={(e) => setPayFormData({ ...payFormData, notes: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsPayModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" className="bg-blue-900 hover:bg-blue-800 font-bold">
              Generate Official Receipt
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Fee Structure Modal */}
      <Modal
        isOpen={isStructureModalOpen}
        onClose={() => setIsStructureModalOpen(false)}
        title={editingStructureId ? 'Edit Fee Structure' : 'Create New Fee Structure'}
        subtitle="Define itemized fees for Kenyan CBC classes and terms"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveFeeStructure} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Academic Year *</label>
              <input
                type="text"
                required
                value={structureFormData.academicYear}
                onChange={(e) => setStructureFormData({ ...structureFormData, academicYear: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl font-bold"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Term *</label>
              <select
                value={structureFormData.term}
                onChange={(e) => setStructureFormData({ ...structureFormData, term: e.target.value as any })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white font-medium"
              >
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700">Target Grade Level *</label>
              <select
                value={structureFormData.classLevel}
                onChange={(e) => setStructureFormData({ ...structureFormData, classLevel: e.target.value as GradeLevel })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white font-medium"
              >
                {GRADE_LEVELS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Line Items List */}
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">Fee Items & Amounts</span>
              <button
                type="button"
                onClick={handleAddStructureItem}
                className="text-xs font-bold text-blue-900 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Fee Line
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {structureFormData.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                  <input
                    type="text"
                    placeholder="e.g. Tuition Fee, Lunch Program"
                    required
                    value={item.name}
                    onChange={(e) => {
                      const updated = [...structureFormData.items];
                      updated[idx].name = e.target.value;
                      setStructureFormData({ ...structureFormData, items: updated });
                    }}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                  <div className="w-36 flex items-center gap-1">
                    <span className="text-[11px] font-bold text-slate-400">{school?.currencySymbol || 'KSh'}</span>
                    <input
                      type="number"
                      required
                      value={item.amount}
                      onChange={(e) => {
                        const updated = [...structureFormData.items];
                        updated[idx].amount = Number(e.target.value);
                        setStructureFormData({ ...structureFormData, items: updated });
                      }}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-right"
                    />
                  </div>
                  {structureFormData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveStructureItem(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Sum Total Preview */}
            <div className="p-3 bg-blue-900 text-white rounded-xl flex items-center justify-between">
              <span className="font-bold">Total Term Structure Fee:</span>
              <span className="text-base font-black">
                {school?.currencySymbol || 'KSh'}{' '}
                {structureFormData.items.reduce((s, i) => s + (Number(i.amount) || 0), 0).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <Button variant="outline" type="button" onClick={() => setIsStructureModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Fee Structure
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Single Invoice Modal */}
      <Modal isOpen={isInvoiceModalOpen} onClose={() => setIsInvoiceModalOpen(false)} title="Issue Term Fee Invoice" maxWidth="md">
        <form onSubmit={handleCreateInvoice} className="space-y-3 text-xs">
          <StudentSearchSelect
            students={students}
            selectedStudentId={invFormData.studentId}
            currencySymbol={school?.currencySymbol || 'KSh'}
            label="Search Student to Invoice (by Class or Name)"
            required
            placeholder="Type student name, admission #, or parent phone..."
            onSelectStudent={(s) => setInvFormData({ ...invFormData, studentId: s.id })}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Tuition Fee ({school?.currencySymbol || 'KSh'})</label>
              <input
                type="number"
                value={invFormData.tuitionFee}
                onChange={(e) => setInvFormData({ ...invFormData, tuitionFee: Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">CBC Materials & Tech</label>
              <input
                type="number"
                value={invFormData.cbcMaterialsFee}
                onChange={(e) => setInvFormData({ ...invFormData, cbcMaterialsFee: Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Lunch Program</label>
              <input
                type="number"
                value={invFormData.lunchFee}
                onChange={(e) => setInvFormData({ ...invFormData, lunchFee: Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Activity & Swimming</label>
              <input
                type="number"
                value={invFormData.activityFee}
                onChange={(e) => setInvFormData({ ...invFormData, activityFee: Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" type="button" onClick={() => setIsInvoiceModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Issue Invoice
            </Button>
          </div>
        </form>
      </Modal>

      {/* Official Printable Fee Structure Modal */}
      {selectedStructureForPrint && (
        <Modal
          isOpen={isPrintStructureModalOpen}
          onClose={() => setIsPrintStructureModalOpen(false)}
          title="Official Institutional Fee Schedule"
          maxWidth="2xl"
        >
          <div className="space-y-6 text-slate-800 p-6 bg-white border border-slate-200 rounded-2xl">
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-900 text-white rounded-2xl">
                  <SchoolIcon className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-lg font-black uppercase text-slate-900 tracking-tight">
                    {school?.name || 'Gracia Learning Centre'}
                  </h2>
                  <p className="text-xs text-slate-500 italic">{school?.motto}</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {school?.address} • Tel: {school?.phone} • Email: {school?.email}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="primary" size="md">
                  {selectedStructureForPrint.term} {selectedStructureForPrint.academicYear}
                </Badge>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm">
                Target Class: <strong>{selectedStructureForPrint.classLevel}</strong>
              </span>
              <span className="text-xs text-slate-500">Curriculum: Kenya CBC 2-6-3-3-3</span>
            </div>

            {/* Table */}
            <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Fee Vote Head Description</th>
                  <th className="p-3 text-right">Amount ({school?.currencySymbol || 'KSh'})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedStructureForPrint.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-3 font-medium text-slate-800">{item.name}</td>
                    <td className="p-3 font-bold text-slate-900 text-right">
                      {item.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
                <tr className="bg-blue-50/80 font-black text-blue-950">
                  <td className="p-3 text-sm">TOTAL TERMLY FEE</td>
                  <td className="p-3 text-sm text-right">
                    {school?.currencySymbol || 'KSh'} {selectedStructureForPrint.totalAmount.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Payment instructions */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-600" /> Approved School Payment Channels
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="font-bold text-emerald-800 block">M-PESA PAYBILL</span>
                  <p className="text-slate-600">Business No: <strong>522522</strong></p>
                  <p className="text-slate-600">Account No: <strong>[Admission Number]</strong></p>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="font-bold text-blue-900 block">EQUITY BANK ACCOUNT</span>
                  <p className="text-slate-600">Account Name: <strong>{school?.name || 'Gracia Learning Centre'}</strong></p>
                  <p className="text-slate-600">Account No: <strong>{school?.paymentSettings?.bankAccountNumber || '0180293847192'}</strong></p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 no-print">
              <Button variant="outline" onClick={() => setIsPrintStructureModalOpen(false)}>
                Close
              </Button>
              <Button
                variant="primary"
                icon={<Printer className="w-4 h-4" />}
                onClick={() => {
                  if (selectedStructureForPrint) {
                    printerService.printFeeStructure(selectedStructureForPrint, school);
                  }
                }}
              >
                Print Official Fee Schedule
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Fee Structure Confirmation Modal */}
      {structureToDelete && (
        <Modal
          isOpen={isDeleteStructureModalOpen}
          onClose={() => {
            setIsDeleteStructureModalOpen(false);
            setStructureToDelete(null);
          }}
          title="Delete Fee Structure"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-900">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-sm">Delete Fee Schedule?</p>
                <p className="text-slate-600 leading-relaxed">
                  Are you sure you want to permanently delete the Fee Structure for{' '}
                  <strong className="text-slate-900">{structureToDelete.classLevel}</strong> ({structureToDelete.term}, {structureToDelete.academicYear}) with total amount of{' '}
                  <strong className="text-rose-700">{school?.currencySymbol || 'KSh'} {structureToDelete.totalAmount?.toLocaleString()}</strong>?
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsDeleteStructureModalOpen(false);
                  setStructureToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={handleConfirmDeleteFeeStructure}
              >
                Yes, Delete Structure
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Clear All Fee Structures Confirmation Modal */}
      <Modal
        isOpen={isClearAllStructuresModalOpen}
        onClose={() => setIsClearAllStructuresModalOpen(false)}
        title="Clear All Fee Structures"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-900">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sm">Remove All {feeStructures.length} Fee Structures?</p>
              <p className="text-slate-600 leading-relaxed">
                This will delete all predefined/sample fee structures from your database. You will have a clean slate to define only your school's actual fees.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsClearAllStructuresModalOpen(false)}
              disabled={isClearingAll}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={isClearingAll}
              icon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={handleConfirmClearAllFeeStructures}
            >
              Yes, Clear All Structures
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Payment / Receipt Modal */}
      <Modal
        isOpen={isEditPayModalOpen}
        onClose={() => {
          setIsEditPayModalOpen(false);
          setEditingPayment(null);
        }}
        title={`Edit Payment Receipt (${editingPayment?.receiptNumber || ''})`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveEditPayment} className="space-y-3.5 text-xs">
          <StudentSearchSelect
            students={students}
            selectedStudentId={editPayFormData.studentId}
            currencySymbol={school?.currencySymbol || 'KSh'}
            label="Assigned Student (Search by Class or Name)"
            required
            placeholder="Type student name, admission #, or parent phone..."
            onSelectStudent={(s) => setEditPayFormData({ ...editPayFormData, studentId: s.id })}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Amount Paid ({school?.currencySymbol || 'KSh'}) *</label>
              <input
                type="number"
                required
                value={editPayFormData.amount}
                onChange={(e) => setEditPayFormData({ ...editPayFormData, amount: Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl font-bold text-emerald-800"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Payment Mode *</label>
              <select
                value={editPayFormData.paymentMethod}
                onChange={(e) => setEditPayFormData({ ...editPayFormData, paymentMethod: e.target.value as any })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl bg-white font-medium"
              >
                <option value="MPESA">M-Pesa (Till / Paybill)</option>
                <option value="BANK_TRANSFER">Bank Slip / Deposit</option>
                <option value="CASH">Cash Office</option>
                <option value="CHEQUE">Banker's Cheque</option>
                <option value="CARD">Debit / Credit Card</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Transaction Reference Code *</label>
              <input
                type="text"
                required
                value={editPayFormData.transactionReference}
                onChange={(e) => setEditPayFormData({ ...editPayFormData, transactionReference: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Payment Date *</label>
              <input
                type="date"
                required
                value={editPayFormData.paymentDate}
                onChange={(e) => setEditPayFormData({ ...editPayFormData, paymentDate: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700">Payment Description / Remarks</label>
            <input
              type="text"
              value={editPayFormData.notes}
              onChange={(e) => setEditPayFormData({ ...editPayFormData, notes: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-amber-800 text-[11px]">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Updating payment details will automatically recalculate and reconcile the student's fee ledger and linked invoice balances.
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setIsEditPayModalOpen(false);
                setEditingPayment(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={isUpdatingPayment}
              className="bg-blue-900 hover:bg-blue-800 font-bold"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Payment / Receipt Confirmation Modal */}
      {paymentToDelete && (
        <Modal
          isOpen={isDeletePayModalOpen}
          onClose={() => {
            setIsDeletePayModalOpen(false);
            setPaymentToDelete(null);
          }}
          title="Delete Payment Receipt"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-900">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-sm">Delete Receipt & Revert Balance?</p>
                <p className="text-slate-600 leading-relaxed">
                  Are you sure you want to permanently delete receipt{' '}
                  <strong className="text-slate-900">{paymentToDelete.receiptNumber}</strong> of{' '}
                  <strong className="text-rose-700 font-black">
                    {school?.currencySymbol || 'KSh'} {paymentToDelete.amount.toLocaleString()}
                  </strong>{' '}
                  for <strong className="text-slate-900">{paymentToDelete.studentName}</strong> ({paymentToDelete.admissionNumber})?
                </p>
                <p className="text-[11px] text-rose-700 font-semibold mt-1">
                  • The student's outstanding fee balance will be increased by {school?.currencySymbol || 'KSh'} {paymentToDelete.amount.toLocaleString()}.<br />
                  • Linked invoice balances will be restored.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsDeletePayModalOpen(false);
                  setPaymentToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={isDeletingPayment}
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={handleConfirmDeletePayment}
              >
                Yes, Delete Receipt
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Official Printable Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        payment={selectedPayment}
        school={school}
        onEdit={(p) => handleOpenEditPayment(p)}
        onDelete={(p) => handleOpenDeletePayment(p)}
      />

      {/* Student Profile Modal Trigger */}
      <StudentProfileModal
        isOpen={isStudentProfileOpen}
        onClose={() => setIsStudentProfileOpen(false)}
        student={selectedStudentForProfile}
        school={school}
        onRecordPayment={(std) => {
          setIsStudentProfileOpen(false);
          setPayFormData((prev) => ({ ...prev, studentId: std.id }));
          setIsPayModalOpen(true);
        }}
      />

      {/* Batch Billing Modal */}
      <BatchBillingModal
        isOpen={isBatchBillingOpen}
        onClose={() => setIsBatchBillingOpen(false)}
        onSuccess={() => loadFinanceData()}
        initialScope={batchBillingScope}
        initialGrade={batchBillingGrade}
      />
    </div>
  );
};

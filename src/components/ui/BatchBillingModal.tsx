import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { feeService, BatchBillingResult } from '../../services/feeAndPaymentService';
import { studentService } from '../../services/studentService';
import { auditService } from '../../services/auditService';
import { Student, FeeStructure, GradeLevel } from '../../types';
import { Modal } from './Modal';
import { Button } from './Button';
import { Badge } from './Badge';
import {
  Send,
  CheckCircle2,
  AlertCircle,
  Layers,
  Calendar,
  Users,
  DollarSign,
  Loader2,
  CheckCircle,
  HelpCircle,
  FileText,
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

interface BatchBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialScope?: 'ALL' | 'GRADE' | 'SELECTED';
  initialGrade?: GradeLevel;
  selectedStudentIds?: string[];
}

export const BatchBillingModal: React.FC<BatchBillingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialScope = 'ALL',
  initialGrade = 'Grade 1',
  selectedStudentIds = [],
}) => {
  const { school, user } = useAuth();
  const { showToast } = useToast();

  const [scope, setScope] = useState<'ALL' | 'GRADE' | 'SELECTED'>(
    selectedStudentIds.length > 0 ? 'SELECTED' : initialScope
  );
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(initialGrade);
  const [academicYear, setAcademicYear] = useState<string>('2026');
  const [term, setTerm] = useState<'Term 1' | 'Term 2' | 'Term 3'>('Term 1');
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [skipAlreadyBilled, setSkipAlreadyBilled] = useState<boolean>(true);

  const [students, setStudents] = useState<Student[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [billingResult, setBillingResult] = useState<BatchBillingResult | null>(null);

  useEffect(() => {
    if (isOpen && school?.id) {
      setBillingResult(null);
      if (selectedStudentIds.length > 0) {
        setScope('SELECTED');
      } else {
        setScope(initialScope);
      }
      loadData();
    }
  }, [isOpen, school?.id, selectedStudentIds.length]);

  const loadData = async () => {
    if (!school?.id) return;
    setLoadingInitial(true);
    try {
      const [allStudents, allStructures] = await Promise.all([
        studentService.getStudents(school.id),
        feeService.getFeeStructures(school.id),
      ]);
      setStudents(allStudents.filter((s) => s.status === 'ACTIVE'));
      setFeeStructures(allStructures);
    } catch (e: any) {
      showToast('Error loading students & fee structures: ' + e.message, 'error');
    } finally {
      setLoadingInitial(false);
    }
  };

  // Determine target students
  const targetStudents = students.filter((s) => {
    if (scope === 'SELECTED') {
      return selectedStudentIds.includes(s.id);
    }
    if (scope === 'GRADE') {
      return s.currentClass === selectedGrade;
    }
    return true;
  });

  // Calculate preview statistics
  const previewData = React.useMemo(() => {
    const classMap: Record<string, { count: number; feePerStudent: number; totalFee: number }> = {};

    GRADE_LEVELS.forEach((g) => {
      const studentsInGrade = targetStudents.filter((s) => s.currentClass === g);
      if (studentsInGrade.length > 0) {
        const structure =
          feeStructures.find(
            (fs) => fs.classLevel === g && fs.academicYear === academicYear && fs.term === term
          ) ||
          feeStructures.find((fs) => fs.classLevel === g) ||
          null;

        const feePerStudent = structure ? structure.totalAmount : 35000;
        classMap[g] = {
          count: studentsInGrade.length,
          feePerStudent,
          totalFee: feePerStudent * studentsInGrade.length,
        };
      }
    });

    const totalStudents = targetStudents.length;
    const totalProjectedAmount = Object.values(classMap).reduce((sum, item) => sum + item.totalFee, 0);

    return {
      classMap,
      totalStudents,
      totalProjectedAmount,
    };
  }, [targetStudents, feeStructures, academicYear, term]);

  const handleExecuteBatchBilling = async () => {
    if (!school?.id) return;
    if (targetStudents.length === 0) {
      showToast('No active students selected for billing.', 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await feeService.billAllStudents(school.id, {
        academicYear,
        term,
        dueDate,
        scope,
        classLevel: scope === 'GRADE' ? selectedGrade : undefined,
        studentIds: scope === 'SELECTED' ? selectedStudentIds : undefined,
        skipAlreadyBilled,
      });

      setBillingResult(result);

      if (user) {
        await auditService.logAction(
          school.id,
          { id: user.id, name: user.name, role: user.role },
          'BATCH_BILLING',
          'FINANCE',
          `Issued ${result.billedCount} invoices totaling ${school.currencySymbol || 'KSh'} ${result.totalAmountBilled.toLocaleString()} for ${term} ${academicYear} (Scope: ${scope})`
        );
      }

      showToast(
        `Successfully issued ${result.billedCount} invoices totaling ${school.currencySymbol || 'KSh'} ${result.totalAmountBilled.toLocaleString()}!`,
        'success'
      );
      if (onSuccess) onSuccess();
    } catch (e: any) {
      showToast('Error issuing batch invoices: ' + e.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isProcessing) {
          onClose();
        }
      }}
      title="Batch Bill Students / Issue Term Invoices"
      subtitle="Issue itemized fee invoices to all active learners or selected grade levels"
      maxWidth="2xl"
    >
      <div className="space-y-5 text-xs">
        {loadingInitial ? (
          <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-900" />
            <p>Loading roster and CBC fee schedules...</p>
          </div>
        ) : billingResult ? (
          /* Success Screen */
          <div className="space-y-4 py-2">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3.5 text-emerald-900">
              <div className="p-2 bg-emerald-100 rounded-xl shrink-0 text-emerald-700">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-emerald-950 text-sm">Batch Invoicing Completed!</h4>
                <p className="text-emerald-800 leading-relaxed">
                  Generated and dispatched official term invoices across student accounts. Learner fee balances and school revenue ledgers have been automatically synchronized.
                </p>
              </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="text-[11px] font-semibold text-slate-500 block">Invoices Issued</span>
                <span className="text-xl font-black text-slate-900">{billingResult.billedCount}</span>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="text-[11px] font-semibold text-slate-500 block">Total Fees Invoiced</span>
                <span className="text-xl font-black text-emerald-700">
                  {school?.currencySymbol || 'KSh'} {billingResult.totalAmountBilled.toLocaleString()}
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="text-[11px] font-semibold text-slate-500 block">Skipped (Already Billed)</span>
                <span className="text-xl font-black text-amber-700">{billingResult.skippedCount}</span>
              </div>
            </div>

            {/* Breakdown table */}
            {billingResult.classBreakdown.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-2.5 bg-slate-100 font-bold text-slate-700 flex items-center justify-between">
                  <span>Class Breakdown</span>
                  <span>Total Amount</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {billingResult.classBreakdown.map((item) => (
                    <div key={item.classLevel} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                      <span className="font-semibold text-slate-900">
                        {item.classLevel} ({item.count} learners)
                      </span>
                      <span className="font-mono font-bold text-slate-800">
                        {school?.currencySymbol || 'KSh'} {item.totalAmount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <Button
                variant="primary"
                onClick={() => {
                  onClose();
                  if (onSuccess) onSuccess();
                }}
              >
                Close & View Invoices
              </Button>
            </div>
          </div>
        ) : (
          /* Billing Configuration Form */
          <div className="space-y-4">
            {/* Scope Selection */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 block">Select Invoicing Target:</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setScope('ALL')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    scope === 'ALL'
                      ? 'border-blue-900 bg-blue-50/50 ring-2 ring-blue-900/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-900" />
                    All Active Students
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Entire school roster ({students.length} active learners)
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setScope('GRADE')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    scope === 'GRADE'
                      ? 'border-blue-900 bg-blue-50/50 ring-2 ring-blue-900/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-900" />
                    Specific Grade Level
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Bill one class at a time
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setScope('SELECTED')}
                  disabled={selectedStudentIds.length === 0}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    scope === 'SELECTED'
                      ? 'border-blue-900 bg-blue-50/50 ring-2 ring-blue-900/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
                >
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                    Selected Students
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {selectedStudentIds.length > 0
                      ? `${selectedStudentIds.length} learner(s) chosen`
                      : 'No students pre-selected'}
                  </div>
                </button>
              </div>
            </div>

            {/* Grade Level Selector if scope is GRADE */}
            {scope === 'GRADE' && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-3">
                <label className="font-bold text-slate-700 shrink-0">Select Class to Bill:</label>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value as GradeLevel)}
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 text-xs"
                >
                  {GRADE_LEVELS.map((g) => {
                    const countInGrade = students.filter((s) => s.currentClass === g).length;
                    return (
                      <option key={g} value={g}>
                        {g} ({countInGrade} active learners)
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Academic Session & Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Academic Year</label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 text-xs"
                >
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Term Session</label>
                <select
                  value={term}
                  onChange={(e) => setTerm(e.target.value as 'Term 1' | 'Term 2' | 'Term 3')}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 text-xs"
                >
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Invoice Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 text-xs"
                />
              </div>
            </div>

            {/* Duplicate Protection Option */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="skipAlreadyBilled"
                  checked={skipAlreadyBilled}
                  onChange={(e) => setSkipAlreadyBilled(e.target.checked)}
                  className="rounded text-blue-900 focus:ring-blue-800 h-4 w-4 cursor-pointer"
                />
                <label htmlFor="skipAlreadyBilled" className="font-semibold text-slate-800 cursor-pointer">
                  Prevent Duplicate Invoicing
                </label>
              </div>
              <span className="text-[11px] text-slate-500">
                Skips learners who already have an invoice for {term} {academicYear}
              </span>
            </div>

            {/* Billing Preview Summary */}
            <div className="bg-blue-50/70 border border-blue-200/80 p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 rounded-lg text-blue-900">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-blue-950 text-sm">Estimated Invoicing Summary</span>
                </div>
                <Badge variant="primary" size="sm">
                  {term} • {academicYear}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-white/80 p-2.5 rounded-xl border border-blue-100">
                  <span className="text-[11px] text-slate-500 font-medium block">Total Learners to Bill</span>
                  <span className="text-lg font-black text-slate-900">
                    {previewData.totalStudents} Active Students
                  </span>
                </div>

                <div className="bg-white/80 p-2.5 rounded-xl border border-blue-100">
                  <span className="text-[11px] text-slate-500 font-medium block">Projected Invoice Total</span>
                  <span className="text-lg font-black text-emerald-800">
                    {school?.currencySymbol || 'KSh'} {previewData.totalProjectedAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Class by class breakdown table */}
              <div className="bg-white rounded-xl border border-blue-100 overflow-hidden mt-2">
                <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 text-[11px]">
                  {(Object.entries(previewData.classMap) as [string, { count: number; feePerStudent: number; totalFee: number }][]).map(([grade, data]) => (
                    <div key={grade} className="p-2 flex items-center justify-between text-slate-700">
                      <span className="font-semibold text-slate-900">
                        {grade} ({data.count} learners)
                      </span>
                      <div className="text-right">
                        <span className="text-slate-500 mr-2">
                          @{school?.currencySymbol || 'KSh'} {data.feePerStudent.toLocaleString()}
                        </span>
                        <span className="font-bold text-slate-900">
                          {school?.currencySymbol || 'KSh'} {data.totalFee.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <Button
                variant="outline"
                type="button"
                disabled={isProcessing}
                onClick={onClose}
              >
                Cancel
              </Button>
              <button
                type="button"
                disabled={isProcessing || previewData.totalStudents === 0}
                onClick={handleExecuteBatchBilling}
                className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-sm text-xs"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Issuing Invoices...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Bill {previewData.totalStudents} Student(s) (
                    {school?.currencySymbol || 'KSh'} {previewData.totalProjectedAmount.toLocaleString()})
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

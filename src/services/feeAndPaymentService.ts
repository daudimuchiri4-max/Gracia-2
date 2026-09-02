import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FeeStructure, Invoice, Payment, Student, GradeLevel } from '../types';
import { studentService } from './studentService';
import { cleanForFirestore } from '../utils/firestoreHelper';

export interface BatchBillingOptions {
  academicYear: string;
  term: 'Term 1' | 'Term 2' | 'Term 3';
  dueDate: string;
  scope?: 'ALL' | 'GRADE' | 'SELECTED';
  classLevel?: GradeLevel;
  studentIds?: string[];
  skipAlreadyBilled?: boolean;
}

export interface BatchBillingResult {
  billedCount: number;
  totalAmountBilled: number;
  skippedCount: number;
  classBreakdown: { classLevel: string; count: number; totalAmount: number }[];
}

export const DEFAULT_CBC_FEE_STRUCTURES: Omit<FeeStructure, 'schoolId' | 'createdAt'>[] = [
  {
    id: 'fs_2026_Term_1_Playgroup',
    academicYear: '2026',
    term: 'Term 1',
    classLevel: 'Playgroup',
    items: [
      { name: 'Tuition & Early Childhood Care', amount: 25000 },
      { name: 'Mid-Morning Snack & Nutritious Lunch', amount: 9000 },
      { name: 'Sensory Play & Art Materials', amount: 3500 },
      { name: 'Activity & Swimming', amount: 3000 },
      { name: 'Medical Emergency & Insurance', amount: 1500 },
    ],
    totalAmount: 42000,
  },
  {
    id: 'fs_2026_Term_1_PP1',
    academicYear: '2026',
    term: 'Term 1',
    classLevel: 'PP1',
    items: [
      { name: 'Tuition & Phonics Literacy', amount: 28000 },
      { name: 'Hot Lunch & Fruit Break', amount: 10000 },
      { name: 'CBC Activity Workbooks & Stationery', amount: 4500 },
      { name: 'Swimming & Co-Curricular', amount: 3500 },
      { name: 'Continuous Formative Assessment', amount: 1500 },
    ],
    totalAmount: 47500,
  },
  {
    id: 'fs_2026_Term_1_PP2',
    academicYear: '2026',
    term: 'Term 1',
    classLevel: 'PP2',
    items: [
      { name: 'Tuition & Early Numeracy', amount: 28000 },
      { name: 'Hot Lunch & Fruit Break', amount: 10000 },
      { name: 'CBC Activity Workbooks & Craft Kits', amount: 4500 },
      { name: 'Swimming & Co-Curricular', amount: 3500 },
      { name: 'Continuous Formative Assessment', amount: 1500 },
    ],
    totalAmount: 47500,
  },
  {
    id: 'fs_2026_Term_1_Grade_1',
    academicYear: '2026',
    term: 'Term 1',
    classLevel: 'Grade 1',
    items: [
      { name: 'Tuition Fee (Lower Primary CBC)', amount: 32000 },
      { name: 'CBC Curriculum Materials & Digital Learning', amount: 5500 },
      { name: 'Nutritious Lunch Program', amount: 11000 },
      { name: 'Activity, Swimming & Physical Education', amount: 4000 },
      { name: 'Continuous Assessment & Portfolio', amount: 2000 },
    ],
    totalAmount: 54500,
  },
  {
    id: 'fs_2026_Term_1_Grade_2',
    academicYear: '2026',
    term: 'Term 1',
    classLevel: 'Grade 2',
    items: [
      { name: 'Tuition Fee (Lower Primary CBC)', amount: 32000 },
      { name: 'CBC Curriculum Materials & Coding', amount: 5500 },
      { name: 'Nutritious Lunch Program', amount: 11000 },
      { name: 'Activity, Swimming & Physical Education', amount: 4000 },
      { name: 'Continuous Assessment & Portfolio', amount: 2000 },
    ],
    totalAmount: 54500,
  },
  {
    id: 'fs_2026_Term_1_Grade_3',
    academicYear: '2026',
    term: 'Term 1',
    classLevel: 'Grade 3',
    items: [
      { name: 'Tuition Fee (Lower Primary CBC)', amount: 32000 },
      { name: 'CBC Curriculum & Science Practical Kits', amount: 6000 },
      { name: 'Nutritious Lunch Program', amount: 11000 },
      { name: 'Activity, Swimming & Physical Education', amount: 4000 },
      { name: 'KNEC Grade 3 Monitoring Assessment (MLP)', amount: 2500 },
    ],
    totalAmount: 55500,
  },
  {
    id: 'fs_2026_Term_1_Grade_4',
    academicYear: '2026',
    term: 'Term 1',
    classLevel: 'Grade 4',
    items: [
      { name: 'Tuition Fee (Upper Primary)', amount: 35000 },
      { name: 'CBC Science & Agriculture Practical Kits', amount: 6500 },
      { name: 'Nutritious Lunch Program', amount: 12000 },
      { name: 'Activity, Swimming & Sports Clubs', amount: 4500 },
      { name: 'KNEC Formative Assessment & Digital Record', amount: 2000 },
    ],
    totalAmount: 60000,
  },
  {
    id: 'fs_2026_Term_1_Grade_5',
    academicYear: '2026',
    term: 'Term 1',
    classLevel: 'Grade 5',
    items: [
      { name: 'Tuition Fee (Upper Primary)', amount: 35000 },
      { name: 'CBC Science & Agriculture Practical Kits', amount: 6500 },
      { name: 'Nutritious Lunch Program', amount: 12000 },
      { name: 'Activity, Swimming & Sports Clubs', amount: 4500 },
      { name: 'KNEC Formative Assessment & Digital Record', amount: 2000 },
    ],
    totalAmount: 60000,
  },
  {
    id: 'fs_2026_Term_1_Grade_6',
    academicYear: '2026',
    term: 'Term 1',
    classLevel: 'Grade 6',
    items: [
      { name: 'Tuition Fee (KPSEA Candidate Class)', amount: 36000 },
      { name: 'KPSEA Rehearsals, Science Kits & Tech', amount: 7500 },
      { name: 'Nutritious Lunch Program', amount: 12000 },
      { name: 'Activity, Swimming & Leadership Mentorship', amount: 4500 },
      { name: 'KNEC KPSEA National Assessment Management', amount: 3000 },
    ],
    totalAmount: 63000,
  },
  {
    id: 'fs_2026_Term_1_Grade_7',
    academicYear: '2026',
    term: 'Term 1',
    classLevel: 'Grade 7',
    items: [
      { name: 'Tuition Fee (Junior Secondary School)', amount: 42000 },
      { name: 'Integrated Science & Pre-Technical Studies Lab', amount: 8500 },
      { name: 'Nutritious Lunch Program', amount: 12000 },
      { name: 'ICT, Coding, Robotics & Digital Learning', amount: 5500 },
      { name: 'Co-Curricular, Sports & Performing Arts', amount: 4000 },
      { name: 'Continuous CBC Assessment & Project Portfolio', amount: 2500 },
    ],
    totalAmount: 74500,
  },
  {
    id: 'fs_2026_Term_1_Grade_8',
    academicYear: '2026',
    term: 'Term 1',
    classLevel: 'Grade 8',
    items: [
      { name: 'Tuition Fee (Junior Secondary School)', amount: 42000 },
      { name: 'Integrated Science & Pre-Technical Studies Lab', amount: 8500 },
      { name: 'Nutritious Lunch Program', amount: 12000 },
      { name: 'ICT, Coding, Robotics & Digital Learning', amount: 5500 },
      { name: 'Co-Curricular, Sports & Performing Arts', amount: 4000 },
      { name: 'Continuous CBC Assessment & Project Portfolio', amount: 2500 },
    ],
    totalAmount: 74500,
  },
  {
    id: 'fs_2026_Term_1_Grade_9',
    academicYear: '2026',
    term: 'Term 1',
    classLevel: 'Grade 9',
    items: [
      { name: 'Tuition Fee (Senior Junior Secondary - KJSEA Prep)', amount: 44000 },
      { name: 'Advanced Science Lab & Career Pathway Practical', amount: 9500 },
      { name: 'Nutritious Lunch Program', amount: 12000 },
      { name: 'ICT, Computer Science & STEM Innovation', amount: 6000 },
      { name: 'Co-Curricular & Leadership Development', amount: 4500 },
      { name: 'KJSEA National Assessment Preparation', amount: 3500 },
    ],
    totalAmount: 79500,
  },
];

export const feeService = {
  async getFeeStructures(schoolId: string): Promise<FeeStructure[]> {
    try {
      const snap = await getDocs(collection(db, 'schools', schoolId, 'feeStructures'));
      const list = snap.docs.map((d) => ({ ...d.data(), id: d.id } as FeeStructure));
      // Sync local cache
      try {
        localStorage.setItem(`fee_structures_${schoolId}`, JSON.stringify(list));
      } catch {}
      return list;
    } catch (err) {
      console.error('Error fetching fee structures:', err);
      const cached = localStorage.getItem(`fee_structures_${schoolId}`);
      if (cached !== null) {
        try {
          return JSON.parse(cached) as FeeStructure[];
        } catch {}
      }
      return [];
    }
  },

  async clearAllFeeStructures(schoolId: string): Promise<void> {
    try {
      const snap = await getDocs(collection(db, 'schools', schoolId, 'feeStructures'));
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    } catch (e) {
      console.warn('Error clearing fee structures from Firestore:', e);
    }
    try {
      localStorage.removeItem(`fee_structures_${schoolId}`);
      localStorage.removeItem(`fee_structures_initialized_${schoolId}`);
    } catch {}
  },

  async saveFeeStructure(
    schoolId: string,
    data: Omit<FeeStructure, 'id' | 'schoolId' | 'totalAmount' | 'createdAt'> & { id?: string }
  ): Promise<FeeStructure> {
    const totalAmount = data.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const docId = data.id || `fs_${data.academicYear}_${data.term}_${data.classLevel}`.replace(/\s+/g, '_');
    const docRef = doc(db, 'schools', schoolId, 'feeStructures', docId);

    const feeStruct: FeeStructure = {
      ...data,
      id: docId,
      schoolId,
      totalAmount,
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(docRef, cleanForFirestore(feeStruct));
    } catch (e) {
      console.warn('Error saving fee structure to Firestore:', e);
    }

    // Update local cache
    try {
      const cached = localStorage.getItem(`fee_structures_${schoolId}`);
      const list: FeeStructure[] = cached ? JSON.parse(cached) : [];
      const updated = list.filter((f) => f.id !== docId).concat(feeStruct);
      localStorage.setItem(`fee_structures_${schoolId}`, JSON.stringify(updated));
      localStorage.setItem(`fee_structures_initialized_${schoolId}`, 'true');
    } catch (e) {
      console.warn('Local fee structure update failed:', e);
    }

    return feeStruct;
  },

  async deleteFeeStructure(schoolId: string, structureId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'schools', schoolId, 'feeStructures', structureId));
    } catch (e) {
      console.warn('Error deleting fee structure from Firestore:', e);
    }

    try {
      const cached = localStorage.getItem(`fee_structures_${schoolId}`);
      const list: FeeStructure[] = cached ? JSON.parse(cached) : [];
      const filtered = list.filter((f) => f.id !== structureId);
      localStorage.setItem(`fee_structures_${schoolId}`, JSON.stringify(filtered));
      localStorage.setItem(`fee_structures_initialized_${schoolId}`, 'true');
    } catch (e) {
      console.warn('Error updating local cache on delete:', e);
    }
  },

  async getInvoices(schoolId: string, options?: { studentId?: string; status?: string }): Promise<Invoice[]> {
    try {
      const snap = await getDocs(collection(db, 'schools', schoolId, 'invoices'));
      let list = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Invoice));
      if (options?.studentId) {
        list = list.filter((i) => i.studentId === options.studentId);
      }
      if (options?.status) {
        list = list.filter((i) => i.status === options.status);
      }
      return list;
    } catch (err) {
      console.error('Error fetching invoices:', err);
      return [];
    }
  },

  async createInvoice(
    schoolId: string,
    data: Omit<Invoice, 'id' | 'schoolId' | 'invoiceNumber' | 'paidAmount' | 'balance' | 'status' | 'createdAt'>
  ): Promise<Invoice> {
    const colRef = collection(db, 'schools', schoolId, 'invoices');
    const newDoc = doc(colRef);
    const invNum = `INV/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;

    const total = data.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const invoice: Invoice = {
      ...data,
      id: newDoc.id,
      schoolId,
      invoiceNumber: invNum,
      totalAmount: total,
      paidAmount: 0,
      balance: total,
      status: 'UNPAID',
      createdAt: new Date().toISOString(),
    };

    await setDoc(newDoc, cleanForFirestore(invoice));

    // Update student balance
    const currentStudent = await studentService.getStudentById(schoolId, data.studentId);
    if (currentStudent) {
      const newBal = (currentStudent.totalBalance || 0) + total;
      await studentService.updateStudent(schoolId, data.studentId, { totalBalance: newBal });
    }

    return invoice;
  },

  async deleteInvoice(schoolId: string, invoiceId: string): Promise<void> {
    try {
      const invRef = doc(db, 'schools', schoolId, 'invoices', invoiceId);
      const invSnap = await getDoc(invRef);
      if (!invSnap.exists()) return;
      const inv = invSnap.data() as Invoice;

      await deleteDoc(invRef);

      const student = await studentService.getStudentById(schoolId, inv.studentId);
      if (student) {
        const currentBal = student.totalBalance || 0;
        const unbilledAmount = inv.balance !== undefined ? inv.balance : (inv.totalAmount - (inv.paidAmount || 0));
        const newBal = Math.max(0, currentBal - unbilledAmount);
        await studentService.updateStudent(schoolId, inv.studentId, { totalBalance: newBal });
      }
    } catch (e) {
      console.error('Error deleting/unbilling invoice:', e);
      throw e;
    }
  },

  /**
   * Batch bill all students in the school or within a selected grade/selection.
   * Uses chunked Firestore batch writes to issue invoices and update student balances.
   */
  async billAllStudents(
    schoolId: string,
    options: BatchBillingOptions
  ): Promise<BatchBillingResult> {
    const allStudents = await studentService.getStudents(schoolId);
    
    // Filter target students
    let targetStudents = allStudents.filter((s) => s.status === 'ACTIVE');
    if (options.scope === 'GRADE' && options.classLevel) {
      targetStudents = targetStudents.filter((s) => s.currentClass === options.classLevel);
    } else if (options.scope === 'SELECTED' && options.studentIds && options.studentIds.length > 0) {
      targetStudents = targetStudents.filter((s) => options.studentIds!.includes(s.id));
    }

    if (targetStudents.length === 0) {
      return { billedCount: 0, totalAmountBilled: 0, skippedCount: 0, classBreakdown: [] };
    }

    // Retrieve fee structures
    const structures = await this.getFeeStructures(schoolId);
    
    // Check existing invoices if skipping already billed
    const existingInvoices = await this.getInvoices(schoolId);
    const alreadyBilledStudentIds = new Set<string>();
    if (options.skipAlreadyBilled !== false) {
      existingInvoices.forEach((inv) => {
        if (inv.academicYear === options.academicYear && inv.term === options.term) {
          alreadyBilledStudentIds.add(inv.studentId);
        }
      });
    }

    let billedCount = 0;
    let totalAmountBilled = 0;
    let skippedCount = 0;
    const classCountMap: Record<string, { count: number; total: number }> = {};

    const operations: {
      invoice: Invoice;
      studentId: string;
      newBalance: number;
    }[] = [];

    const currentYear = options.academicYear || new Date().getFullYear().toString();
    const defaultDueDate =
      options.dueDate ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    for (const student of targetStudents) {
      if (options.skipAlreadyBilled !== false && alreadyBilledStudentIds.has(student.id)) {
        skippedCount++;
        continue;
      }

      // Match fee structure for student's class
      const matchingStructure =
        structures.find(
          (fs) =>
            fs.classLevel === student.currentClass &&
            fs.academicYear === options.academicYear &&
            fs.term === options.term
        ) ||
        structures.find((fs) => fs.classLevel === student.currentClass) ||
        DEFAULT_CBC_FEE_STRUCTURES.find((dfs) => dfs.classLevel === student.currentClass);

      let items: { description: string; amount: number }[] = [];
      let totalAmount = 0;

      if (matchingStructure && matchingStructure.items && matchingStructure.items.length > 0) {
        items = matchingStructure.items.map((it) => ({
          description: it.name,
          amount: Number(it.amount) || 0,
        }));
        totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
      } else {
        // Fallback standard item
        items = [{ description: `${student.currentClass} Standard CBC Term Fees`, amount: 35000 }];
        totalAmount = 35000;
      }

      const invDocRef = doc(collection(db, 'schools', schoolId, 'invoices'));
      const invNum = `INV/${currentYear}/${Math.floor(100000 + Math.random() * 900000)}`;

      const invoice: Invoice = {
        id: invDocRef.id,
        invoiceNumber: invNum,
        schoolId,
        studentId: student.id,
        studentName: student.fullName,
        admissionNumber: student.admissionNumber || '',
        classLevel: student.currentClass,
        stream: student.stream || '',
        academicYear: options.academicYear,
        term: options.term,
        items,
        totalAmount,
        paidAmount: 0,
        balance: totalAmount,
        dueDate: defaultDueDate,
        status: 'UNPAID',
        createdAt: new Date().toISOString(),
      };

      const newStudentBalance = (student.totalBalance || 0) + totalAmount;

      operations.push({
        invoice,
        studentId: student.id,
        newBalance: newStudentBalance,
      });

      billedCount++;
      totalAmountBilled += totalAmount;

      if (!classCountMap[student.currentClass]) {
        classCountMap[student.currentClass] = { count: 0, total: 0 };
      }
      classCountMap[student.currentClass].count += 1;
      classCountMap[student.currentClass].total += totalAmount;
    }

    // Execute in chunked Firestore batches (150 students = 300 writes per batch, well below 500 limit)
    const CHUNK_SIZE = 150;
    for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
      const chunk = operations.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);

      for (const op of chunk) {
        const invRef = doc(db, 'schools', schoolId, 'invoices', op.invoice.id);
        batch.set(invRef, cleanForFirestore(op.invoice));

        const studentRef = doc(db, 'schools', schoolId, 'students', op.studentId);
        batch.update(studentRef, {
          totalBalance: op.newBalance,
          updatedAt: new Date().toISOString(),
        });
      }

      await batch.commit();
    }

    const classBreakdown = Object.entries(classCountMap).map(([classLevel, data]) => ({
      classLevel,
      count: data.count,
      totalAmount: data.total,
    }));

    return {
      billedCount,
      totalAmountBilled,
      skippedCount,
      classBreakdown,
    };
  },

  async syncStudentTransportFee(
    schoolId: string,
    studentId: string,
    routeId: string,
    customFare?: number
  ): Promise<void> {
    try {
      const student = await studentService.getStudentById(schoolId, studentId);
      if (!student) return;

      const routeSnap = await getDoc(doc(db, 'schools', schoolId, 'routes', routeId));
      let fare = customFare || 14000;
      let routeName = 'School Bus Service';
      if (routeSnap.exists()) {
        const rData = routeSnap.data();
        routeName = rData.routeName || routeName;
        if (!customFare && rData.stops && rData.stops.length > 0) {
          fare = Number(rData.stops[0].fareTerm) || fare;
        }
      }

      const invoices = await this.getInvoices(schoolId, { studentId });
      const activeInvoice = invoices.find((inv) => inv.status !== 'PAID') || invoices[0];

      if (activeInvoice) {
        const hasTransport = activeInvoice.items.some(
          (i) => i.name.toLowerCase().includes('transport') || i.name.toLowerCase().includes('bus')
        );
        if (!hasTransport) {
          const updatedItems = [...activeInvoice.items, { name: `School Transport (${routeName})`, amount: fare }];
          const newTotal = updatedItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);
          const newBalance = Math.max(0, newTotal - (activeInvoice.paidAmount || 0));
          const invoiceRef = doc(db, 'schools', schoolId, 'invoices', activeInvoice.id);
          await setDoc(
            invoiceRef,
            {
              items: updatedItems,
              totalAmount: newTotal,
              balance: newBalance,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );

          const currentBal = student.totalBalance || 0;
          await studentService.updateStudent(schoolId, studentId, {
            transportRouteId: routeId,
            totalBalance: currentBal + fare,
          });
          return;
        }
      } else {
        await this.createInvoice(schoolId, {
          studentId,
          studentName: student.fullName,
          admissionNumber: student.admissionNumber,
          classLevel: student.currentClass,
          academicYear: '2026',
          term: 'Term 1',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          items: [{ name: `School Transport (${routeName})`, amount: fare }],
        });
      }

      await studentService.updateStudent(schoolId, studentId, { transportRouteId: routeId });
    } catch (err) {
      console.warn('Error syncing student transport fee:', err);
    }
  },

  async getPayments(schoolId: string, options?: { studentId?: string; invoiceId?: string }): Promise<Payment[]> {
    try {
      const snap = await getDocs(collection(db, 'schools', schoolId, 'payments'));
      let list = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Payment));
      if (options?.studentId) {
        list = list.filter((p) => p.studentId === options.studentId);
      }
      if (options?.invoiceId) {
        list = list.filter((p) => p.invoiceId === options.invoiceId);
      }
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      console.error('Error fetching payments:', err);
      return [];
    }
  },

  async getPaymentById(schoolId: string, paymentId: string): Promise<Payment | null> {
    try {
      const docRef = doc(db, 'schools', schoolId, 'payments', paymentId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;
      return { ...snap.data(), id: snap.id } as Payment;
    } catch (err) {
      console.error('Error fetching payment by id:', err);
      return null;
    }
  },

  async recordPayment(
    schoolId: string,
    paymentData: Omit<Payment, 'id' | 'schoolId' | 'receiptNumber' | 'createdAt'>
  ): Promise<Payment> {
    const colRef = collection(db, 'schools', schoolId, 'payments');
    const newDoc = doc(colRef);
    const receiptNum = `REC/${new Date().getFullYear()}/${Math.floor(10000 + Math.random() * 90000)}`;
    const now = new Date().toISOString();
    const amountNum = Number(paymentData.amount) || 0;

    // Fetch student's current information and balance before payment
    const currentStudent = await studentService.getStudentById(schoolId, paymentData.studentId);
    
    // Determine previous balance: if passed in paymentData use it, otherwise use student's current balance
    const previousBalance = paymentData.previousBalance !== undefined 
      ? Number(paymentData.previousBalance) 
      : (currentStudent?.totalBalance !== undefined ? currentStudent.totalBalance : 0);
    
    // Determine remaining balance after deducting this payment
    const remainingBalance = paymentData.remainingBalance !== undefined
      ? Number(paymentData.remainingBalance)
      : Math.max(0, previousBalance - amountNum);

    const payment: Payment = {
      ...paymentData,
      id: newDoc.id,
      schoolId,
      receiptNumber: receiptNum,
      amount: amountNum,
      previousBalance,
      remainingBalance,
      classLevel: paymentData.classLevel || currentStudent?.currentClass,
      stream: paymentData.stream || currentStudent?.stream,
      createdAt: now,
    };

    await setDoc(newDoc, cleanForFirestore(payment));

    // If linked to invoice, reconcile invoice
    if (paymentData.invoiceId) {
      const invRef = doc(db, 'schools', schoolId, 'invoices', paymentData.invoiceId);
      const invSnap = await getDoc(invRef);
      if (invSnap.exists()) {
        const inv = invSnap.data() as Invoice;
        const newPaid = (inv.paidAmount || 0) + payment.amount;
        const newBalance = Math.max(0, (inv.totalAmount || 0) - newPaid);
        const newStatus = newBalance === 0 ? 'PAID' : newPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID';
        await setDoc(
          invRef,
          cleanForFirestore({
            paidAmount: newPaid,
            balance: newBalance,
            status: newStatus,
          }),
          { merge: true }
        );
      }
    }

    // Update student's overall outstanding balance
    if (currentStudent) {
      const updatedBalance = Math.max(0, (currentStudent.totalBalance || 0) - payment.amount);
      await studentService.updateStudent(schoolId, paymentData.studentId, { totalBalance: updatedBalance });
    }

    return payment;
  },

  async updatePayment(
    schoolId: string,
    paymentId: string,
    updates: Partial<Payment>
  ): Promise<Payment> {
    const docRef = doc(db, 'schools', schoolId, 'payments', paymentId);
    const currentSnap = await getDoc(docRef);
    if (!currentSnap.exists()) {
      throw new Error(`Payment record with ID ${paymentId} not found.`);
    }

    const currentPayment = { ...currentSnap.data(), id: currentSnap.id } as Payment;
    const oldAmount = Number(currentPayment.amount) || 0;
    const newAmount = updates.amount !== undefined ? Number(updates.amount) : oldAmount;
    const amountDelta = newAmount - oldAmount;

    const oldStudentId = currentPayment.studentId;
    const newStudentId = updates.studentId || oldStudentId;

    const oldInvoiceId = currentPayment.invoiceId;
    const newInvoiceId = updates.invoiceId !== undefined ? updates.invoiceId : oldInvoiceId;

    // Recalculate remaining balance
    let newRemainingBalance = updates.remainingBalance;
    if (newRemainingBalance === undefined && currentPayment.previousBalance !== undefined) {
      newRemainingBalance = Math.max(0, currentPayment.previousBalance - newAmount);
    }

    const updatedPayment: Payment = {
      ...currentPayment,
      ...updates,
      amount: newAmount,
      ...(newRemainingBalance !== undefined ? { remainingBalance: newRemainingBalance } : {}),
    };

    await setDoc(docRef, cleanForFirestore(updatedPayment), { merge: true });

    // Handle invoice reconciliation
    if (oldInvoiceId && newInvoiceId && oldInvoiceId === newInvoiceId && amountDelta !== 0) {
      // Same invoice, amount changed
      const invRef = doc(db, 'schools', schoolId, 'invoices', oldInvoiceId);
      const invSnap = await getDoc(invRef);
      if (invSnap.exists()) {
        const inv = invSnap.data() as Invoice;
        const newPaid = Math.max(0, (inv.paidAmount || 0) + amountDelta);
        const newBalance = Math.max(0, (inv.totalAmount || 0) - newPaid);
        const newStatus = newBalance === 0 ? 'PAID' : newPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID';
        await setDoc(
          invRef,
          cleanForFirestore({ paidAmount: newPaid, balance: newBalance, status: newStatus }),
          { merge: true }
        );
      }
    } else if (oldInvoiceId !== newInvoiceId) {
      // Invoice was changed or detached/attached
      if (oldInvoiceId) {
        // Revert old invoice
        const oldInvRef = doc(db, 'schools', schoolId, 'invoices', oldInvoiceId);
        const oldInvSnap = await getDoc(oldInvRef);
        if (oldInvSnap.exists()) {
          const oldInv = oldInvSnap.data() as Invoice;
          const newPaid = Math.max(0, (oldInv.paidAmount || 0) - oldAmount);
          const newBalance = Math.max(0, (oldInv.totalAmount || 0) - newPaid);
          const newStatus = newBalance === 0 ? 'PAID' : newPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID';
          await setDoc(
            oldInvRef,
            cleanForFirestore({ paidAmount: newPaid, balance: newBalance, status: newStatus }),
            { merge: true }
          );
        }
      }
      if (newInvoiceId) {
        // Apply to new invoice
        const newInvRef = doc(db, 'schools', schoolId, 'invoices', newInvoiceId);
        const newInvSnap = await getDoc(newInvRef);
        if (newInvSnap.exists()) {
          const newInv = newInvSnap.data() as Invoice;
          const newPaid = (newInv.paidAmount || 0) + newAmount;
          const newBalance = Math.max(0, (newInv.totalAmount || 0) - newPaid);
          const newStatus = newBalance === 0 ? 'PAID' : newPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID';
          await setDoc(
            newInvRef,
            cleanForFirestore({ paidAmount: newPaid, balance: newBalance, status: newStatus }),
            { merge: true }
          );
        }
      }
    }

    // Handle student balance adjustments
    if (oldStudentId === newStudentId) {
      if (amountDelta !== 0) {
        const student = await studentService.getStudentById(schoolId, oldStudentId);
        if (student) {
          const newStudentBal = Math.max(0, (student.totalBalance || 0) - amountDelta);
          await studentService.updateStudent(schoolId, oldStudentId, { totalBalance: newStudentBal });
        }
      }
    } else {
      // Student changed: revert old student and apply to new student
      const oldStudent = await studentService.getStudentById(schoolId, oldStudentId);
      if (oldStudent) {
        await studentService.updateStudent(schoolId, oldStudentId, {
          totalBalance: (oldStudent.totalBalance || 0) + oldAmount,
        });
      }
      const newStudent = await studentService.getStudentById(schoolId, newStudentId);
      if (newStudent) {
        await studentService.updateStudent(schoolId, newStudentId, {
          totalBalance: Math.max(0, (newStudent.totalBalance || 0) - newAmount),
        });
      }
    }

    return updatedPayment;
  },

  async deletePayment(schoolId: string, paymentId: string): Promise<void> {
    const docRef = doc(db, 'schools', schoolId, 'payments', paymentId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const payment = snap.data() as Payment;

    // 1. Revert invoice if linked
    if (payment.invoiceId) {
      try {
        const invRef = doc(db, 'schools', schoolId, 'invoices', payment.invoiceId);
        const invSnap = await getDoc(invRef);
        if (invSnap.exists()) {
          const inv = invSnap.data() as Invoice;
          const newPaid = Math.max(0, (inv.paidAmount || 0) - (payment.amount || 0));
          const newBalance = Math.max(0, (inv.totalAmount || 0) - newPaid);
          const newStatus = newBalance === 0 ? 'PAID' : newPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID';
          await setDoc(
            invRef,
            cleanForFirestore({
              paidAmount: newPaid,
              balance: newBalance,
              status: newStatus,
            }),
            { merge: true }
          );
        }
      } catch (e) {
        console.warn('Error reverting invoice on payment delete:', e);
      }
    }

    // 2. Revert student total balance
    if (payment.studentId) {
      try {
        const student = await studentService.getStudentById(schoolId, payment.studentId);
        if (student) {
          const restoredBalance = (student.totalBalance || 0) + (payment.amount || 0);
          await studentService.updateStudent(schoolId, payment.studentId, {
            totalBalance: restoredBalance,
          });
        }
      } catch (e) {
        console.warn('Error restoring student balance on payment delete:', e);
      }
    }

    // 3. Delete the payment document
    await deleteDoc(docRef);
  },
};

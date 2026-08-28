import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FeeStructure, Invoice, Payment, GradeLevel } from '../types';
import { studentService } from './studentService';
import { cleanForFirestore } from '../utils/firestoreHelper';

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
      if (list.length > 0) {
        // Sync local cache
        try {
          localStorage.setItem(`fee_structures_${schoolId}`, JSON.stringify(list));
          localStorage.setItem(`fee_structures_initialized_${schoolId}`, 'true');
        } catch {}
        return list;
      }

      // Check local cache
      const cached = localStorage.getItem(`fee_structures_${schoolId}`);
      const isInitialized = localStorage.getItem(`fee_structures_initialized_${schoolId}`);
      
      if (cached !== null) {
        return JSON.parse(cached) as FeeStructure[];
      }

      if (isInitialized === 'true') {
        // User deliberately deleted all fee structures, do not recreate defaults
        return [];
      }

      // Seed default structures only on very first initial setup
      const seeded = DEFAULT_CBC_FEE_STRUCTURES.map((dfs) => ({
        ...dfs,
        schoolId,
        createdAt: new Date().toISOString(),
      }));

      // Cache locally
      try {
        localStorage.setItem(`fee_structures_${schoolId}`, JSON.stringify(seeded));
        localStorage.setItem(`fee_structures_initialized_${schoolId}`, 'true');
      } catch (e) {
        console.warn('Could not cache fee structures locally:', e);
      }

      // Asynchronously seed Firestore
      Promise.all(
        seeded.map((s) => setDoc(doc(db, 'schools', schoolId, 'feeStructures', s.id), cleanForFirestore(s)))
      ).catch((err) => console.warn('Could not auto-seed fee structures to Firestore:', err));

      return seeded;
    } catch (err) {
      console.error('Error fetching fee structures:', err);
      const cached = localStorage.getItem(`fee_structures_${schoolId}`);
      if (cached !== null) {
        try {
          return JSON.parse(cached) as FeeStructure[];
        } catch {}
      }
      return DEFAULT_CBC_FEE_STRUCTURES.map((dfs) => ({
        ...dfs,
        schoolId,
        createdAt: new Date().toISOString(),
      }));
    }
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

  async recordPayment(
    schoolId: string,
    paymentData: Omit<Payment, 'id' | 'schoolId' | 'receiptNumber' | 'createdAt'>
  ): Promise<Payment> {
    const colRef = collection(db, 'schools', schoolId, 'payments');
    const newDoc = doc(colRef);
    const receiptNum = `REC/${new Date().getFullYear()}/${Math.floor(10000 + Math.random() * 90000)}`;
    const now = new Date().toISOString();

    const payment: Payment = {
      ...paymentData,
      id: newDoc.id,
      schoolId,
      receiptNumber: receiptNum,
      amount: Number(paymentData.amount),
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
    const currentStudent = await studentService.getStudentById(schoolId, paymentData.studentId);
    if (currentStudent) {
      const updatedBalance = Math.max(0, (currentStudent.totalBalance || 0) - payment.amount);
      await studentService.updateStudent(schoolId, paymentData.studentId, { totalBalance: updatedBalance });
    }

    return payment;
  },
};

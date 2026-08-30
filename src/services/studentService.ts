import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Student, Parent, Staff, GradeLevel } from '../types';
import { cleanForFirestore } from '../utils/firestoreHelper';

export const studentService = {
  async getStudents(schoolId: string, options?: { classLevel?: GradeLevel; stream?: string; search?: string }): Promise<Student[]> {
    try {
      const colRef = collection(db, 'schools', schoolId, 'students');
      const snap = await getDocs(colRef);
      let list = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Student));

      if (options?.classLevel && (options.classLevel as string) !== 'ALL') {
        list = list.filter((s) => s.currentClass === options.classLevel);
      }
      if (options?.stream && options.stream !== 'ALL' && options.stream.trim() !== '') {
        const targetStream = options.stream.toLowerCase().trim();
        list = list.filter((s) => (s.stream || '').toLowerCase().trim() === targetStream);
      }
      if (options?.search) {
        const q = options.search.toLowerCase();
        list = list.filter(
          (s) =>
            s.fullName?.toLowerCase().includes(q) ||
            s.admissionNumber?.toLowerCase().includes(q) ||
            s.assessmentNumber?.toLowerCase().includes(q) ||
            s.kemisNumber?.toLowerCase().includes(q) ||
            s.upiNumber?.toLowerCase().includes(q) ||
            s.nemisNumber?.toLowerCase().includes(q) ||
            s.birthCertNumber?.toLowerCase().includes(q) ||
            s.parentPhone?.includes(q) ||
            s.parentName?.toLowerCase().includes(q)
        );
      }
      return list;
    } catch (err) {
      console.error('Error fetching students:', err);
      return [];
    }
  },

  async getStudentById(schoolId: string, studentId: string): Promise<Student | null> {
    try {
      const docRef = doc(db, 'schools', schoolId, 'students', studentId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { ...snap.data(), id: snap.id } as Student;
      }
      return null;
    } catch (err) {
      console.error('Error fetching student by ID:', err);
      return null;
    }
  },

  /**
   * Find student by admission number (case-insensitive)
   */
  async getStudentByAdmissionNumber(
    schoolId: string,
    admissionNumber: string,
    excludeStudentId?: string
  ): Promise<Student | null> {
    if (!admissionNumber || !admissionNumber.trim()) return null;
    const cleanAdm = admissionNumber.trim().toUpperCase();
    const students = await this.getStudents(schoolId);
    const match = students.find((s) => {
      if (excludeStudentId && s.id === excludeStudentId) return false;
      return s.admissionNumber?.trim().toUpperCase() === cleanAdm;
    });
    return match || null;
  },

  /**
   * Check if an admission number already exists in the school
   */
  async isAdmissionNumberRegistered(
    schoolId: string,
    admissionNumber: string,
    excludeStudentId?: string
  ): Promise<boolean> {
    const found = await this.getStudentByAdmissionNumber(schoolId, admissionNumber, excludeStudentId);
    return Boolean(found);
  },

  /**
   * Computes the next available zero-padded admission number given existing student records.
   * Format: GLC/2026/001, GLC/2026/002, etc.
   */
  formatNextAdmissionNumber(
    existingStudents: { admissionNumber?: string }[],
    prefix = 'GLC',
    academicYear = '2026'
  ): string {
    let maxSeq = 0;
    const cleanPrefix = (prefix || 'GLC').trim().toUpperCase();
    const cleanYear = (academicYear || '2026').trim();
    const targetPrefix = `${cleanPrefix}/${cleanYear}/`;

    const usedSeqs = new Set<number>();

    for (const s of existingStudents) {
      if (!s.admissionNumber) continue;
      const adm = s.admissionNumber.trim().toUpperCase();

      if (adm.startsWith(targetPrefix)) {
        const numPart = adm.substring(targetPrefix.length);
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed)) {
          usedSeqs.add(parsed);
          if (parsed > maxSeq) {
            maxSeq = parsed;
          }
        }
      } else {
        // Also check regex pattern for matching year and sequence number
        const match = adm.match(new RegExp(`^(?:${cleanPrefix}|[A-Z0-9_-]+)\\/${cleanYear}\\/(\\d+)`, 'i'));
        if (match && match[1]) {
          const parsed = parseInt(match[1], 10);
          if (!isNaN(parsed)) {
            usedSeqs.add(parsed);
            if (parsed > maxSeq) {
              maxSeq = parsed;
            }
          }
        }
      }
    }

    let nextSeq = maxSeq + 1;
    // Ensure we don't pick an already used number if there was a gap
    while (usedSeqs.has(nextSeq)) {
      nextSeq++;
    }

    const padded = String(nextSeq).padStart(3, '0');
    return `${cleanPrefix}/${cleanYear}/${padded}`;
  },

  async generateNextAdmissionNumber(
    schoolId: string,
    prefix = 'GLC',
    academicYear = '2026'
  ): Promise<string> {
    try {
      const students = await this.getStudents(schoolId);
      return this.formatNextAdmissionNumber(students, prefix, academicYear);
    } catch (err) {
      console.warn('Could not fetch students for sequence, defaulting:', err);
      return `${prefix || 'GLC'}/${academicYear || '2026'}/001`;
    }
  },

  async createStudent(schoolId: string, studentData: Omit<Student, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>): Promise<Student> {
    const colRef = collection(db, 'schools', schoolId, 'students');
    const newDoc = doc(colRef);
    const now = new Date().toISOString();

    let admNumber = studentData.admissionNumber?.trim();
    if (!admNumber) {
      admNumber = await this.generateNextAdmissionNumber(schoolId, 'GLC', '2026');
    }

    // STRICT UNIQUE ADMISSION NUMBER CHECK
    const existingStudent = await this.getStudentByAdmissionNumber(schoolId, admNumber);
    if (existingStudent) {
      throw new Error(
        `Admission number "${admNumber}" is already registered to learner "${existingStudent.fullName}" (${existingStudent.currentClass} • ${existingStudent.stream}). Please use a unique admission number.`
      );
    }

    const newStudent: Student = {
      ...studentData,
      id: newDoc.id,
      schoolId,
      admissionNumber: admNumber,
      fullName: `${studentData.firstName} ${studentData.middleName || ''} ${studentData.lastName}`.replace(/\s+/g, ' ').trim(),
      status: studentData.status || 'ACTIVE',
      totalBalance: studentData.totalBalance ?? 0,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(newDoc, cleanForFirestore(newStudent));
    return newStudent;
  },

  async updateStudent(schoolId: string, studentId: string, updates: Partial<Student>): Promise<void> {
    const docRef = doc(db, 'schools', schoolId, 'students', studentId);
    const now = new Date().toISOString();
    const cleanUpdates = { ...updates, updatedAt: now };

    // If updating admission number, ensure no other student has it
    if (updates.admissionNumber && updates.admissionNumber.trim()) {
      const trimmedAdm = updates.admissionNumber.trim();
      const duplicateStudent = await this.getStudentByAdmissionNumber(schoolId, trimmedAdm, studentId);
      if (duplicateStudent) {
        throw new Error(
          `Admission number "${trimmedAdm}" is already assigned to another learner ("${duplicateStudent.fullName}", ${duplicateStudent.currentClass}). Cannot use duplicate admission number.`
        );
      }
      cleanUpdates.admissionNumber = trimmedAdm;
    }

    if (updates.firstName || updates.lastName) {
      // Recompute full name if parts changed
      const current = await this.getStudentById(schoolId, studentId);
      if (current) {
        const fn = updates.firstName || current.firstName;
        const mn = updates.middleName !== undefined ? updates.middleName : current.middleName;
        const ln = updates.lastName || current.lastName;
        cleanUpdates.fullName = `${fn} ${mn || ''} ${ln}`.replace(/\s+/g, ' ').trim();
      }
    }
    await setDoc(docRef, cleanForFirestore(cleanUpdates), { merge: true });
  },

  async archiveStudent(schoolId: string, studentId: string, newStatus: Student['status'] = 'INACTIVE'): Promise<void> {
    await this.updateStudent(schoolId, studentId, { status: newStatus });
  },

  /**
   * Permanently delete a student record from the school directory
   */
  async deleteStudent(schoolId: string, studentId: string): Promise<void> {
    const docRef = doc(db, 'schools', schoolId, 'students', studentId);
    await deleteDoc(docRef);
  },

  /**
   * Permanently delete all student records for a school
   */
  async deleteAllStudents(schoolId: string): Promise<number> {
    const colRef = collection(db, 'schools', schoolId, 'students');
    const snap = await getDocs(colRef);
    if (snap.empty) return 0;

    const docs = snap.docs;
    const chunkSize = 400;
    for (let i = 0; i < docs.length; i += chunkSize) {
      const batch = writeBatch(db);
      const chunk = docs.slice(i, i + chunkSize);
      for (const d of chunk) {
        batch.delete(d.ref);
      }
      await batch.commit();
    }
    return docs.length;
  },

  /**
   * Permanently delete multiple selected students by ID in batch
   */
  async deleteStudentsBulk(schoolId: string, studentIds: string[]): Promise<number> {
    if (!studentIds || studentIds.length === 0) return 0;
    const chunkSize = 400;
    for (let i = 0; i < studentIds.length; i += chunkSize) {
      const batch = writeBatch(db);
      const chunk = studentIds.slice(i, i + chunkSize);
      for (const sid of chunk) {
        const docRef = doc(db, 'schools', schoolId, 'students', sid);
        batch.delete(docRef);
      }
      await batch.commit();
    }
    return studentIds.length;
  },

  /**
   * Helper to check if a student record is one of the initial handcoded sample students
   */
  isHandcodedStudent(student: Partial<Student>): boolean {
    if (!student) return false;
    const handcodedIds = ['std-01', 'std-02', 'std-03', 'std-04', 'std-05'];
    if (student.id && handcodedIds.includes(student.id)) return true;

    const handcodedAdmNos = [
      'GLC/2026/001',
      'GLC/2026/002',
      'GLC/2026/003',
      'GLC/2026/004',
      'GLC/2026/005',
      'GLCM/2026/001',
    ];
    if (
      student.admissionNumber &&
      handcodedAdmNos.includes(student.admissionNumber.trim().toUpperCase())
    ) {
      return true;
    }

    const handcodedNames = [
      'Brian Mwangi Kamau',
      'Jane Wambui Kamau',
      'Trevor Otieno Omondi',
      'Chelsea Cherop Rono',
      'Liam Zawadi Mutiso',
    ].map((n) => n.toLowerCase());

    if (student.fullName && handcodedNames.includes(student.fullName.trim().toLowerCase())) {
      return true;
    }

    return false;
  },

  /**
   * Remove all handcoded / demo sample students from the database
   */
  async purgeHandcodedStudents(schoolId: string): Promise<number> {
    const colRef = collection(db, 'schools', schoolId, 'students');
    const snap = await getDocs(colRef);
    if (snap.empty) return 0;

    const targetDocs = snap.docs.filter((d) => {
      const data = d.data() as Student;
      return this.isHandcodedStudent({ ...data, id: d.id });
    });

    if (targetDocs.length === 0) return 0;

    const batch = writeBatch(db);
    for (const d of targetDocs) {
      batch.delete(d.ref);
    }

    // Also clean up any demo invoices, payments, or results referencing std-01
    const dummyInvoiceRef = doc(db, 'schools', schoolId, 'invoices', 'inv-2026-001');
    const dummyPaymentRef = doc(db, 'schools', schoolId, 'payments', 'pay-2026-001');
    const dummyResultRef = doc(db, 'schools', schoolId, 'results', 'res-brian-math');
    batch.delete(dummyInvoiceRef);
    batch.delete(dummyPaymentRef);
    batch.delete(dummyResultRef);

    await batch.commit();
    return targetDocs.length;
  },

  async promoteStudents(schoolId: string, studentIds: string[], nextClass: GradeLevel): Promise<void> {
    for (const sid of studentIds) {
      await this.updateStudent(schoolId, sid, { currentClass: nextClass });
    }
  },
};

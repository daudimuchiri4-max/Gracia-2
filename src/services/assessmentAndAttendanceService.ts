import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AttendanceRecord, Assessment, AssessmentResult, ReportCard, CBCRating, GradeLevel } from '../types';
import { cleanForFirestore } from '../utils/firestoreHelper';

export const attendanceService = {
  async getAttendanceRecords(schoolId: string, options?: { classLevel?: GradeLevel; date?: string }): Promise<AttendanceRecord[]> {
    try {
      const snap = await getDocs(collection(db, 'schools', schoolId, 'attendance'));
      let records = snap.docs.map((d) => ({ ...d.data(), id: d.id } as AttendanceRecord));
      if (options?.classLevel) {
        records = records.filter((r) => r.classLevel === options.classLevel);
      }
      if (options?.date) {
        records = records.filter((r) => r.date === options.date);
      }
      return records;
    } catch (err) {
      console.error('Error fetching attendance:', err);
      return [];
    }
  },

  async saveAttendance(schoolId: string, record: Omit<AttendanceRecord, 'id' | 'schoolId' | 'timestamp'>): Promise<AttendanceRecord> {
    const docId = `${record.date}_${record.classLevel}_${record.stream}`.replace(/\s+/g, '_');
    const docRef = doc(db, 'schools', schoolId, 'attendance', docId);
    const fullRecord: AttendanceRecord = {
      ...record,
      id: docId,
      schoolId,
      timestamp: new Date().toISOString(),
    };
    await setDoc(docRef, cleanForFirestore(fullRecord), { merge: true });
    return fullRecord;
  },
};

export const assessmentService = {
  async getAssessments(schoolId: string, options?: { classLevel?: GradeLevel; term?: string }): Promise<Assessment[]> {
    try {
      const snap = await getDocs(collection(db, 'schools', schoolId, 'assessments'));
      let list = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Assessment));
      if (options?.classLevel) {
        list = list.filter((a) => a.classLevel === options.classLevel);
      }
      if (options?.term) {
        list = list.filter((a) => a.term === options.term);
      }
      return list;
    } catch (err) {
      console.error('Error fetching assessments:', err);
      return [];
    }
  },

  async createAssessment(schoolId: string, data: Omit<Assessment, 'id' | 'schoolId' | 'createdAt'>): Promise<Assessment> {
    const colRef = collection(db, 'schools', schoolId, 'assessments');
    const newDoc = doc(colRef);
    const newAss: Assessment = {
      ...data,
      id: newDoc.id,
      schoolId,
      createdAt: new Date().toISOString(),
    };
    await setDoc(newDoc, cleanForFirestore(newAss));
    return newAss;
  },

  async getResults(schoolId: string, options?: { assessmentId?: string; studentId?: string }): Promise<AssessmentResult[]> {
    try {
      const snap = await getDocs(collection(db, 'schools', schoolId, 'results'));
      let list = snap.docs.map((d) => ({ ...d.data(), id: d.id } as AssessmentResult));
      if (options?.assessmentId) {
        list = list.filter((r) => r.assessmentId === options.assessmentId);
      }
      if (options?.studentId) {
        list = list.filter((r) => r.studentId === options.studentId);
      }
      return list;
    } catch (err) {
      console.error('Error fetching results:', err);
      return [];
    }
  },

  calculateCBCRating(score: number, maxScore: number): CBCRating {
    const pct = (score / (maxScore || 100)) * 100;
    if (pct >= 80) return 'EE'; // Exceeding Expectations (80-100%)
    if (pct >= 60) return 'ME'; // Meeting Expectations (60-79%)
    if (pct >= 40) return 'AE'; // Approaching Expectations (40-59%)
    return 'BE'; // Below Expectations (<40%)
  },

  calculateGrade(score: number, maxScore: number): string {
    const pct = (score / (maxScore || 100)) * 100;
    if (pct >= 80) return 'A';
    if (pct >= 75) return 'A-';
    if (pct >= 70) return 'B+';
    if (pct >= 65) return 'B';
    if (pct >= 60) return 'B-';
    if (pct >= 50) return 'C+';
    if (pct >= 40) return 'C';
    if (pct >= 30) return 'D';
    return 'E';
  },

  async saveResult(schoolId: string, data: Omit<AssessmentResult, 'id' | 'schoolId' | 'updatedAt' | 'percentage' | 'grade' | 'cbcRating'>): Promise<AssessmentResult> {
    const docId = `${data.assessmentId}_${data.studentId}`.replace(/\s+/g, '_');
    const docRef = doc(db, 'schools', schoolId, 'results', docId);

    const pct = Math.round((data.score / (data.maxScore || 100)) * 100);
    const cbcRating = this.calculateCBCRating(data.score, data.maxScore);
    const grade = this.calculateGrade(data.score, data.maxScore);

    const fullResult: AssessmentResult = {
      ...data,
      id: docId,
      schoolId,
      percentage: pct,
      grade,
      cbcRating,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(docRef, cleanForFirestore(fullResult), { merge: true });
    return fullResult;
  },

  async getReportCards(schoolId: string, studentId?: string): Promise<ReportCard[]> {
    try {
      const snap = await getDocs(collection(db, 'schools', schoolId, 'reportCards'));
      let list = snap.docs.map((d) => ({ ...d.data(), id: d.id } as ReportCard));
      if (studentId) {
        list = list.filter((r) => r.studentId === studentId);
      }
      return list;
    } catch (err) {
      console.error('Error getting report cards:', err);
      return [];
    }
  },

  async saveReportCard(schoolId: string, card: Omit<ReportCard, 'id' | 'schoolId' | 'generatedAt'>): Promise<ReportCard> {
    const docId = `${card.studentId}_${card.academicYear}_${card.term}`.replace(/\s+/g, '_');
    const docRef = doc(db, 'schools', schoolId, 'reportCards', docId);
    const fullCard: ReportCard = {
      ...card,
      id: docId,
      schoolId,
      generatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, cleanForFirestore(fullCard), { merge: true });
    return fullCard;
  },
};

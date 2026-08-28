import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ClassRoom, Subject, CBCStrand, GradeLevel } from '../types';
import { cleanForFirestore } from '../utils/firestoreHelper';

export const academicService = {
  async getClasses(schoolId: string): Promise<ClassRoom[]> {
    try {
      const snap = await getDocs(collection(db, 'schools', schoolId, 'classes'));
      return snap.docs.map((d) => ({ ...d.data(), id: d.id } as ClassRoom));
    } catch (err) {
      console.error('Error fetching classes:', err);
      return [];
    }
  },

  async createClass(schoolId: string, data: Omit<ClassRoom, 'id' | 'schoolId' | 'createdAt'>): Promise<ClassRoom> {
    const colRef = collection(db, 'schools', schoolId, 'classes');
    const newDoc = doc(colRef);
    const newClass: ClassRoom = {
      ...data,
      id: newDoc.id,
      schoolId,
      createdAt: new Date().toISOString(),
    };
    await setDoc(newDoc, cleanForFirestore(newClass));
    return newClass;
  },

  async updateClass(schoolId: string, classId: string, updates: Partial<ClassRoom>): Promise<void> {
    const docRef = doc(db, 'schools', schoolId, 'classes', classId);
    await setDoc(docRef, cleanForFirestore(updates), { merge: true });
  },

  async getSubjects(schoolId: string): Promise<Subject[]> {
    try {
      const snap = await getDocs(collection(db, 'schools', schoolId, 'subjects'));
      return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Subject));
    } catch (err) {
      console.error('Error fetching subjects:', err);
      return [];
    }
  },

  async createSubject(schoolId: string, data: Omit<Subject, 'id' | 'schoolId'>): Promise<Subject> {
    const colRef = collection(db, 'schools', schoolId, 'subjects');
    const newDoc = doc(colRef);
    const newSubj: Subject = {
      ...data,
      id: newDoc.id,
      schoolId,
    };
    await setDoc(newDoc, cleanForFirestore(newSubj));
    return newSubj;
  },

  async updateSubject(schoolId: string, subjectId: string, updates: Partial<Subject>): Promise<void> {
    const docRef = doc(db, 'schools', schoolId, 'subjects', subjectId);
    await setDoc(docRef, cleanForFirestore(updates), { merge: true });
  },
};

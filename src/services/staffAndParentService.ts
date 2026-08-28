import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Staff, Parent } from '../types';
import { cleanForFirestore } from '../utils/firestoreHelper';

export const staffService = {
  async getStaff(schoolId: string): Promise<Staff[]> {
    try {
      const snap = await getDocs(collection(db, 'schools', schoolId, 'staff'));
      return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Staff));
    } catch (err) {
      console.error('Error getting staff:', err);
      return [];
    }
  },

  async createStaff(schoolId: string, data: Omit<Staff, 'id' | 'schoolId' | 'createdAt'>): Promise<Staff> {
    const colRef = collection(db, 'schools', schoolId, 'staff');
    const newDoc = doc(colRef);
    const newStaff: Staff = {
      ...data,
      id: newDoc.id,
      schoolId,
      createdAt: new Date().toISOString(),
    };
    await setDoc(newDoc, cleanForFirestore(newStaff));
    return newStaff;
  },

  async updateStaff(schoolId: string, staffId: string, updates: Partial<Staff>): Promise<void> {
    const docRef = doc(db, 'schools', schoolId, 'staff', staffId);
    await setDoc(docRef, cleanForFirestore(updates), { merge: true });
  },

  async deleteStaff(schoolId: string, staffId: string): Promise<void> {
    await deleteDoc(doc(db, 'schools', schoolId, 'staff', staffId));
  },
};

export const parentService = {
  async getParents(schoolId: string): Promise<Parent[]> {
    try {
      const snap = await getDocs(collection(db, 'schools', schoolId, 'parents'));
      return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Parent));
    } catch (err) {
      console.error('Error getting parents:', err);
      return [];
    }
  },

  async getParentById(schoolId: string, parentId: string): Promise<Parent | null> {
    try {
      const docRef = doc(db, 'schools', schoolId, 'parents', parentId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { ...snap.data(), id: snap.id } as Parent;
      }
      return null;
    } catch (err) {
      console.error('Error getting parent by id:', err);
      return null;
    }
  },

  async createParent(schoolId: string, data: Omit<Parent, 'id' | 'schoolId' | 'createdAt'>): Promise<Parent> {
    const colRef = collection(db, 'schools', schoolId, 'parents');
    const newDoc = doc(colRef);
    const newParent: Parent = {
      ...data,
      id: newDoc.id,
      schoolId,
      createdAt: new Date().toISOString(),
    };
    await setDoc(newDoc, cleanForFirestore(newParent));
    return newParent;
  },

  async updateParent(schoolId: string, parentId: string, updates: Partial<Parent>): Promise<void> {
    const docRef = doc(db, 'schools', schoolId, 'parents', parentId);
    await setDoc(docRef, cleanForFirestore(updates), { merge: true });
  },
};

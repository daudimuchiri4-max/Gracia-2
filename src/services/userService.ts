import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';
import { cleanForFirestore } from '../utils/firestoreHelper';
import { DEFAULT_SCHOOL_ID } from './schoolService';

export interface CreateUserData {
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  schoolId?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  staffId?: string;
  parentId?: string;
  studentId?: string;
  avatarUrl?: string;
  tempPassword?: string;
}

export const SAMPLE_USERS: CreateUserData[] = [
  {
    fullName: 'Mwalimu Daudi Muchiri',
    email: 'daudimuchiri4@gmail.com',
    phone: '+254 712 345 678',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    fullName: 'Dr. Beatrice Wanjiru Njeri',
    email: 'principal@glcm.ac.ke',
    phone: '+254 722 100 200',
    role: 'HEADTEACHER',
    status: 'ACTIVE',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  },
  {
    fullName: 'Mwalimu George Omondi',
    email: 'deputy@glcm.ac.ke',
    phone: '+254 733 456 789',
    role: 'DEPUTY_HEADTEACHER',
    status: 'ACTIVE',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    fullName: 'Madam Catherine Mutua',
    email: 'cmutua@glcm.ac.ke',
    phone: '+254 711 987 654',
    role: 'TEACHER',
    status: 'ACTIVE',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  },
  {
    fullName: 'Mr. Patrick Kiprop',
    email: 'accounts@glcm.ac.ke',
    phone: '+254 720 334 455',
    role: 'ACCOUNTANT',
    status: 'ACTIVE',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  },
  {
    fullName: 'Faith Chebet',
    email: 'reception@glcm.ac.ke',
    phone: '+254 728 556 677',
    role: 'RECEPTIONIST',
    status: 'ACTIVE',
    avatarUrl: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80',
  },
  {
    fullName: 'Sister Grace Achieng',
    email: 'clinic@glcm.ac.ke',
    phone: '+254 714 889 900',
    role: 'NURSE',
    status: 'ACTIVE',
    avatarUrl: 'https://images.unsplash.com/photo-1594824813589-3221b2123512?w=150&auto=format&fit=crop&q=80',
  },
  {
    fullName: 'Kennedy Maina',
    email: 'transport@glcm.ac.ke',
    phone: '+254 725 678 123',
    role: 'TRANSPORT_MANAGER',
    status: 'ACTIVE',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
  },
  {
    fullName: 'Esther Mwangi (Guardian)',
    email: 'parent.mwangi@gmail.com',
    phone: '+254 718 901 234',
    role: 'PARENT',
    status: 'ACTIVE',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  },
  {
    fullName: 'Ryan Mwangi (Student)',
    email: 'ryan.mwangi@students.glcm.ac.ke',
    phone: '+254 718 901 234',
    role: 'STUDENT',
    status: 'ACTIVE',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  },
];

export const userService = {
  /**
   * Fetch all user profiles from Firestore
   */
  async getUsers(schoolId: string = DEFAULT_SCHOOL_ID): Promise<UserProfile[]> {
    try {
      const colRef = collection(db, 'users');
      const snap = await getDocs(colRef);
      if (snap.empty) {
        return [];
      }
      const users = snap.docs.map((d) => ({ ...d.data(), id: d.id } as UserProfile));
      
      // Return sorted by creation date or full name
      return users.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
    } catch (err) {
      console.error('Error fetching users from Firestore:', err);
      return [];
    }
  },

  /**
   * Get single user by ID
   */
  async getUserById(userId: string): Promise<UserProfile | null> {
    try {
      const docRef = doc(db, 'users', userId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { ...snap.data(), id: snap.id } as UserProfile;
      }
      return null;
    } catch (err) {
      console.error(`Error fetching user ${userId}:`, err);
      return null;
    }
  },

  /**
   * Create a new user profile in Firestore
   */
  async createUser(data: CreateUserData): Promise<UserProfile> {
    const colRef = collection(db, 'users');
    const newDoc = doc(colRef);
    const id = newDoc.id;

    const email = (data.email || '').trim().toLowerCase();
    const isSuper =
      data.role === 'SUPER_ADMIN' ||
      email === 'daudimuchiri4@gmail.com' ||
      email.includes('superadmin');

    const newUser: UserProfile = {
      id,
      email: email,
      fullName: data.fullName.trim(),
      phone: data.phone?.trim() || undefined,
      role: isSuper ? 'SUPER_ADMIN' : data.role,
      schoolId: data.schoolId || DEFAULT_SCHOOL_ID,
      avatarUrl: data.avatarUrl || undefined,
      status: data.status || 'ACTIVE',
      staffId: data.staffId || undefined,
      parentId: data.parentId || undefined,
      studentId: data.studentId || undefined,
      createdAt: new Date().toISOString(),
    };

    await setDoc(newDoc, cleanForFirestore(newUser));
    return newUser;
  },

  /**
   * Update existing user profile
   */
  async updateUser(userId: string, updates: Partial<UserProfile>): Promise<void> {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, cleanForFirestore(updates));
  },

  /**
   * Delete a user profile
   */
  async deleteUser(userId: string): Promise<void> {
    const docRef = doc(db, 'users', userId);
    await deleteDoc(docRef);
  },

  /**
   * Toggle user account active / suspended status
   */
  async toggleUserStatus(
    userId: string,
    currentStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  ): Promise<'ACTIVE' | 'INACTIVE' | 'SUSPENDED'> {
    const nextStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' =
      currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    await this.updateUser(userId, { status: nextStatus });
    return nextStatus;
  },

  /**
   * Seed standard school users into Firestore for quick demo & testing
   */
  async seedDemoUsers(schoolId: string = DEFAULT_SCHOOL_ID): Promise<UserProfile[]> {
    const created: UserProfile[] = [];
    for (const sample of SAMPLE_USERS) {
      try {
        const user = await this.createUser({
          ...sample,
          schoolId,
        });
        created.push(user);
      } catch (e) {
        console.warn(`Could not seed user ${sample.fullName}:`, e);
      }
    }
    return created;
  },
};

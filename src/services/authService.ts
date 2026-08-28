import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';
import { DEFAULT_SCHOOL_ID } from './schoolService';
import { cleanForFirestore } from '../utils/firestoreHelper';

export const authService = {
  async loginWithGoogle(): Promise<UserProfile> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(auth, provider);
    const user = cred.user;
    const docRef = doc(db, 'users', user.uid);
    const snap = await getDoc(docRef);

    const email = (user.email || '').toLowerCase();
    const isSuperAdmin =
      email === 'daudimuchiri4@gmail.com' ||
      email.includes('superadmin') ||
      email.includes('daudi');

    if (snap.exists()) {
      const existing = snap.data() as UserProfile;
      if (isSuperAdmin && existing.role !== 'SUPER_ADMIN') {
        const updated = { ...existing, role: 'SUPER_ADMIN' as UserRole };
        await setDoc(docRef, cleanForFirestore(updated), { merge: true });
        return updated;
      }
      return existing;
    }

    const newProfile: UserProfile = {
      id: user.uid,
      email: user.email || '',
      fullName: user.displayName || email.split('@')[0] || 'User',
      role: isSuperAdmin ? 'SUPER_ADMIN' : 'SCHOOL_ADMIN',
      schoolId: DEFAULT_SCHOOL_ID,
      avatarUrl: user.photoURL || undefined,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
    await setDoc(docRef, cleanForFirestore(newProfile));
    return newProfile;
  },

  async loginAnonymously(): Promise<FirebaseUser | null> {
    try {
      const res = await signInAnonymously(auth);
      return res.user;
    } catch (err) {
      console.warn('Anonymous auth sign-in notice:', err);
      return null;
    }
  },

  async register(
    email: string,
    pass: string,
    fullName: string,
    role: UserRole = 'SCHOOL_ADMIN',
    schoolId: string = DEFAULT_SCHOOL_ID
  ): Promise<UserProfile> {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const userProfile: UserProfile = {
      id: cred.user.uid,
      email,
      fullName,
      role,
      schoolId,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', cred.user.uid), userProfile);
    return userProfile;
  },

  async login(email: string, pass: string): Promise<UserProfile> {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const docRef = doc(db, 'users', cred.user.uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    // Auto-create default user profile if none exists
    const newProfile: UserProfile = {
      id: cred.user.uid,
      email: cred.user.email || email,
      fullName: cred.user.displayName || email.split('@')[0],
      role: email.includes('admin') ? 'SCHOOL_ADMIN' : 'TEACHER',
      schoolId: DEFAULT_SCHOOL_ID,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
    await setDoc(docRef, newProfile);
    return newProfile;
  },

  async logout(): Promise<void> {
    await signOut(auth);
  },

  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  },

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        return snap.data() as UserProfile;
      }
      return null;
    } catch (err) {
      console.error('Error fetching user profile:', err);
      return null;
    }
  },

  async updateUserRole(uid: string, newRole: UserRole, schoolId?: string): Promise<void> {
    const ref = doc(db, 'users', uid);
    const updates: Partial<UserProfile> = { role: newRole };
    if (schoolId) updates.schoolId = schoolId;
    await updateDoc(ref, updates);
  },

  onAuthStateChange(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  },
};

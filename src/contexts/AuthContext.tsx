import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { authService } from '../services/authService';
import { schoolService, DEFAULT_SCHOOL_ID, DEFAULT_SCHOOL } from '../services/schoolService';
import { UserProfile, UserRole, School } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  school: School | null;
  activeRole: UserRole;
  loading: boolean;
  setActiveRole: (role: UserRole) => void;
  switchRole: (role: UserRole) => void;
  setSchool: (school: School) => void;
  switchSchool: (schoolId: string) => Promise<void>;
  refreshSchool: () => Promise<void>;
  reloadSchoolData: () => Promise<void>;
  seedDemoData: () => Promise<void>;
  login: (email: string, pass: string) => Promise<UserProfile>;
  loginWithGoogle: () => Promise<UserProfile>;
  register: (email: string, pass: string, fullName: string, role?: UserRole, schoolId?: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('glc_user');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [school, setSchool] = useState<School | null>(DEFAULT_SCHOOL);
  const [activeRole, setActiveRole] = useState<UserRole>(() => {
    try {
      const saved = localStorage.getItem('glc_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.role) return parsed.role;
      }
    } catch {}
    return 'SCHOOL_ADMIN';
  });
  const [loading, setLoading] = useState<boolean>(true);

  const updateAndPersistUser = (profile: UserProfile | null) => {
    setUser(profile);
    if (profile) {
      setActiveRole(profile.role);
      try {
        localStorage.setItem('glc_user', JSON.stringify(profile));
      } catch {}
    } else {
      try {
        localStorage.removeItem('glc_user');
      } catch {}
    }
  };

  // Initialize Default School and Auth state
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const sch = await schoolService.ensureDefaultSchool();
        if (mounted && sch) {
          setSchool(sch);
        }
      } catch (err) {
        console.error('Init school error:', err);
      }
    }
    init();

    const unsubscribe = authService.onAuthStateChange(async (fUser) => {
      setFirebaseUser(fUser);
      if (fUser && !fUser.isAnonymous) {
        let profile = await authService.getUserProfile(fUser.uid);
        if (profile && mounted) {
          updateAndPersistUser(profile);
        }
      } else {
        // Sign in anonymously in background so Firestore rules with authentication pass seamlessly
        authService.loginAnonymously().catch(() => {});

        // If no user is currently saved in localStorage, provide default admin profile
        const existingLocalUser = localStorage.getItem('glc_user');
        if (!existingLocalUser && mounted) {
          const defaultAdminProfile: UserProfile = {
            id: 'demo-admin-id',
            email: 'admin@gracia.ac.ke',
            fullName: 'Dr. Grace Wanjiku (Administrator)',
            role: 'SCHOOL_ADMIN',
            schoolId: DEFAULT_SCHOOL_ID,
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
          };
          updateAndPersistUser(defaultAdminProfile);
        }
      }
      if (mounted) setLoading(false);
    });

    const handleSchoolUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<School>;
      if (customEvent.detail) {
        setSchool(customEvent.detail);
      }
    };
    window.addEventListener('school_data_updated', handleSchoolUpdated);

    return () => {
      mounted = false;
      unsubscribe();
      window.removeEventListener('school_data_updated', handleSchoolUpdated);
    };
  }, []);

  const switchRole = (role: UserRole) => {
    setActiveRole(role);
    if (user) {
      const updated = { ...user, role };
      updateAndPersistUser(updated);
    }
  };

  const refreshSchool = async () => {
    if (!school?.id) return;
    const updated = await schoolService.getSchool(school.id);
    if (updated) setSchool(updated);
  };

  const reloadSchoolData = async () => {
    await refreshSchool();
  };

  const switchSchool = async (schoolId: string) => {
    setLoading(true);
    try {
      const sch = await schoolService.getSchool(schoolId);
      if (sch) {
        setSchool(sch);
        if (user) {
          const updated = { ...user, schoolId };
          updateAndPersistUser(updated);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const seedDemoData = async () => {
    setLoading(true);
    try {
      const currentSchoolId = school?.id || DEFAULT_SCHOOL_ID;
      await schoolService.seedRealisticSchoolData(currentSchoolId);
      await refreshSchool();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, pass: string) => {
    const profile = await authService.login(email, pass);
    updateAndPersistUser(profile);
    if (profile.schoolId) {
      await switchSchool(profile.schoolId);
    }
    return profile;
  };

  const loginWithGoogle = async () => {
    const profile = await authService.loginWithGoogle();
    updateAndPersistUser(profile);
    if (profile.schoolId) {
      await switchSchool(profile.schoolId);
    }
    return profile;
  };

  const register = async (email: string, pass: string, fullName: string, role: UserRole = 'SCHOOL_ADMIN', schoolId = DEFAULT_SCHOOL_ID) => {
    const profile = await authService.register(email, pass, fullName, role, schoolId);
    updateAndPersistUser(profile);
    await switchSchool(schoolId);
    return profile;
  };

  const logout = async () => {
    await authService.logout();
    updateAndPersistUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        school,
        activeRole,
        loading,
        setActiveRole,
        switchRole,
        setSchool,
        switchSchool,
        refreshSchool,
        reloadSchoolData,
        seedDemoData,
        login,
        loginWithGoogle,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

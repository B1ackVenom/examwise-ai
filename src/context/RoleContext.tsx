import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { apiClient } from '../services/apiClient';

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: UserProfile;
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department: string;
  institution: string;
  roleLabel: string;
  semester?: string;
  specialization?: string;
  accentColor?: string;
}

interface RoleContextType {
  isAuthenticated: boolean;
  role: UserRole;
  user: UserProfile | null;
  profiles: UserProfile[];
  login: (email: string, password: string) => AuthResult;
  signup: (data: SignupInput) => AuthResult;
  logout: () => void;
  selectProfile: (profileId: string) => void;
  createProfile: (data: Omit<UserProfile, 'id'>) => UserProfile;
  updateProfile: (profileId: string, updates: Partial<UserProfile>) => void;
  deleteProfile: (profileId: string) => void;
}

const PROFILES_STORAGE_KEY = 'examwise_profiles_v2';
const AUTH_STORAGE_KEY = 'examwise_auth_profile_id_v2';
const LEGACY_CLEANUP_KEY = 'examwise_legacy_cleared_v2';

// Strictly 1 teacher mock profile and 1 student mock profile
export const INITIAL_PROFILES: UserProfile[] = [
  {
    id: 'user-tch-01',
    name: 'Dr. Elena Mercer',
    email: 'teacher@examwise.edu',
    password: 'password123',
    avatar: '',
    role: 'teacher',
    department: 'Computer Science',
    institution: 'ExamWise Academy',
    roleLabel: 'Faculty Examiner',
    accentColor: '#1f60f0',
    specialization: 'Curriculum & Assessment',
  },
  {
    id: 'user-std-01',
    name: 'Alex Morgan',
    email: 'student@examwise.edu',
    password: 'password123',
    avatar: '',
    role: 'student',
    department: 'Computer Science',
    institution: 'ExamWise Academy',
    roleLabel: 'Student',
    semester: 'Semester VI',
    accentColor: '#0d9488',
    specialization: 'Undergraduate Track',
  },
];

// Clear old seeded demo keys once on upgrade so no leftover mock data persists
function runOneTimeLegacyCleanup() {
  try {
    if (!localStorage.getItem(LEGACY_CLEANUP_KEY)) {
      const legacyKeys = [
        'examwise_profiles_list',
        'examwise_active_profile_id',
        'examwise_role',
        'examwise_subject_notebooks',
        'examwise_courses',
        'examwise_modules',
        'examwise_resources',
        'examwise_important_questions',
        'examwise_practice_papers',
        'examwise_exams',
        'examwise_submissions',
        'examwise_marksheet_batches',
        'examwise_published_results',
      ];
      legacyKeys.forEach((key) => localStorage.removeItem(key));
      localStorage.setItem(LEGACY_CLEANUP_KEY, '1');
    }
  } catch {
    // ignore storage errors
  }
}

runOneTimeLegacyCleanup();

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profiles, setProfiles] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem(PROFILES_STORAGE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // fallback to initial 2 profiles
    }
    return INITIAL_PROFILES;
  });

  const [activeProfileId, setActiveProfileId] = useState<string | null>(() => {
    try {
      const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedAuth) {
        return savedAuth;
      }
    } catch {
      // unauthenticated by default
    }
    return null;
  });

  const currentUser = activeProfileId
    ? profiles.find((p) => p.id === activeProfileId) || null
    : null;
  const isAuthenticated = Boolean(currentUser);
  const currentRole: UserRole = currentUser ? currentUser.role : 'student';

  useEffect(() => {
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(AUTH_STORAGE_KEY, currentUser.id);
      // Synchronize backend data on session restore
      apiClient.syncFromBackend().catch(() => {});
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [currentUser]);

  const login = (email: string, password: string): AuthResult => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      return { success: false, error: 'Please enter both email and password.' };
    }
    const match = profiles.find((p) => p.email.toLowerCase() === normalizedEmail);
    if (!match) {
      return { success: false, error: 'No account found for that email address.' };
    }
    if ((match.password || '') !== password) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }
    setActiveProfileId(match.id);

    // Asynchronously authenticate against FastAPI backend and sync data
    apiClient
      .loginApi(normalizedEmail, password)
      .then((tokenRes) => {
        if (tokenRes?.access_token) {
          apiClient.syncFromBackend();
        }
      })
      .catch((err) => {
        console.warn('Backend login sync error:', err);
      });

    return { success: true, user: match };
  };

  const signup = (data: SignupInput): AuthResult => {
    const normalizedEmail = data.email.trim().toLowerCase();
    if (!data.name.trim() || !normalizedEmail || !data.password) {
      return { success: false, error: 'Name, email, and password are required.' };
    }
    if (data.password.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters.' };
    }
    if (profiles.some((p) => p.email.toLowerCase() === normalizedEmail)) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    const newProfile: UserProfile = {
      id: `user-${data.role.slice(0, 3)}-${Date.now()}`,
      name: data.name.trim(),
      email: data.email.trim(),
      password: data.password,
      avatar: '',
      role: data.role,
      department: data.department.trim() || 'General',
      institution: data.institution.trim() || 'Academic Institution',
      roleLabel: data.roleLabel.trim() || (data.role === 'teacher' ? 'Faculty' : 'Student'),
      semester: data.role === 'student' ? data.semester?.trim() || '' : undefined,
      specialization: data.specialization?.trim() || '',
      accentColor: data.accentColor || (data.role === 'teacher' ? '#1f60f0' : '#0d9488'),
      isCustom: true,
    };

    setProfiles((prev) => [...prev, newProfile]);
    setActiveProfileId(newProfile.id);

    // Asynchronously register on FastAPI backend
    apiClient
      .signupApi({
        email: normalizedEmail,
        password: data.password,
        full_name: data.name.trim(),
        role: data.role,
      })
      .then((tokenRes) => {
        if (tokenRes?.access_token) {
          apiClient.syncFromBackend();
        }
      })
      .catch((err) => {
        console.warn('Backend signup sync error:', err);
      });

    return { success: true, user: newProfile };
  };

  const logout = () => {
    setActiveProfileId(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    apiClient.logoutApi().catch(() => {});
  };

  // Only allow switching to a profile within the SAME workspace role
  const selectProfile = (profileId: string) => {
    const target = profiles.find((p) => p.id === profileId);
    if (!target) return;
    if (currentUser && target.role !== currentUser.role) {
      return;
    }
    setActiveProfileId(target.id);
  };

  const createProfile = (data: Omit<UserProfile, 'id'>): UserProfile => {
    const enforcedRole = currentUser ? currentUser.role : data.role;
    const newId = `user-${enforcedRole.slice(0, 3)}-${Date.now()}`;
    const newProfile: UserProfile = {
      ...data,
      role: enforcedRole,
      id: newId,
      isCustom: true,
      avatar: '',
    };

    setProfiles((prev) => [...prev, newProfile]);
    setActiveProfileId(newProfile.id);
    return newProfile;
  };

  const updateProfile = (profileId: string, updates: Partial<UserProfile>) => {
    setProfiles((prev) =>
      prev.map((p) => (p.id === profileId ? { ...p, ...updates } : p))
    );
  };

  const deleteProfile = (profileId: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== profileId));
    if (activeProfileId === profileId) {
      setActiveProfileId(null);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  };

  return (
    <RoleContext.Provider
      value={{
        isAuthenticated,
        role: currentRole,
        user: currentUser,
        profiles,
        login,
        signup,
        logout,
        selectProfile,
        createProfile,
        updateProfile,
        deleteProfile,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserProfile, UserType } from '../types';
import apiService from '../services/api';
import { 
  loginWithFirebaseAuth, 
  registerWithFirebaseAuth, 
  logoutFromFirebaseAuth, 
  requestPasswordReset 
} from '../services/firebase';

export interface RegisterFormData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  dateOfBirth: string;
  userType: UserType;
}

interface AuthContextType {
  userProfile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isMinor: boolean;
  hasGuardian: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (data: RegisterFormData) => Promise<UserProfile>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize session on mount
  useEffect(() => {
    const token = localStorage.getItem('safesphere_auth_token');
    if (token) {
      apiService.getCurrentUserProfile()
        .then((profile) => setUserProfile(profile))
        .catch(() => {
          localStorage.removeItem('safesphere_auth_token');
          setUserProfile(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const refreshProfile = async (): Promise<UserProfile | null> => {
    try {
      const profile = await apiService.getCurrentUserProfile();
      setUserProfile(profile);
      return profile;
    } catch {
      return null;
    }
  };

  const login = async (email: string, password: string): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      // 1. Authenticate with Firebase (returns UID & stores token)
      await loginWithFirebaseAuth(email, password);

      // 2. Fetch PostgreSQL user profile from FastAPI backend
      const profile = await apiService.getCurrentUserProfile();
      setUserProfile(profile);
      return profile;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterFormData): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      // 1. Create Firebase Auth credential
      const firebaseUid = await registerWithFirebaseAuth(data.email, data.password);

      // 2. Post registration payload to FastAPI PostgreSQL backend
      const profile = await apiService.registerUserProfile({
        firebase_uid: firebaseUid,
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
        date_of_birth: data.dateOfBirth,
        user_type: data.userType,
      });

      setUserProfile(profile);
      return profile;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await logoutFromFirebaseAuth();
      localStorage.removeItem('safesphere_auth_token');
      setUserProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    await requestPasswordReset(email);
  };

  const isMinor = Boolean(userProfile?.is_minor);
  const hasGuardian = Boolean(userProfile?.has_guardian || userProfile?.guardian);

  return (
    <AuthContext.Provider
      value={{
        userProfile,
        isAuthenticated: Boolean(userProfile),
        isLoading,
        isMinor,
        hasGuardian,
        login,
        register,
        logout,
        resetPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

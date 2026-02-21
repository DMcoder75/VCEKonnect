import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile } from '@/types';
import {
  loginUser,
  registerUser,
  getCurrentUser,
  updateUserProfile,
  logoutUser,
} from '@/services/authService';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ success: boolean }>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    console.log('🔐 AuthContext: Loading user...');
    setIsLoading(true);
    const currentUser = await getCurrentUser();
    console.log('🔐 AuthContext: User loaded:', currentUser ? `ID: ${currentUser.id}` : 'No user');
    setUser(currentUser);
    setIsLoading(false);
  }

  async function login(email: string, password: string) {
    console.log('🔐 AuthContext: Logging in...');
    const { user: loggedInUser, error } = await loginUser(email, password);
    if (error) {
      throw new Error(error);
    }
    console.log('🔐 AuthContext: Login successful:', loggedInUser?.id);
    setUser(loggedInUser);
  }

  async function register(email: string, password: string, name: string) {
    console.log('🔐 AuthContext: Registering...');
    const { user: newUser, error } = await registerUser(email, password, name);
    if (error) {
      alert(error);
      return;
    }
    console.log('🔐 AuthContext: Registration successful:', newUser?.id);
    setUser(newUser);
  }

  async function updateProfile(updates: Partial<UserProfile>) {
    if (!user) return { success: false };
    const { error } = await updateUserProfile(user.id, updates);
    if (error) {
      throw new Error(error);
    }
    // Reload user to get fresh data from database
    await loadUser();
    return { success: true };
  }

  async function logout() {
    console.log('🔐 AuthContext: Logging out...');
    await logoutUser();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        updateProfile,
        logout,
        loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

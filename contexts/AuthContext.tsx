import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile } from '@/types';
import {
  loginUser,
  registerUser,
  getCurrentUser,
  updateUserProfile,
  logoutUser,
} from '@/services/authService';
import { getUserSubjects } from '@/services/userSubjectsService';
import { getSubjectsByState, VCESubject, getAllStates, AustralianState } from '@/services/vceSubjectsService';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  // Cached data
  userSubjects: VCESubject[];
  allStateSubjects: VCESubject[];
  allStates: AustralianState[];
  // Methods
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ success: boolean }>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  refreshSubjects: () => Promise<void>; // New: refresh subjects cache
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userSubjects, setUserSubjects] = useState<VCESubject[]>([]);
  const [allStateSubjects, setAllStateSubjects] = useState<VCESubject[]>([]);
  const [allStates, setAllStates] = useState<AustralianState[]>([]);

  useEffect(() => {
    loadUser();
  }, []);

  // Load subjects when user changes
  // Load states once on mount (static data)
  useEffect(() => {
    loadStates();
  }, []);

  // Load subjects when user changes
  useEffect(() => {
    if (user) {
      refreshSubjects();
    } else {
      // Clear cache on logout
      setUserSubjects([]);
      setAllStateSubjects([]);
    }
  }, [user?.id]);

  async function loadStates() {
    console.log('🌏 AuthContext: Loading states...');
    const states = await getAllStates();
    console.log('🌏 AuthContext: Loaded', states.length, 'states');
    setAllStates(states);
  }

  async function loadUser() {
    console.log('🔐 AuthContext: Loading user...');
    setIsLoading(true);
    const currentUser = await getCurrentUser();
    console.log('🔐 AuthContext: User loaded:', currentUser ? `ID: ${currentUser.id}` : 'No user');
    setUser(currentUser);
    setIsLoading(false);
  }

  async function refreshSubjects() {
    if (!user) return;
    
    console.log('📚 AuthContext: Refreshing subjects cache...');
    const userStateId = user.state_id || 'vic';
    
    // Load both user's selected subjects AND all subjects for their state (in parallel)
    const [selectedSubjects, stateSubjects] = await Promise.all([
      getUserSubjects(user.id),
      getSubjectsByState(userStateId)
    ]);
    
    console.log('📚 AuthContext: Cached', selectedSubjects.length, 'user subjects,', stateSubjects.length, 'state subjects');
    setUserSubjects(selectedSubjects);
    setAllStateSubjects(stateSubjects);
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
    // Refresh subjects cache if state changed
    if (updates.state_id) {
      await refreshSubjects();
    }
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
        userSubjects,
        allStateSubjects,
        allStates,
        login,
        register,
        updateProfile,
        logout,
        loadUser,
        refreshSubjects,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

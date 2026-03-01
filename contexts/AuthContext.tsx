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
import { updateUserAppVersion } from '@/services/versionTrackingService';
import { 
  cacheUserProfile, 
  getCachedUserProfile, 
  cacheUserSubjects, 
  getCachedUserSubjects,
  cacheStateSubjects,
  getCachedStateSubjects,
  clearAllCache,
} from '@/services/offlineCache';

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
    
    // Try to load from cache first (offline support)
    const cachedUser = await getCachedUserProfile();
    if (cachedUser) {
      console.log('📦 AuthContext: Using cached user (offline mode)');
      setUser(cachedUser);
      // Load cached subjects too
      const cachedUserSubjects = await getCachedUserSubjects();
      const cachedStateSubjects = await getCachedStateSubjects();
      setUserSubjects(cachedUserSubjects);
      setAllStateSubjects(cachedStateSubjects);
    }
    
    // Try to fetch fresh data from network
    try {
      const currentUser = await getCurrentUser();
      console.log('🔐 AuthContext: User loaded:', currentUser ? `ID: ${currentUser.id}` : 'No user');
      
      if (currentUser) {
        setUser(currentUser);
        // Cache the fresh user data
        await cacheUserProfile(currentUser);
        
        // Track app version on session restore
        updateUserAppVersion(currentUser.id).catch(err => 
          console.warn('Failed to track version on session restore:', err)
        );
      } else {
        // No valid session - clear everything and force login
        console.log('🔐 AuthContext: No valid session -> clearing cache and forcing login');
        setUser(null);
        await clearAllCache();
      }
    } catch (error) {
      console.error('❌ AuthContext: Failed to load user from network, using cache:', error);
      // Network failed - keep cached user for offline mode (only if we had one)
      if (!cachedUser) {
        setUser(null);
      }
    }
    
    setIsLoading(false);
  }

  async function refreshSubjects() {
    if (!user) return;
    
    console.log('📚 AuthContext: Refreshing subjects cache...');
    // CRITICAL: Do NOT default to 'vic' - this overwrites user's actual state
    const userStateId = user.state_id;
    
    if (!userStateId) {
      console.error('❌ AuthContext: User has no state_id! Skipping subject load.');
      return;
    }
    
    try {
      // Load both user's selected subjects AND all subjects for their state (in parallel)
      const [selectedSubjects, stateSubjects] = await Promise.all([
        getUserSubjects(user.id),
        getSubjectsByState(userStateId)
      ]);
      
      console.log('📚 AuthContext: Cached', selectedSubjects.length, 'user subjects,', stateSubjects.length, 'state subjects');
      setUserSubjects(selectedSubjects);
      setAllStateSubjects(stateSubjects);
      
      // Cache for offline use
      await cacheUserSubjects(selectedSubjects);
      await cacheStateSubjects(stateSubjects);
    } catch (error) {
      console.error('❌ AuthContext: Failed to load subjects from network:', error);
      // Fallback to cached subjects
      const cachedUserSubjects = await getCachedUserSubjects();
      const cachedStateSubjects = await getCachedStateSubjects();
      console.log('📦 AuthContext: Using cached subjects (offline mode)');
      setUserSubjects(cachedUserSubjects);
      setAllStateSubjects(cachedStateSubjects);
    }
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
    // Clear all cached data
    await clearAllCache();
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

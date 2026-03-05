import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile } from '@/types';
import {
  loginUser,
  registerUser,
  verifyEmail,
  getCurrentUser,
  updateUserProfile,
  logoutUser,
} from '@/services/authService';
import { getUserSubjects } from '@/services/userSubjectsService';
import { getSubjectsByState, VCESubject, getAllStates, AustralianState } from '@/services/vceSubjectsService';
import { updateUserAppVersion } from '@/services/versionTrackingService';
import { 
  initDatabase,
  saveUserProfile,
  getUserProfile,
  saveUserSubjects,
  getUserSubjects as getOfflineUserSubjects,
  clearAllData,
} from '@/services/offlineDatabase';
import { checkConnection } from '@/services/networkService';

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
  verify: (email: string, code: string) => Promise<void>;
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
    // Initialize database first
    initDatabase()
      .then(() => {
        console.log('✅ Database initialized successfully');
        loadUser();
      })
      .catch(err => {
        console.error('❌ Failed to init database:', err);
        // Force loading to false if init fails
        setIsLoading(false);
        loadUser(); // Try to load anyway
      });
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
    
    try {
      // Try to load from SQLite first (offline support)
      const cachedUser = await getUserProfile();
      if (cachedUser) {
        console.log('📦 AuthContext: Using cached user from SQLite (offline mode)');
        setUser(cachedUser);
        // Load cached subjects too
        const cachedUserSubjects = await getOfflineUserSubjects();
        setUserSubjects(cachedUserSubjects);
      }
      
      // Check network connection
      const hasConnection = await checkConnection();
      
      if (hasConnection) {
        // Try to fetch fresh data from network
        try {
          const currentUser = await getCurrentUser();
          console.log('🔐 AuthContext: User loaded:', currentUser ? `ID: ${currentUser.id}` : 'No user');
          
          if (currentUser) {
            setUser(currentUser);
            // Save to SQLite for offline use
            await saveUserProfile(currentUser);
            
            // Track app version on session restore
            updateUserAppVersion(currentUser.id).catch(err => 
              console.warn('Failed to track version on session restore:', err)
            );
          } else {
            // No valid session - clear everything and force login
            console.log('🔐 AuthContext: No valid session -> clearing cache and forcing login');
            setUser(null);
            await clearAllData();
          }
        } catch (error) {
          console.error('❌ AuthContext: Failed to load user from network, using SQLite cache:', error);
          // Network failed - keep cached user for offline mode (only if we had one)
          if (!cachedUser) {
            setUser(null);
          }
        }
      } else {
        console.log('📡 AuthContext: No network - using offline data');
      }
    } catch (error) {
      console.error('❌ AuthContext: Critical error in loadUser:', error);
      setUser(null);
    } finally {
      // ALWAYS set loading to false, even if errors occur
      setIsLoading(false);
    }
  }

  async function refreshSubjects() {
    if (!user) return;
    
    console.log('📚 AuthContext: Refreshing subjects cache...');
    const userStateId = user.state_id;
    
    if (!userStateId) {
      console.error('❌ AuthContext: User has no state_id! Skipping subject load.');
      return;
    }
    
    // Check network connection
    const hasConnection = await checkConnection();
    
    if (hasConnection) {
      try {
        // Load both user's selected subjects AND all subjects for their state (in parallel)
        const [selectedSubjects, stateSubjects] = await Promise.all([
          getUserSubjects(user.id),
          getSubjectsByState(userStateId)
        ]);
        
        console.log('📚 AuthContext: Cached', selectedSubjects.length, 'user subjects,', stateSubjects.length, 'state subjects');
        setUserSubjects(selectedSubjects);
        setAllStateSubjects(stateSubjects);
        
        // Save to SQLite for offline use
        await saveUserSubjects(selectedSubjects);
      } catch (error) {
        console.error('❌ AuthContext: Failed to load subjects from network:', error);
        // Fallback to SQLite cache
        const cachedUserSubjects = await getOfflineUserSubjects();
        console.log('📦 AuthContext: Using SQLite cached subjects (offline mode)');
        setUserSubjects(cachedUserSubjects);
      }
    } else {
      // Offline - use SQLite cache
      console.log('📡 AuthContext: Offline - loading subjects from SQLite');
      const cachedUserSubjects = await getOfflineUserSubjects();
      setUserSubjects(cachedUserSubjects);
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
    const { error } = await registerUser(email, password, name);
    if (error) {
      throw new Error(error);
    }
    console.log('🔐 AuthContext: Registration successful, verification email sent');
    // User needs to verify email before logging in
  }

  async function verify(email: string, code: string) {
    console.log('🔐 AuthContext: Verifying email...');
    const { error } = await verifyEmail(email, code);
    if (error) {
      throw new Error(error);
    }
    console.log('🔐 AuthContext: Email verified successfully');
    // User can now login
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
    // Clear all offline data
    await clearAllData();
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
        verify,
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

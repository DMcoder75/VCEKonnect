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
// Version tracking import moved to dynamic import to avoid early initialization issues
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
  register: (email: string, password: string, name: string, onLog?: (message: string) => void) => Promise<void>;
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
      // CRITICAL: Always check for valid Supabase session first, regardless of network status
      console.log('🔐 AuthContext: Checking Supabase session...');
      
      let hasValidSession = false;
      try {
        const currentUser = await getCurrentUser();
        
        if (currentUser) {
          console.log('✅ AuthContext: Valid session found! User ID:', currentUser.id);
          hasValidSession = true;
          setUser(currentUser);
          
          // Save to SQLite for offline use
          await saveUserProfile(currentUser);
          
          // Track app version on session restore (completely async and non-blocking)
          setTimeout(() => {
            // Dynamic import to avoid initialization issues
            import('@/services/versionTrackingService')
              .then(({ updateUserAppVersion }) => {
                updateUserAppVersion(currentUser.id).catch(err => 
                  console.warn('Failed to track version:', err)
                );
              })
              .catch(err => console.warn('Failed to load version tracking:', err));
          }, 5000); // 5 second delay to ensure app is fully loaded
        } else {
          console.log('❌ AuthContext: No valid session found');
          hasValidSession = false;
        }
      } catch (sessionError) {
        console.error('❌ AuthContext: Session check failed:', sessionError);
        hasValidSession = false;
      }
      
      // If no valid session, clear everything and force login
      if (!hasValidSession) {
        console.log('🔐 AuthContext: No valid session -> clearing all data and forcing login');
        setUser(null);
        await clearAllData();
      }
    } catch (error) {
      console.error('❌ AuthContext: Critical error in loadUser:', error);
      setUser(null);
      // Clear cache on critical errors too
      await clearAllData().catch(clearErr => 
        console.error('Failed to clear data:', clearErr)
      );
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

  async function register(email: string, password: string, name: string, onLog?: (message: string) => void) {
    const log = (msg: string) => {
      console.log(msg);
      onLog?.(msg);
    };
    
    log('📝 Registering user...');
    log(`📝 Email: ${email}`);
    log('📝 Calling registerUser service...');
    
    const { error } = await registerUser(email, password, name, onLog);
    
    log(`📝 registerUser response: error=${error || 'null'}`);
    
    if (error) {
      log(`❌ Registration failed: ${error}`);
      throw new Error(error);
    }
    
    log('✅ Registration successful!');
    log('✅ Verification email sent');
    // User needs to verify email before logging in
  }

  async function verify(email: string, code: string, onLog?: (message: string) => void) {
    const log = (msg: string) => {
      console.log(msg);
      onLog?.(msg);
    };
    
    log('📝 AuthContext: Verifying email...');
    log('📝 Calling verifyEmail service...');
    
    const { error } = await verifyEmail(email, code, onLog);
    
    log(`📝 verifyEmail response: error=${error || 'null'}`);
    
    if (error) {
      log(`❌ Verification failed: ${error}`);
      throw new Error(error);
    }
    
    log('✅ Verification successful!');
    log('✅ User can now login');
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

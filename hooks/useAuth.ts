import { useState, useEffect } from 'react';
import { getUserProfile, saveUserProfile } from '@/services/storage';
import { UserProfile } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const profile = await getUserProfile();
      setUser(profile);
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string): Promise<boolean> {
    // Mock login - V1.0 uses local storage
    const mockUser: UserProfile = {
      id: 'user_' + Date.now(),
      email,
      name: email.split('@')[0],
      yearLevel: 12,
      selectedSubjects: [],
      targetUniversities: [],
      isPremium: false,
    };
    
    await saveUserProfile(mockUser);
    setUser(mockUser);
    return true;
  }

  async function signup(email: string, password: string, name: string): Promise<boolean> {
    const newUser: UserProfile = {
      id: 'user_' + Date.now(),
      email,
      name,
      yearLevel: 12,
      selectedSubjects: [],
      targetUniversities: [],
      isPremium: false,
    };
    
    await saveUserProfile(newUser);
    setUser(newUser);
    return true;
  }

  async function updateProfile(updates: Partial<UserProfile>): Promise<void> {
    if (!user) return;
    
    const updatedUser = { ...user, ...updates };
    await saveUserProfile(updatedUser);
    setUser(updatedUser);
  }

  async function logout(): Promise<void> {
    setUser(null);
  }

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    signup,
    updateProfile,
    logout,
  };
}

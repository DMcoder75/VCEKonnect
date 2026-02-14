import { useState, useEffect } from 'react';
import { UserProfile } from '@/types';
import {
  loginUser,
  registerUser,
  getCurrentUser,
  updateUserProfile,
  logoutUser,
} from '@/services/authService';

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    setIsLoading(true);
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    setIsLoading(false);
  }

  async function login(email: string, password: string) {
    const { user: loggedInUser, error } = await loginUser(email, password);
    if (error) {
      throw new Error(error);
    }
    setUser(loggedInUser);
  }

  async function register(email: string, password: string, name: string) {
    const { user: newUser, error } = await registerUser(email, password, name);
    if (error) {
      alert(error);
      return;
    }
    setUser(newUser);
  }

  async function updateProfile(updates: Partial<UserProfile>) {
    if (!user) return;
    const { error } = await updateUserProfile(user.id, updates);
    if (error) {
      throw new Error(error);
    }
    // Reload user to get fresh data from database
    await loadUser();
    return { success: true };
  }

  async function logout() {
    await logoutUser();
    setUser(null);
  }

  return {
    user,
    isLoading,
    login,
    register,
    updateProfile,
    logout,
  };
}

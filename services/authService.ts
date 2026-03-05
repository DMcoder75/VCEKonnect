// =====================================================
// Unified Auth Service - Supabase Auth Integration
// Uses Supabase Edge Functions for signup/verify
// Uses Supabase Auth SDK for login/session management
// =====================================================

import { supabase } from './supabase';
import { UserProfile } from '@/types';
import { getUserSubjects, updateUserSubjects } from './userSubjectsService';
import { updateUserAppVersion } from './versionTrackingService';

export interface AuthResponse {
  user: UserProfile | null;
  error: string | null;
}

// Register new user (calls Supabase Edge Function)
export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('auth-signup', {
      body: {
        email: email.toLowerCase(),
        password,
        name,
        yearLevel: 11, // Default year level
        stateId: 'vic', // Default state
      },
    });

    if (error) {
      return { user: null, error: error.message || 'Signup failed' };
    }

    if (data?.error) {
      return { user: null, error: data.error };
    }

    // User created successfully, needs to verify email
    return { user: null, error: null };
  } catch (err: any) {
    return { user: null, error: err.message || 'Registration failed' };
  }
}

// Verify email (calls Supabase Edge Function)
export async function verifyEmail(
  email: string,
  code: string
): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('auth-verify-email', {
      body: {
        email: email.toLowerCase(),
        code,
      },
    });

    if (error) {
      return { user: null, error: error.message || 'Verification failed' };
    }

    if (data?.error) {
      return { user: null, error: data.error };
    }

    // Email verified successfully, user can now login
    return { user: null, error: null };
  } catch (err: any) {
    return { user: null, error: err.message || 'Verification failed' };
  }
}

// Login user (uses Supabase Auth SDK)
export async function loginUser(
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    console.log('Login attempt for:', email);
    
    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

    if (authError) {
      console.error('Auth error:', authError);
      return { user: null, error: authError.message || 'Invalid email or password' };
    }

    if (!authData.user) {
      return { user: null, error: 'Login failed. Please try again.' };
    }

    console.log('Auth successful, loading user profile...');

    // Get vk_users profile
    const { data: userData, error: userError } = await supabase
      .from('vk_users')
      .select('*')
      .eq('auth_user_id', authData.user.id)
      .single();

    if (userError || !userData) {
      console.error('Failed to load user profile:', userError);
      return { user: null, error: 'Failed to load user profile' };
    }

    console.log('Login successful!');

    // Track app version
    updateUserAppVersion(userData.id).catch(err =>
      console.warn('Failed to track version on login:', err)
    );

    // Get user subjects from junction table
    const selectedSubjects = await getUserSubjects(userData.id);

    return {
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        yearLevel: userData.year_level,
        selectedSubjects,
        targetCareer: userData.target_career,
        targetUniversities: userData.target_universities || [],
        isPremium: userData.is_premium,
        premiumExpiry: userData.premium_expiry,
        state_id: userData.state_id,
        clientAppVersion: userData.client_app_version,
        clientPlatform: userData.client_platform,
        clientAppVersionUpdatedAt: userData.client_app_version_updated_at,
      },
      error: null,
    };
  } catch (err: any) {
    console.error('Login exception:', err);
    return { user: null, error: err.message || 'Login failed' };
  }
}

// Get current user from session
export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    // Get current session from Supabase Auth
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.log('No valid session');
      return null;
    }

    // Get vk_users profile
    const { data: userData, error: userError } = await supabase
      .from('vk_users')
      .select('*')
      .eq('auth_user_id', session.user.id)
      .single();

    if (userError || !userData) {
      console.error('Failed to load user profile:', userError);
      return null;
    }

    // Get user subjects from junction table
    const selectedSubjects = await getUserSubjects(userData.id);

    return {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      yearLevel: userData.year_level,
      selectedSubjects,
      targetCareer: userData.target_career,
      targetUniversities: userData.target_universities || [],
      isPremium: userData.is_premium,
      premiumExpiry: userData.premium_expiry,
      state_id: userData.state_id,
      clientAppVersion: userData.client_app_version,
      clientPlatform: userData.client_platform,
      clientAppVersionUpdatedAt: userData.client_app_version_updated_at,
    };
  } catch (err) {
    console.error('getCurrentUser error:', err);
    return null;
  }
}

// Update user profile
export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<{ error: string | null }> {
  try {
    // Update subjects in junction table if provided
    if (updates.selectedSubjects !== undefined) {
      const { error: subjectsError } = await updateUserSubjects(userId, updates.selectedSubjects);
      if (subjectsError) return { error: subjectsError };
    }

    // Build update object with only defined fields
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.yearLevel !== undefined) updateData.year_level = updates.yearLevel;
    if (updates.targetCareer !== undefined) updateData.target_career = updates.targetCareer;
    if (updates.targetUniversities !== undefined) updateData.target_universities = updates.targetUniversities;
    if (updates.state_id !== undefined) updateData.state_id = updates.state_id;

    // Only update if there are fields to update
    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from('vk_users')
        .update(updateData)
        .eq('id', userId);

      if (error) return { error: error.message };
    }

    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Update failed' };
  }
}

// Logout
export async function logoutUser(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error('Logout error:', err);
  }
}

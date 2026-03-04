// =====================================================
// Auth Service using Supabase Auth + Custom Email Verification
// Platform-agnostic authentication layer
// =====================================================

import { supabase } from './supabase';
import { UserProfile } from '@/types';

interface AuthResponse {
  user: UserProfile | null;
  error: string | null;
}

/**
 * Register a new user (sends verification email)
 */
export async function registerUser(
  email: string,
  password: string,
  name: string,
  yearLevel?: number,
  stateId?: string
): Promise<AuthResponse> {
  try {
    // Call Edge Function for signup (creates verification code, sends email)
    const { data, error } = await supabase.functions.invoke('auth-signup', {
      body: {
        email: email.toLowerCase().trim(),
        password,
        name,
        yearLevel: yearLevel || 11,
        stateId: stateId || 'vic',
      },
    });

    if (error) {
      console.error('Registration error:', error);
      return { user: null, error: error.message || 'Failed to register' };
    }

    if (data.error) {
      return { user: null, error: data.error };
    }

    // Return success - user needs to verify email
    return {
      user: null,
      error: null, // No error, but user not created yet (pending verification)
    };
  } catch (err: any) {
    console.error('registerUser error:', err);
    return { user: null, error: err.message || 'Registration failed' };
  }
}

/**
 * Verify email with code (marks auth.users as verified)
 */
export async function verifyEmail(
  email: string,
  code: string
): Promise<AuthResponse> {
  try {
    // Call Edge Function to verify code and update auth.users
    const { data, error } = await supabase.functions.invoke('auth-verify-email', {
      body: {
        email: email.toLowerCase().trim(),
        code,
      },
    });

    if (error) {
      console.error('Verification error:', error);
      return { user: null, error: error.message || 'Verification failed' };
    }

    if (data.error) {
      return { user: null, error: data.error };
    }

    // Email verified successfully, but user needs to login
    // Return null user to indicate they should proceed to login
    return {
      user: null,
      error: null, // Success, but no session yet
    };
  } catch (err: any) {
    console.error('verifyEmail error:', err);
    return { user: null, error: err.message || 'Verification failed' };
  }
}

/**
 * Login user with email and password
 */
export async function loginUser(
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    // Use Supabase Auth directly for login
    const { data: sessionData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });

    if (authError) {
      console.error('Login error:', authError);
      return { user: null, error: 'Invalid email or password' };
    }

    if (!sessionData.session || !sessionData.user) {
      return { user: null, error: 'Failed to create session' };
    }

    // Get user profile from vk_users
    const { data: userProfile, error: profileError } = await supabase
      .from('vk_users')
      .select('*')
      .eq('auth_user_id', sessionData.user.id)
      .single();

    if (profileError || !userProfile) {
      console.error('Failed to fetch user profile:', profileError);
      return { user: null, error: 'User profile not found' };
    }

    // Map to UserProfile type
    const user: UserProfile = {
      id: userProfile.id,
      email: userProfile.email,
      name: userProfile.name,
      yearLevel: userProfile.year_level,
      stateId: userProfile.state_id,
      isPremium: userProfile.is_premium || false,
      premiumTier: userProfile.premium_tier || 'free',
      premiumExpiresAt: userProfile.premium_expires_at,
      createdAt: userProfile.created_at,
      updatedAt: userProfile.updated_at,
    };

    return { user, error: null };
  } catch (err: any) {
    console.error('loginUser error:', err);
    return { user: null, error: err.message || 'Login failed' };
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    // Check Supabase Auth session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.log('No active session');
      return null;
    }

    // Get user profile from vk_users
    const { data: userProfile, error: profileError } = await supabase
      .from('vk_users')
      .select('*')
      .eq('auth_user_id', session.user.id)
      .single();

    if (profileError || !userProfile) {
      console.error('Failed to fetch user profile:', profileError);
      return null;
    }

    // Map to UserProfile type
    const user: UserProfile = {
      id: userProfile.id,
      email: userProfile.email,
      name: userProfile.name,
      yearLevel: userProfile.year_level,
      stateId: userProfile.state_id,
      isPremium: userProfile.is_premium || false,
      premiumTier: userProfile.premium_tier || 'free',
      premiumExpiresAt: userProfile.premium_expires_at,
      createdAt: userProfile.created_at,
      updatedAt: userProfile.updated_at,
    };

    return user;
  } catch (err) {
    console.error('getCurrentUser error:', err);
    return null;
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<{ error: string | null }> {
  try {
    // Map UserProfile fields to database columns
    const dbUpdates: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.yearLevel !== undefined) dbUpdates.year_level = updates.yearLevel;
    if (updates.stateId !== undefined) dbUpdates.state_id = updates.stateId;
    // Premium fields are protected by RLS policy

    const { error } = await supabase
      .from('vk_users')
      .update(dbUpdates)
      .eq('id', userId);

    if (error) {
      console.error('Update profile error:', error);
      return { error: error.message };
    }

    return { error: null };
  } catch (err: any) {
    console.error('updateUserProfile error:', err);
    return { error: err.message || 'Failed to update profile' };
  }
}

/**
 * Logout user
 */
export async function logoutUser(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error('Logout error:', err);
  }
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(email: string): Promise<{ error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('auth-signup', {
      body: { email: email.toLowerCase().trim(), resend: true },
    });

    if (error) {
      return { error: error.message || 'Failed to resend verification email' };
    }

    if (data.error) {
      return { error: data.error };
    }

    return { error: null };
  } catch (err: any) {
    console.error('resendVerificationEmail error:', err);
    return { error: err.message || 'Failed to resend verification email' };
  }
}

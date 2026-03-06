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
    console.log('📝 [REGISTER] Starting registration...');
    console.log('📝 [REGISTER] Supabase URL:', (supabase as any).supabaseUrl || 'UNKNOWN');
    console.log('📝 [REGISTER] Email:', email.toLowerCase());
    console.log('📝 [REGISTER] Name:', name);
    console.log('📝 [REGISTER] Password length:', password.length);
    
    // Get the Edge Function URL being called
    const supabaseUrl = (supabase as any).supabaseUrl || 'https://xududbaqaaffcaejwuix.supabase.co';
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/auth-signup`;
    console.log('📝 [REGISTER] Edge Function URL:', edgeFunctionUrl);
    console.log('📝 [REGISTER] Calling auth-signup Edge Function...');
    
    const { data, error } = await supabase.functions.invoke('auth-signup', {
      body: {
        email: email.toLowerCase(),
        password,
        name,
        yearLevel: 11, // Default year level
        stateId: 'vic', // Default state
      },
    });

    console.log('📝 [REGISTER] Edge Function RAW response:', JSON.stringify({ data, error }, null, 2));

    if (error) {
      console.error('❌ [REGISTER] Edge Function error:', error);
      const errorMessage = data?.error || error.message || JSON.stringify(error);
      const errorDetails = data?.details || '';
      const errorStep = data?.step || 'unknown';
      
      return { 
        user: null, 
        error: `SIGNUP FAILED\n\nError: ${errorMessage}${errorDetails ? '\n\nDetails: ' + errorDetails : ''}${errorStep !== 'unknown' ? '\n\nFailed at: ' + errorStep : ''}` 
      };
    }

    if (data?.error) {
      console.error('❌ [REGISTER] Data contains error:', data);
      const errorMessage = data.error;
      const errorDetails = data.details || '';
      const errorStep = data.step || 'unknown';
      
      return { 
        user: null, 
        error: `SIGNUP FAILED\n\nError: ${errorMessage}${errorDetails ? '\n\nDetails: ' + errorDetails : ''}${errorStep !== 'unknown' ? '\n\nFailed at: ' + errorStep : ''}` 
      };
    }

    // Check if auth user was actually created
    if (!data?.authUser) {
      console.error('❌ [REGISTER] CRITICAL: Auth user NOT created!');
      console.error('❌ [REGISTER] Full response:', JSON.stringify(data, null, 2));
      return { user: null, error: 'Failed to create authentication account. Please try again.' };
    }

    // Check if email was sent
    if (!data?.verificationSent) {
      console.error('❌ [REGISTER] WARNING: Verification email NOT sent!');
      console.error('❌ [REGISTER] Full response:', JSON.stringify(data, null, 2));
      return { user: null, error: 'Account created but verification email failed to send. Please contact support.' };
    }

    console.log('✅ [REGISTER] Registration successful!');
    console.log('✅ [REGISTER] User created in auth.users?', data?.authUser ? 'YES' : 'NO');
    console.log('✅ [REGISTER] User created in vk_users?', data?.user ? 'YES' : 'NO');
    console.log('✅ [REGISTER] Verification code sent?', data?.verificationSent ? 'YES' : 'NO');
    
    // User created successfully, needs to verify email
    return { user: null, error: null };
  } catch (err: any) {
    console.error('❌ [REGISTER] Exception:', err);
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
    const normalizedEmail = email.toLowerCase();
    console.log('🔐 [LOGIN] Starting login attempt');
    console.log('🔐 [LOGIN] Email (original):', email);
    console.log('🔐 [LOGIN] Email (normalized):', normalizedEmail);
    console.log('🔐 [LOGIN] Password length:', password.length);
    console.log('🔐 [LOGIN] Password (first 3 chars):', password.substring(0, 3) + '***');
    
    // Sign in with Supabase Auth
    console.log('🔐 [LOGIN] Calling supabase.auth.signInWithPassword...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (authError) {
      console.error('❌ [LOGIN] Supabase Auth Error:');
      console.error('❌ [LOGIN] Error message:', authError.message);
      console.error('❌ [LOGIN] Error name:', authError.name);
      console.error('❌ [LOGIN] Error status:', (authError as any).status);
      console.error('❌ [LOGIN] Full error object:', JSON.stringify(authError, null, 2));
      return { user: null, error: authError.message || 'Invalid email or password' };
    }

    console.log('✅ [LOGIN] Supabase Auth successful!');
    console.log('✅ [LOGIN] Auth user ID:', authData.user?.id);
    console.log('✅ [LOGIN] Auth user email:', authData.user?.email);

    if (!authData.user) {
      console.error('❌ [LOGIN] No user data returned from Supabase Auth');
      return { user: null, error: 'Login failed. Please try again.' };
    }

    console.log('🔐 [LOGIN] Loading user profile from vk_users...');

    // Get vk_users profile
    const { data: userData, error: userError } = await supabase
      .from('vk_users')
      .select('*')
      .eq('auth_user_id', authData.user.id)
      .single();

    if (userError || !userData) {
      console.error('❌ [LOGIN] Failed to load user profile:', userError);
      console.error('❌ [LOGIN] User error details:', JSON.stringify(userError, null, 2));
      return { user: null, error: 'Failed to load user profile' };
    }

    console.log('✅ [LOGIN] User profile loaded successfully!');
    console.log('✅ [LOGIN] User ID:', userData.id);
    console.log('✅ [LOGIN] User name:', userData.name);

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

import { supabase } from './supabase';
import { UserProfile } from '@/types';
import bcryptjs from 'bcryptjs';
import { getUserSubjects, updateUserSubjects } from './userSubjectsService';
import { updateUserAppVersion } from './versionTrackingService.web';

export interface AuthResponse {
  user: UserProfile | null;
  error: string | null;
}

// Register new user
export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<AuthResponse> {
  try {
    // Hash password with bcryptjs (web-compatible)
    const salt = await bcryptjs.genSalt(10);
    const passwordHash = await bcryptjs.hash(password, salt);

    // Create user (with is_verified = false by default)
    const { data, error } = await supabase
      .from('vk_users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        name,
        year_level: 12,
        is_verified: false,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { user: null, error: 'Email already registered' };
      }
      return { user: null, error: error.message };
    }

    // Store session
    await saveSession(data.id);

    // Track app version (no-op on web)
    updateUserAppVersion(data.id).catch(err => 
      console.warn('Failed to track version on register:', err)
    );

    // Get user subjects from junction table
    const selectedSubjects = await getUserSubjects(data.id);

    return {
      user: {
        id: data.id,
        email: data.email,
        name: data.name,
        yearLevel: data.year_level,
        selectedSubjects,
        targetCareer: data.target_career,
        targetUniversities: data.target_universities || [],
        isPremium: data.is_premium,
        premiumExpiry: data.premium_expiry,
        state_id: data.state_id,
        clientAppVersion: data.client_app_version,
        clientPlatform: data.client_platform,
        clientAppVersionUpdatedAt: data.client_app_version_updated_at,
      },
      error: null,
    };
  } catch (err: any) {
    return { user: null, error: err.message || 'Registration failed' };
  }
}

// Login user
export async function loginUser(
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase
      .from('vk_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !data) {
      return { user: null, error: 'Invalid email or password' };
    }

    // Verify password with bcryptjs (web-compatible)
    const isValid = await bcryptjs.compare(password, data.password_hash);
    
    if (!isValid) {
      return { user: null, error: 'Invalid email or password' };
    }

    // Check if email is verified
    if (!data.is_verified) {
      return { user: null, error: 'Please verify your email before logging in. Check your inbox for the verification code.' };
    }

    // Save session
    await saveSession(data.id);

    // Track app version (no-op on web)
    updateUserAppVersion(data.id).catch(err => 
      console.warn('Failed to track version on login:', err)
    );

    // Get user subjects from junction table
    const selectedSubjects = await getUserSubjects(data.id);

    return {
      user: {
        id: data.id,
        email: data.email,
        name: data.name,
        yearLevel: data.year_level,
        selectedSubjects,
        targetCareer: data.target_career,
        targetUniversities: data.target_universities || [],
        isPremium: data.is_premium,
        premiumExpiry: data.premium_expiry,
        state_id: data.state_id,
        clientAppVersion: data.client_app_version,
        clientPlatform: data.client_platform,
        clientAppVersionUpdatedAt: data.client_app_version_updated_at,
      },
      error: null,
    };
  } catch (err: any) {
    return { user: null, error: err.message || 'Login failed' };
  }
}

// Get current user from session
export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    const userId = await getSession();
    if (!userId) return null;

    const { data, error } = await supabase
      .from('vk_users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) return null;

    // Get user subjects from junction table
    const selectedSubjects = await getUserSubjects(data.id);

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      yearLevel: data.year_level,
      selectedSubjects,
      targetCareer: data.target_career,
      targetUniversities: data.target_universities || [],
      isPremium: data.is_premium,
      premiumExpiry: data.premium_expiry,
      state_id: data.state_id,
      clientAppVersion: data.client_app_version,
      clientPlatform: data.client_platform,
      clientAppVersionUpdatedAt: data.client_app_version_updated_at,
    };
  } catch (err) {
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
  await clearSession();
}

// Session management (localStorage for web)
async function saveSession(userId: string): Promise<void> {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vk_user_id', userId);
    }
  } catch (err) {
    console.error('Failed to save session:', err);
  }
}

async function getSession(): Promise<string | null> {
  try {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vk_user_id');
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function clearSession(): Promise<void> {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vk_user_id');
    }
  } catch (err) {
    console.error('Failed to clear session:', err);
  }
}

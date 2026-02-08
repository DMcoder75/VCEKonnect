import { supabase, setUserContext } from './supabase';
import { UserProfile } from '@/types';

export interface AuthResponse {
  user: UserProfile | null;
  error: string | null;
}

// Web-compatible password hashing using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// Register new user
export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<AuthResponse> {
  try {
    const passwordHash = await hashPassword(password);

    const { data, error } = await supabase
      .from('vk_users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        name,
        year_level: 12,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { user: null, error: 'Email already registered' };
      }
      return { user: null, error: error.message };
    }

    await setUserContext(data.id);
    await saveSession(data.id);

    return {
      user: {
        id: data.id,
        email: data.email,
        name: data.name,
        yearLevel: data.year_level,
        selectedSubjects: data.selected_subjects || [],
        targetCareer: data.target_career,
        targetUniversities: data.target_universities || [],
        isPremium: data.is_premium,
        premiumExpiry: data.premium_expiry,
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

    const isValid = await verifyPassword(password, data.password_hash);
    if (!isValid) {
      return { user: null, error: 'Invalid email or password' };
    }

    await setUserContext(data.id);
    await saveSession(data.id);

    return {
      user: {
        id: data.id,
        email: data.email,
        name: data.name,
        yearLevel: data.year_level,
        selectedSubjects: data.selected_subjects || [],
        targetCareer: data.target_career,
        targetUniversities: data.target_universities || [],
        isPremium: data.is_premium,
        premiumExpiry: data.premium_expiry,
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

    await setUserContext(data.id);

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      yearLevel: data.year_level,
      selectedSubjects: data.selected_subjects || [],
      targetCareer: data.target_career,
      targetUniversities: data.target_universities || [],
      isPremium: data.is_premium,
      premiumExpiry: data.premium_expiry,
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
    const { error } = await supabase
      .from('vk_users')
      .update({
        name: updates.name,
        year_level: updates.yearLevel,
        selected_subjects: updates.selectedSubjects,
        target_career: updates.targetCareer,
        target_universities: updates.targetUniversities,
      })
      .eq('id', userId);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Update failed' };
  }
}

// Logout
export async function logoutUser(): Promise<void> {
  await clearSession();
}

// Session management - Web uses localStorage
async function saveSession(userId: string): Promise<void> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('vk_user_id', userId);
    }
  } catch (err) {
    console.error('Failed to save session:', err);
  }
}

async function getSession(): Promise<string | null> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem('vk_user_id');
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function clearSession(): Promise<void> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('vk_user_id');
    }
  } catch (err) {
    console.error('Failed to clear session:', err);
  }
}

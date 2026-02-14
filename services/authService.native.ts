import { supabase } from './supabase';
import { UserProfile } from '@/types';
import bcrypt from 'react-native-bcrypt';
import { getUserSubjects, updateUserSubjects } from './userSubjectsService';

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
    // Hash password
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    // Create user
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

    // Store session
    await saveSession(data.id);

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
    console.log('Native login attempt for:', email);
    const { data, error } = await supabase
      .from('vk_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    console.log('Database query result:', { hasData: !!data, error: error?.message });

    if (error || !data) {
      console.error('User not found:', error);
      return { user: null, error: 'Invalid email or password' };
    }

    console.log('User found, verifying password...');
    console.log('Hash from DB:', data.password_hash);

    // Verify password
    const isValid = bcrypt.compareSync(password, data.password_hash);
    console.log('bcrypt verification result:', isValid);
    
    if (!isValid) {
      console.error('Password verification failed');
      return { user: null, error: 'Invalid email or password' };
    }

    console.log('Login successful!');

    // Save session
    await saveSession(data.id);

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

// Session management
async function saveSession(userId: string): Promise<void> {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem('vk_user_id', userId);
  } catch (err) {
    console.error('Failed to save session:', err);
  }
}

async function getSession(): Promise<string | null> {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    return await AsyncStorage.getItem('vk_user_id');
  } catch (err) {
    return null;
  }
}

async function clearSession(): Promise<void> {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.removeItem('vk_user_id');
  } catch (err) {
    console.error('Failed to clear session:', err);
  }
}

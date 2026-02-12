import { supabase } from './supabase';
import { VCESubject } from './vceSubjectsService';

export interface UserSubject {
  id: string;
  userId: string;
  subjectId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get all subjects for a user with full subject details from catalog
 */
export async function getUserSubjects(userId: string): Promise<VCESubject[]> {
  try {
    console.log('🔍 Step 1: Fetching subject IDs for user:', userId);

    // Step 1: Get user's subject IDs
    const { data: userSubjectsData, error: userSubjectsError } = await supabase
      .from('vk_user_subjects')
      .select('subject_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (userSubjectsError) {
      console.error('❌ Error fetching user subjects:', userSubjectsError);
      return [];
    }

    console.log('📦 User subject IDs:', userSubjectsData);

    if (!userSubjectsData || userSubjectsData.length === 0) {
      console.warn('⚠️ No subjects found for user');
      return [];
    }

    const subjectIds = userSubjectsData.map(row => row.subject_id);
    console.log('🔍 Step 2: Fetching subject details for IDs:', subjectIds);

    // Step 2: Get full subject details from catalog
    const { data: subjectsData, error: subjectsError } = await supabase
      .from('vk_vce_subjects')
      .select('*')
      .in('id', subjectIds);

    if (subjectsError) {
      console.error('❌ Error fetching VCE subjects:', subjectsError);
      return [];
    }

    console.log('📦 VCE subjects data:', subjectsData);

    if (!subjectsData || subjectsData.length === 0) {
      console.warn('⚠️ No matching subjects found in vk_vce_subjects table for IDs:', subjectIds);
      return [];
    }

    // Step 3: Map to VCESubject format
    const subjects = subjectsData.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      category: row.category,
      scaledMean: row.scaled_mean,
      scaledStdDev: row.scaled_std_dev,
      createdAt: row.created_at,
    }));

    console.log('✅ Final subjects count:', subjects.length);
    console.log('✅ Subjects:', subjects);
    return subjects;
  } catch (err) {
    console.error('💥 getUserSubjects error:', err);
    return [];
  }
}

/**
 * Get user subject IDs only (lightweight query)
 */
export async function getUserSubjectIds(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('vk_user_subjects')
      .select('subject_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching user subject IDs:', error);
      return [];
    }

    return data.map(row => row.subject_id);
  } catch (err) {
    console.error('getUserSubjectIds error:', err);
    return [];
  }
}

/**
 * Update user's subjects (replaces all existing subjects)
 */
export async function updateUserSubjects(
  userId: string,
  subjectIds: string[]
): Promise<{ error: string | null }> {
  try {
    // Start transaction: delete all existing subjects
    const { error: deleteError } = await supabase
      .from('vk_user_subjects')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      return { error: deleteError.message };
    }

    // Insert new subjects
    if (subjectIds.length > 0) {
      const records = subjectIds.map(subjectId => ({
        user_id: userId,
        subject_id: subjectId,
      }));

      const { error: insertError } = await supabase
        .from('vk_user_subjects')
        .insert(records);

      if (insertError) {
        return { error: insertError.message };
      }
    }

    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Failed to update subjects' };
  }
}

/**
 * Add a single subject for a user
 */
export async function addUserSubject(
  userId: string,
  subjectId: string
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('vk_user_subjects')
      .insert({
        user_id: userId,
        subject_id: subjectId,
      });

    if (error) {
      if (error.code === '23505') {
        return { error: null }; // Already exists, no error
      }
      return { error: error.message };
    }

    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Failed to add subject' };
  }
}

/**
 * Remove a single subject for a user
 */
export async function removeUserSubject(
  userId: string,
  subjectId: string
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('vk_user_subjects')
      .delete()
      .eq('user_id', userId)
      .eq('subject_id', subjectId);

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Failed to remove subject' };
  }
}

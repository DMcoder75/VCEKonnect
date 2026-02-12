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
    console.log('🔍 Fetching subjects for user:', userId);

    const { data, error } = await supabase
      .from('vk_user_subjects')
      .select(`
        subject_id,
        vk_vce_subjects (
          id,
          code,
          name,
          category,
          scaled_mean,
          scaled_std_dev,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error fetching user subjects:', error);
      return [];
    }

    console.log('📦 Raw query result:', JSON.stringify(data, null, 2));
    console.log('📊 Total rows returned:', data?.length);

    // Map the joined data to VCESubject format
    const subjects = data
      .filter(row => {
        const hasSubject = !!row.vk_vce_subjects;
        if (!hasSubject) {
          console.warn('⚠️ No matching VCE subject found for ID:', row.subject_id);
        }
        return hasSubject;
      })
      .map(row => {
        const subject = row.vk_vce_subjects as any;
        return {
          id: subject.id,
          code: subject.code,
          name: subject.name,
          category: subject.category,
          scaledMean: subject.scaled_mean,
          scaledStdDev: subject.scaled_std_dev,
          createdAt: subject.created_at,
        };
      });

    console.log('✅ Mapped subjects:', subjects.length);
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

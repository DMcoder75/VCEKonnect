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
    // Step 1: Get user's subject IDs from vk_user_subjects
    const { data: userSubjectsData, error: userSubjectsError } = await supabase
      .from('vk_user_subjects')
      .select('subject_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (userSubjectsError) {
      console.error('Error fetching user subjects:', userSubjectsError);
      return [];
    }

    if (!userSubjectsData || userSubjectsData.length === 0) {
      return [];
    }

    const subjectIds = userSubjectsData.map(row => row.subject_id);

    // Step 2: Try to get full subject details from catalog
    const { data: subjectsData, error: subjectsError } = await supabase
      .from('vk_vce_subjects')
      .select('*')
      .in('id', subjectIds);

    if (subjectsError) {
      console.error('Error fetching VCE subjects catalog:', subjectsError);
    }

    // Step 3: Build subject list (with fallback if catalog doesn't have the subject)
    const subjects: VCESubject[] = subjectIds.map(subjectId => {
      const catalogSubject = subjectsData?.find(s => s.id === subjectId);
      
      if (catalogSubject) {
        // Use catalog data
        return {
          id: catalogSubject.id,
          code: catalogSubject.code,
          name: catalogSubject.name,
          category: catalogSubject.category,
          scaledMean: catalogSubject.scaled_mean,
          scaledStdDev: catalogSubject.scaled_std_dev,
          createdAt: catalogSubject.created_at,
        };
      } else {
        // Fallback: use subject ID as both ID and code
        return {
          id: subjectId,
          code: subjectId.toUpperCase(),
          name: subjectId.toUpperCase(),
          category: 'Unknown',
          scaledMean: null,
          scaledStdDev: null,
          createdAt: new Date().toISOString(),
        };
      }
    });

    return subjects;
  } catch (err) {
    console.error('getUserSubjects error:', err);
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

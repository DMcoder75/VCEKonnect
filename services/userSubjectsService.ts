import { supabase } from './supabase';
import { getAllVCESubjects, VCESubject } from './vceSubjectsService';

export interface UserSubject {
  id: string;
  userId: string;
  subjectId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get all subjects for a user (returns full subject objects with name, code, etc.)
 */
export async function getUserSubjects(userId: string): Promise<VCESubject[]> {
  try {
    // Get user's subject IDs
    const { data, error } = await supabase
      .from('vk_user_subjects')
      .select('subject_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching user subjects:', error);
      return [];
    }

    const userSubjectIds = data.map(row => row.subject_id);

    // Get all VCE subjects
    const allSubjects = await getAllVCESubjects();

    // Filter to only user's subjects
    return allSubjects.filter(subject => userSubjectIds.includes(subject.id));
  } catch (err) {
    console.error('getUserSubjects error:', err);
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

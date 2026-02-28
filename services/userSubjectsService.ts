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

    // Step 1: Get user's active subject IDs only
    const { data: userSubjectsData, error: userSubjectsError } = await supabase
      .from('vk_user_subjects')
      .select('subject_id')
      .eq('user_id', userId)
      .eq('is_active', true)
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

    // Step 2: Get full subject details from unified catalog
    const { data: subjectsData, error: subjectsError } = await supabase
      .from('vk_vce_subjects')
      .select('*')
      .in('id', subjectIds);

    if (subjectsError) {
      console.error('❌ Error fetching subjects:', subjectsError);
      return [];
    }

    console.log('📦 Subjects data:', subjectsData);

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
      stateId: row.state_id,
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
 * Get user subject IDs only (lightweight query) - active subjects only
 */
export async function getUserSubjectIds(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('vk_user_subjects')
      .select('subject_id')
      .eq('user_id', userId)
      .eq('is_active', true)
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
 * Update user's subjects with soft delete support
 * - Deselected subjects are marked as inactive (soft delete)
 * - Previously deleted subjects can be restored if re-selected
 * - New subjects are inserted
 */
export async function updateUserSubjects(
  userId: string,
  subjectIds: string[]
): Promise<{ error: string | null }> {
  try {
    // Step 1: Get all existing subjects (both active and deleted)
    const { data: existingSubjects, error: fetchError } = await supabase
      .from('vk_user_subjects')
      .select('subject_id, is_active')
      .eq('user_id', userId);

    if (fetchError) {
      return { error: fetchError.message };
    }

    const existingMap = new Map(existingSubjects?.map(s => [s.subject_id, s.is_active]) || []);

    // Step 2: Process each subject in the new list
    for (const subjectId of subjectIds) {
      const existingStatus = existingMap.get(subjectId);
      
      if (existingStatus === undefined) {
        // New subject - insert it
        const { error: insertError } = await supabase
          .from('vk_user_subjects')
          .insert({
            user_id: userId,
            subject_id: subjectId,
            is_active: true,
          });
        
        if (insertError) {
          console.error(`Failed to insert subject ${subjectId}:`, insertError);
        }
      } else if (existingStatus === false) {
        // Previously deleted subject - restore it
        const { error: restoreError } = await supabase
          .from('vk_user_subjects')
          .update({
            is_active: true,
            deleted_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('subject_id', subjectId);
        
        if (restoreError) {
          console.error(`Failed to restore subject ${subjectId}:`, restoreError);
        }
      }
      // If existingStatus === true, subject is already active - do nothing
    }

    // Step 3: Soft delete subjects that are currently active but not in the new list
    for (const [subjectId, isActive] of existingMap.entries()) {
      if (isActive && !subjectIds.includes(subjectId)) {
        const { error: deleteError } = await supabase
          .from('vk_user_subjects')
          .update({
            is_active: false,
            deleted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('subject_id', subjectId);
        
        if (deleteError) {
          console.error(`Failed to soft delete subject ${subjectId}:`, deleteError);
        }
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
 * Remove a single subject for a user (soft delete)
 */
export async function removeUserSubject(
  userId: string,
  subjectId: string
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('vk_user_subjects')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
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

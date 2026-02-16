// User preferences service for managing study goals and preferences
import { getSupabaseClient } from '@/template';

export interface UserPreferences {
  targetATAR?: number;
  studyHoursPerWeek?: number;
  targetCareer?: string;
  targetUniversities?: string[];
}

/**
 * Get user preferences from vk_users table
 */
export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('vk_users')
    .select('target_atar, study_hours_per_week, target_career, target_universities')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user preferences:', error);
    return null;
  }

  return {
    targetATAR: data.target_atar,
    studyHoursPerWeek: data.study_hours_per_week,
    targetCareer: data.target_career,
    targetUniversities: data.target_universities,
  };
}

/**
 * Update user preferences in vk_users table
 */
export async function updateUserPreferences(
  userId: string,
  preferences: Partial<UserPreferences>
): Promise<{ error: string | null }> {
  const supabase = getSupabaseClient();

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (preferences.targetATAR !== undefined) {
    updateData.target_atar = preferences.targetATAR;
  }
  if (preferences.studyHoursPerWeek !== undefined) {
    updateData.study_hours_per_week = preferences.studyHoursPerWeek;
  }
  if (preferences.targetCareer !== undefined) {
    updateData.target_career = preferences.targetCareer;
  }
  if (preferences.targetUniversities !== undefined) {
    updateData.target_universities = preferences.targetUniversities;
  }

  const { error } = await supabase
    .from('vk_users')
    .update(updateData)
    .eq('id', userId);

  if (error) {
    console.error('Error updating user preferences:', error);
    return { error: error.message };
  }

  return { error: null };
}

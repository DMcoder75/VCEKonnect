import { supabase } from './supabase';

export interface Achievement {
  id: string;
  userId: string;
  achievementType: string;
  achievementName: string;
  achievementDescription: string;
  iconName: string;
  earnedAt: string;
  metadata: Record<string, any>;
}

export interface GoalStreak {
  id: string;
  userId: string;
  streakType: 'weekly' | 'monthly';
  currentStreak: number;
  longestStreak: number;
  lastCompletionDate: string | null;
  lastUpdated: string;
}

export interface CopyGoalsResult {
  success: boolean;
  message: string;
  copiedCount: number;
  newPeriodId?: string;
  periodName?: string;
}

export interface SubjectCompletion {
  id: string;
  userId: string;
  subjectId: string;
  goalPeriodId: string;
  completionPercent: number;
  completedAt: string;
}

export interface SubjectStreak {
  id: string;
  userId: string;
  subjectId: string;
  currentStreak: number;
  longestStreak: number;
  lastCompletionWeek: string | null;
  updatedAt: string;
}

// Get user's achievements
export async function getUserAchievements(userId: string): Promise<Achievement[]> {
  try {
    const { data, error } = await supabase
      .from('vk_achievements')
      .select('*')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch achievements:', error);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      achievementType: row.achievement_type,
      achievementName: row.achievement_name,
      achievementDescription: row.achievement_description,
      iconName: row.icon_name,
      earnedAt: row.earned_at,
      metadata: row.metadata || {},
    }));
  } catch (err) {
    console.error('Error fetching achievements:', err);
    return [];
  }
}

// Get user's goal streaks
export async function getUserStreaks(userId: string): Promise<GoalStreak[]> {
  try {
    const { data, error } = await supabase
      .from('vk_goal_streaks')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to fetch streaks:', error);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      streakType: row.streak_type,
      currentStreak: row.current_streak,
      longestStreak: row.longest_streak,
      lastCompletionDate: row.last_completion_date,
      lastUpdated: row.last_updated,
    }));
  } catch (err) {
    console.error('Error fetching streaks:', err);
    return [];
  }
}

// Copy previous week's goals to a new week
export async function copyPreviousWeekGoals(
  userId: string,
  newStartDate: Date
): Promise<CopyGoalsResult> {
  try {
    // Format date as YYYY-MM-DD
    const year = newStartDate.getFullYear();
    const month = String(newStartDate.getMonth() + 1).padStart(2, '0');
    const day = String(newStartDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const { data, error } = await supabase.rpc('copy_previous_week_goals', {
      p_user_id: userId,
      p_new_start_date: dateStr,
    });

    if (error) {
      console.error('Failed to copy goals:', error);
      return {
        success: false,
        message: error.message,
        copiedCount: 0,
      };
    }

    return {
      success: data.success,
      message: data.message,
      copiedCount: data.copied_count,
      newPeriodId: data.new_period_id,
      periodName: data.period_name,
    };
  } catch (err: any) {
    console.error('Error copying goals:', err);
    return {
      success: false,
      message: err.message || 'Failed to copy goals',
      copiedCount: 0,
    };
  }
}

// Update streak after goal completion
export async function updateStreakAfterCompletion(
  userId: string,
  periodId: string,
  periodType: 'weekly' | 'monthly' | 'term'
): Promise<{
  success: boolean;
  currentStreak?: number;
  longestStreak?: number;
  achievementEarned?: boolean;
  achievementType?: string;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('update_goal_streak', {
      p_user_id: userId,
      p_period_id: periodId,
      p_period_type: periodType,
    });

    if (error) {
      console.error('Failed to update streak:', error);
      return { success: false, error: error.message };
    }

    return {
      success: data.success,
      currentStreak: data.current_streak,
      longestStreak: data.longest_streak,
      achievementEarned: data.achievement_earned,
      achievementType: data.achievement_type,
    };
  } catch (err: any) {
    console.error('Error updating streak:', err);
    return { success: false, error: err.message || 'Failed to update streak' };
  }
}

// Get subject completions (100%+ subject goals)
export async function getSubjectCompletions(userId: string): Promise<SubjectCompletion[]> {
  try {
    const { data, error } = await supabase
      .from('vk_subject_completions')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch subject completions:', error);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      subjectId: row.subject_id,
      goalPeriodId: row.goal_period_id,
      completionPercent: row.completion_percent,
      completedAt: row.completed_at,
    }));
  } catch (err) {
    console.error('Error fetching subject completions:', err);
    return [];
  }
}

// Get subject streaks (consecutive weeks)
export async function getSubjectStreaks(userId: string): Promise<SubjectStreak[]> {
  try {
    const { data, error } = await supabase
      .from('vk_subject_streaks')
      .select('*')
      .eq('user_id', userId)
      .order('current_streak', { ascending: false });

    if (error) {
      console.error('Failed to fetch subject streaks:', error);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      subjectId: row.subject_id,
      currentStreak: row.current_streak,
      longestStreak: row.longest_streak,
      lastCompletionWeek: row.last_completion_week,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    console.error('Error fetching subject streaks:', err);
    return [];
  }
}

// Deactivate expired goals (end_date < current_date)
export async function deactivateExpiredGoals(userId: string): Promise<{
  success: boolean;
  totalDeactivated: number;
  weeklyDeactivated: number;
  monthlyDeactivated: number;
  termDeactivated: number;
}> {
  try {
    const { data, error } = await supabase.rpc('deactivate_expired_goals', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Failed to deactivate expired goals:', error);
      return {
        success: false,
        totalDeactivated: 0,
        weeklyDeactivated: 0,
        monthlyDeactivated: 0,
        termDeactivated: 0,
      };
    }

    return {
      success: data.success,
      totalDeactivated: data.total_deactivated,
      weeklyDeactivated: data.weekly_deactivated,
      monthlyDeactivated: data.monthly_deactivated,
      termDeactivated: data.term_deactivated,
    };
  } catch (err: any) {
    console.error('Error deactivating expired goals:', err);
    return {
      success: false,
      totalDeactivated: 0,
      weeklyDeactivated: 0,
      monthlyDeactivated: 0,
      termDeactivated: 0,
    };
  }
}

// Check if user needs weekly reset
export async function checkNeedsWeeklyReset(userId: string): Promise<{
  needsReset: boolean;
  currentWeekStart: Date;
  hasActiveWeeklyGoal: boolean;
}> {
  try {
    // FIRST: Deactivate any expired goals before checking
    await deactivateExpiredGoals(userId);

    // Get start of current week (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ...
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() + daysToMonday);
    currentWeekStart.setHours(0, 0, 0, 0);

    // Format as YYYY-MM-DD
    const year = currentWeekStart.getFullYear();
    const month = String(currentWeekStart.getMonth() + 1).padStart(2, '0');
    const day = String(currentWeekStart.getDate()).padStart(2, '0');
    const weekStartStr = `${year}-${month}-${day}`;

    // Check if there's an active weekly goal for current week
    const { data, error } = await supabase
      .from('vk_goal_periods')
      .select('id')
      .eq('user_id', userId)
      .eq('period_type', 'weekly')
      .eq('start_date', weekStartStr)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found
      console.error('Error checking weekly reset:', error);
      return {
        needsReset: false,
        currentWeekStart,
        hasActiveWeeklyGoal: false,
      };
    }

    const hasActiveWeeklyGoal = !!data;
    const needsReset = !hasActiveWeeklyGoal;

    return {
      needsReset,
      currentWeekStart,
      hasActiveWeeklyGoal,
    };
  } catch (err) {
    console.error('Error checking weekly reset:', err);
    return {
      needsReset: false,
      currentWeekStart: new Date(),
      hasActiveWeeklyGoal: false,
    };
  }
}

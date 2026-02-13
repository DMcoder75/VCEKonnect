import { supabase } from './supabase.web';

// Types
export interface GoalPeriod {
  id: string;
  periodType: 'weekly' | 'monthly' | 'term' | 'yearly';
  periodName: string;
  startDate: string;
  endDate: string;
  targetHours: number;
  achievedMinutes: number;
  achievedHours: number;
  progressPercent: number;
  subjects?: GoalSubject[];
}

export interface GoalSubject {
  subjectId: string;
  targetHours: number;
  achievedMinutes: number;
  achievedHours: number;
  progressPercent: number;
}

export interface ActiveGoalsResponse {
  weekly: GoalPeriod | null;
  monthly: GoalPeriod | null;
  term: GoalPeriod | null;
}

export interface SaveGoalsPayload {
  weekly?: {
    period_name: string;
    start_date: string;
    end_date: string;
    total_hours: number;
    subjects: { subject_id: string; hours: number }[];
  };
  monthly?: {
    period_name: string;
    start_date: string;
    end_date: string;
    total_hours: number;
    subjects: { subject_id: string; hours: number }[];
  };
  term?: {
    period_name: string;
    start_date: string;
    end_date: string;
    total_hours: number;
    subjects: { subject_id: string; hours: number }[];
  };
}

/**
 * Get all active goals with current progress
 * Returns weekly, monthly, and term goals with auto-calculated progress
 */
export async function getActiveGoals(userId: string): Promise<ActiveGoalsResponse | null> {
  try {
    const { data, error } = await supabase.rpc('get_active_goals', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Failed to fetch active goals:', error);
      return null;
    }

    return data as ActiveGoalsResponse;
  } catch (err) {
    console.error('Error fetching active goals:', err);
    return null;
  }
}

/**
 * Save goals for weekly, monthly, and term periods
 * Deactivates old goals and creates new ones
 */
export async function saveGoals(
  userId: string,
  payload: SaveGoalsPayload
): Promise<{ error: string | null; data?: any }> {
  try {
    const { data, error } = await supabase.rpc('save_goals', {
      p_user_id: userId,
      p_weekly: payload.weekly || null,
      p_monthly: payload.monthly || null,
      p_term: payload.term || null,
    });

    if (error) return { error: error.message };
    return { error: null, data };
  } catch (err: any) {
    return { error: err.message || 'Failed to save goals' };
  }
}

/**
 * Get goal history for a specific period type
 * Returns past weeks/months/terms with completion status
 */
export async function getGoalHistory(
  userId: string,
  periodType: 'weekly' | 'monthly' | 'term' = 'weekly',
  limit: number = 10
): Promise<GoalPeriod[]> {
  try {
    const { data, error } = await supabase.rpc('get_goal_history', {
      p_user_id: userId,
      p_period_type: periodType,
      p_limit: limit,
    });

    if (error) {
      console.error('Failed to fetch goal history:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error fetching goal history:', err);
    return [];
  }
}

/**
 * Manually recalculate goal progress
 * Useful after timer updates to force refresh
 */
export async function recalculateProgress(userId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.rpc('calculate_goal_progress', {
      p_user_id: userId,
    });

    if (error) return { error: error.message };
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Failed to recalculate progress' };
  }
}

/**
 * Generate default week dates (current week, Mon-Sun)
 */
export function getCurrentWeekDates(): { start: string; end: string; name: string } {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const monthName = monday.toLocaleDateString('en-AU', { month: 'short' });
  
  return {
    start: formatDate(monday),
    end: formatDate(sunday),
    name: `Week ${monday.getDate()}-${sunday.getDate()} ${monthName}`,
  };
}

/**
 * Generate default month dates (current month)
 */
export function getCurrentMonthDates(): { start: string; end: string; name: string } {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const monthName = today.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
  
  return {
    start: formatDate(firstDay),
    end: formatDate(lastDay),
    name: monthName,
  };
}

/**
 * Generate default term dates (VCE Term 2: Feb-Jun 2026)
 */
export function getCurrentTermDates(): { start: string; end: string; name: string } {
  // VCE 2026 terms (adjust as needed)
  const terms = [
    { start: '2026-01-27', end: '2026-04-03', name: 'Term 1 2026' },
    { start: '2026-04-20', end: '2026-06-26', name: 'Term 2 2026' },
    { start: '2026-07-13', end: '2026-09-18', name: 'Term 3 2026' },
    { start: '2026-10-05', end: '2026-12-18', name: 'Term 4 2026' },
  ];
  
  const today = new Date().toISOString().split('T')[0];
  const currentTerm = terms.find(t => today >= t.start && today <= t.end);
  
  return currentTerm || terms[1]; // Default to Term 2
}

import { supabase } from './supabase';
import { StudySession } from '@/types';
import { checkConnection } from './networkService';
import { saveStudySessions, getStudySessions as getOfflineStudySessions } from './offlineDatabase';

// Helper function to get local date string in YYYY-MM-DD format (no timezone conversion)
function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get study sessions for a user
export async function getStudySessions(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<StudySession[]> {
  try {
    const hasConnection = await checkConnection();
    
    if (hasConnection) {
      let query = supabase
        .from('vk_study_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: false });

      const startDateStr = startDate ? getLocalDateString(startDate) : undefined;
      const endDateStr = endDate ? getLocalDateString(endDate) : undefined;

      console.log('🔍 Querying study sessions:', {
        userId,
        startDate: startDateStr,
        endDate: endDateStr,
      });

      // Only apply date filters if dates are provided
      if (startDate && startDateStr) {
        query = query.gte('session_date', startDateStr);
      }
      if (endDate && endDateStr) {
        // Use lte (less than or equal) instead of lt to include the end date
        query = query.lte('session_date', endDateStr);
      }

      const { data, error } = await query;

      console.log('📊 Query result:', { count: data?.length || 0, error: error?.message });
      if (data && data.length > 0) {
        console.log('📝 Sample session:', data[0]);
      }

      if (error) {
        console.error('Failed to fetch sessions:', error);
        // Try offline cache
        console.log('📡 Loading sessions from offline cache');
        const cachedSessions = await getOfflineStudySessions(userId);
        return filterSessionsByDate(cachedSessions, startDate, endDate);
      }

      const sessions = (data || []).map(row => ({
        id: row.id,
        subjectId: row.subject_id,
        startTime: row.start_time,
        endTime: row.end_time,
        duration: row.duration_minutes || 0,
        date: row.session_date,
      }));
      
      // Cache all sessions for offline use (cache complete dataset, not filtered)
      const allSessionsForCache = sessions.map(s => ({
        id: s.id,
        userId: userId,
        subjectId: s.subjectId,
        startTime: s.startTime,
        endTime: s.endTime,
        durationMinutes: s.duration,
        sessionDate: s.date,
        createdAt: s.startTime,
      }));
      await saveStudySessions(allSessionsForCache);
      
      return sessions;
    } else {
      // Offline - load from cache
      console.log('📡 Offline: Loading sessions from cache');
      const cachedSessions = await getOfflineStudySessions(userId);
      return filterSessionsByDate(cachedSessions, startDate, endDate);
    }
  } catch (err) {
    console.error('Error fetching sessions:', err);
    // Try offline cache as last resort
    try {
      const cachedSessions = await getOfflineStudySessions(userId);
      return filterSessionsByDate(cachedSessions, startDate, endDate);
    } catch {
      return [];
    }
  }
}

// Helper function to filter cached sessions by date
function filterSessionsByDate(
  sessions: any[],
  startDate?: Date,
  endDate?: Date
): StudySession[] {
  let filtered = sessions;
  
  if (startDate) {
    const startStr = getLocalDateString(startDate);
    filtered = filtered.filter(s => s.sessionDate >= startStr);
  }
  
  if (endDate) {
    const endStr = getLocalDateString(endDate);
    filtered = filtered.filter(s => s.sessionDate <= endStr);
  }
  
  return filtered.map(s => ({
    id: s.id,
    subjectId: s.subjectId,
    startTime: s.startTime,
    endTime: s.endTime,
    duration: s.durationMinutes || 0,
    date: s.sessionDate,
  }));
}

// Start a study session
export async function startStudySession(
  userId: string,
  subjectId: string
): Promise<{ sessionId: string | null; error: string | null }> {
  try {
    const hasConnection = await checkConnection();
    
    if (!hasConnection) {
      return { sessionId: null, error: 'No Internet connection! Please try after sometime!' };
    }
    
    const now = new Date();
    const { data, error } = await supabase
      .from('vk_study_sessions')
      .insert({
        user_id: userId,
        subject_id: subjectId,
        start_time: now.toISOString(),
        session_date: getLocalDateString(now),
        duration_minutes: 0,
      })
      .select()
      .single();

    if (error) return { sessionId: null, error: error.message };
    return { sessionId: data.id, error: null };
  } catch (err: any) {
    return { sessionId: null, error: err.message || 'Failed to start session' };
  }
}

// End a study session and detect achievements
export async function endStudySession(
  sessionId: string,
  userId: string,
  durationMinutes: number
): Promise<{ 
  error: string | null;
  newAchievements?: any[];
  totalSubjectCompletions?: number;
  perfectWeek?: boolean;
}> {
  try {
    const hasConnection = await checkConnection();
    
    if (!hasConnection) {
      return { error: 'No Internet connection! Please try after sometime!' };
    }
    
    // Step 1: Save study session
    const { error } = await supabase
      .from('vk_study_sessions')
      .update({
        end_time: new Date().toISOString(),
        duration_minutes: Math.round(durationMinutes),
      })
      .eq('id', sessionId);

    if (error) return { error: error.message };

    // Step 2: Detect subject achievements (cookie rewards, streaks, etc.)
    const { data: achievementData, error: achievementError } = await supabase.rpc(
      'detect_subject_achievements',
      { p_user_id: userId }
    );

    if (achievementError) {
      console.error('Failed to detect achievements:', achievementError);
      // Don't fail the session save, just log the error
    }
    
    // Step 3: Refresh cache after session ends
    await refreshSessionsCache(userId);

    return { 
      error: null,
      newAchievements: achievementData?.newAchievements || [],
      totalSubjectCompletions: achievementData?.totalSubjectCompletions || 0,
      perfectWeek: achievementData?.perfectWeek || false,
    };
  } catch (err: any) {
    return { error: err.message || 'Failed to end session' };
  }
}

// Helper function to refresh sessions cache
async function refreshSessionsCache(userId: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('vk_study_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: false });
    
    if (!error && data) {
      const sessionsForCache = data.map(row => ({
        id: row.id,
        userId: userId,
        subjectId: row.subject_id,
        startTime: row.start_time,
        endTime: row.end_time,
        durationMinutes: row.duration_minutes || 0,
        sessionDate: row.session_date,
        createdAt: row.start_time,
      }));
      await saveStudySessions(sessionsForCache);
      console.log('✅ Study sessions cache refreshed');
    }
  } catch (err) {
    console.error('Failed to refresh sessions cache:', err);
  }
}

// Get total study time by subject for a date range
export async function getStudyTimeBySubject(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{ [subjectId: string]: number }> {
  try {
    const sessions = await getStudySessions(userId, startDate, endDate);
    const timeBySubject: { [key: string]: number } = {};

    sessions.forEach(session => {
      if (!timeBySubject[session.subjectId]) {
        timeBySubject[session.subjectId] = 0;
      }
      timeBySubject[session.subjectId] += session.duration;
    });

    return timeBySubject;
  } catch (err) {
    console.error('Error calculating study time:', err);
    return {};
  }
}

// Update goal progress after study session (CRITICAL for real-time updates)
export async function updateGoalProgressAfterSession(
  userId: string,
  subjectId: string,
  durationMinutes: number
): Promise<{ error: string | null }> {
  try {
    // Step 1: Get all active goal periods for this user
    const { data: periods, error: periodsError } = await supabase
      .from('vk_goal_periods')
      .select('id, period_type, start_date, end_date')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (periodsError) {
      console.error('Failed to fetch active periods:', periodsError);
      return { error: periodsError.message };
    }

    if (!periods || periods.length === 0) {
      console.log('No active goal periods found');
      return { error: null }; // Not an error, just no goals set
    }

    // Step 2: For each period, update the subject's achieved minutes
    for (const period of periods) {
      // Check if this subject has a goal for this period
      const { data: goalSubject, error: fetchError } = await supabase
        .from('vk_goal_subjects')
        .select('minutes_achieved')
        .eq('goal_period_id', period.id)
        .eq('subject_id', subjectId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = not found, which is fine
        console.error('Error fetching goal subject:', fetchError);
        continue;
      }

      if (!goalSubject) {
        console.log(`No goal found for subject ${subjectId} in period ${period.id}`);
        continue;
      }

      // Step 3: Increment the minutes_achieved
      const newMinutes = (goalSubject.minutes_achieved || 0) + Math.round(durationMinutes);
      const { error: updateError } = await supabase
        .from('vk_goal_subjects')
        .update({ minutes_achieved: newMinutes })
        .eq('goal_period_id', period.id)
        .eq('subject_id', subjectId);

      if (updateError) {
        console.error('Failed to update goal subject:', updateError);
        continue;
      }

      // Step 4: Recalculate period total using the SQL function
      const { error: calcError } = await supabase.rpc('calculate_goal_progress', {
        p_period_id: period.id,
      });

      if (calcError) {
        console.error('Failed to recalculate progress:', calcError);
      }
    }

    return { error: null };
  } catch (err: any) {
    console.error('Error updating goal progress:', err);
    return { error: err.message || 'Failed to update goal progress' };
  }
}

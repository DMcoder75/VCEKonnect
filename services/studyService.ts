import { supabase } from './supabase';
import { StudySession } from '@/types';

// Get study sessions for a user
export async function getStudySessions(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<StudySession[]> {
  try {
    let query = supabase
      .from('vk_study_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: false });

    if (startDate) {
      query = query.gte('session_date', startDate.toISOString().split('T')[0]);
    }
    if (endDate) {
      query = query.lt('session_date', endDate.toISOString().split('T')[0]);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch sessions:', error);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      subjectId: row.subject_id,
      startTime: row.start_time,
      endTime: row.end_time,
      duration: row.duration_minutes || 0,
      date: row.session_date,
    }));
  } catch (err) {
    console.error('Error fetching sessions:', err);
    return [];
  }
}

// Start a study session
export async function startStudySession(
  userId: string,
  subjectId: string
): Promise<{ sessionId: string | null; error: string | null }> {
  try {
    const now = new Date();
    const { data, error } = await supabase
      .from('vk_study_sessions')
      .insert({
        user_id: userId,
        subject_id: subjectId,
        start_time: now.toISOString(),
        session_date: now.toISOString().split('T')[0],
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

// End a study session
export async function endStudySession(
  sessionId: string,
  durationMinutes: number
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('vk_study_sessions')
      .update({
        end_time: new Date().toISOString(),
        duration_minutes: Math.round(durationMinutes),
      })
      .eq('id', sessionId);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Failed to end session' };
  }
}

// Get total study time by subject for a date range
export async function getStudyTimeBySubject(
  userId: string,
  startDate: Date,
  endDate: Date
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

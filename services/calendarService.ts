import { supabase as getSupabaseClient } from '@/services/supabase.web';

export interface CalendarEvent {
  id: string;
  subject_id: string;
  subject_code?: string;
  subject_name?: string;
  event_date: string;
  event_type: 'SAC' | 'Assessment' | 'Exam' | 'MockExam' | 'GAT';
  title: string;
  notes?: string;
  duration_minutes?: number;
  is_completed: boolean;
  completed_at?: string;
  days_remaining?: number;
  urgency_level?: 'red' | 'orange' | 'yellow' | 'green';
}

export interface CreateEventData {
  user_id: string;
  subject_id: string;
  event_date: string;
  event_type: 'SAC' | 'Assessment' | 'Exam' | 'MockExam' | 'GAT';
  title: string;
  notes?: string;
  duration_minutes?: number;
}

export interface UpdateEventData {
  subject_id?: string;
  event_date?: string;
  event_type?: 'SAC' | 'Assessment' | 'Exam' | 'MockExam' | 'GAT';
  title?: string;
  notes?: string;
  duration_minutes?: number;
}

/**
 * Get upcoming events with countdown and urgency level
 */
export async function getUpcomingEvents(
  userId: string,
  limit: number = 10
): Promise<{ data: CalendarEvent[] | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient;
    const { data, error } = await supabase.rpc('get_upcoming_events', {
      p_user_id: userId,
      p_limit: limit,
    });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch upcoming events',
    };
  }
}

/**
 * Get events within a specific date range
 */
export async function getEventsByDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<{ data: CalendarEvent[] | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient;
    const { data, error } = await supabase.rpc('get_events_by_date_range', {
      p_user_id: userId,
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch events by date range',
    };
  }
}

/**
 * Get weekly view of events
 */
export async function getEventsByWeek(
  userId: string,
  weekStart: string
): Promise<{ data: CalendarEvent[] | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient;
    const { data, error } = await supabase.rpc('get_events_by_week', {
      p_user_id: userId,
      p_week_start: weekStart,
    });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch weekly events',
    };
  }
}

/**
 * Create a new calendar event
 */
export async function createEvent(
  eventData: CreateEventData
): Promise<{ data: CalendarEvent | null; error: string | null }> {
  try {
    console.log('🔧 [calendarService] createEvent called with:', JSON.stringify(eventData, null, 2));
    
    const supabase = getSupabaseClient;
    console.log('🔧 [calendarService] Supabase client obtained');
    
    const { data, error } = await supabase
      .from('vk_calendar_events')
      .insert([eventData])
      .select(
        `
        *,
        vk_vce_subjects!inner (
          code,
          name
        )
      `
      )
      .single();

    console.log('🔧 [calendarService] Insert response:', { data, error });

    if (error) {
      console.log('❌ [calendarService] Insert error:', error.message);
      return { data: null, error: error.message };
    }

    // Transform response to match CalendarEvent interface
    const transformedData: CalendarEvent = {
      id: data.id,
      subject_id: data.subject_id,
      subject_code: data.vk_vce_subjects?.code,
      subject_name: data.vk_vce_subjects?.name,
      event_date: data.event_date,
      event_type: data.event_type,
      title: data.title,
      notes: data.notes,
      duration_minutes: data.duration_minutes,
      is_completed: data.is_completed,
      completed_at: data.completed_at,
    };

    console.log('✅ [calendarService] Event created successfully:', transformedData.id);
    return { data: transformedData, error: null };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to create event';
    console.log('💥 [calendarService] Exception:', errorMsg);
    return {
      data: null,
      error: errorMsg,
    };
  }
}

/**
 * Update an existing calendar event
 */
export async function updateEvent(
  eventId: string,
  userId: string,
  updates: UpdateEventData
): Promise<{ data: CalendarEvent | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient;
    const { data, error } = await supabase
      .from('vk_calendar_events')
      .update(updates)
      .eq('id', eventId)
      .eq('user_id', userId)
      .select(
        `
        *,
        vk_vce_subjects!inner (
          code,
          name
        )
      `
      )
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    const transformedData: CalendarEvent = {
      id: data.id,
      subject_id: data.subject_id,
      subject_code: data.vk_vce_subjects?.code,
      subject_name: data.vk_vce_subjects?.name,
      event_date: data.event_date,
      event_type: data.event_type,
      title: data.title,
      notes: data.notes,
      duration_minutes: data.duration_minutes,
      is_completed: data.is_completed,
      completed_at: data.completed_at,
    };

    return { data: transformedData, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to update event',
    };
  }
}

/**
 * Mark event as complete
 */
export async function markEventComplete(
  eventId: string,
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = getSupabaseClient;
    const { data, error } = await supabase.rpc('mark_event_complete', {
      p_event_id: eventId,
      p_user_id: userId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: data === true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to mark event complete',
    };
  }
}

/**
 * Delete a calendar event
 */
export async function deleteEvent(
  eventId: string,
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = getSupabaseClient;
    const { error } = await supabase
      .from('vk_calendar_events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete event',
    };
  }
}

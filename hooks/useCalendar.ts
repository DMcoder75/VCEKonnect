import { useState, useEffect, useCallback } from 'react';
import {
  getUpcomingEvents,
  getEventsByDateRange,
  getEventsByWeek,
  createEvent,
  updateEvent,
  markEventComplete,
  deleteEvent,
  CalendarEvent,
  CreateEventData,
  UpdateEventData,
} from '@/services/calendarService';

export function useCalendar(userId: string | undefined) {
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUpcomingEvents = useCallback(
    async (limit: number = 10) => {
      if (!userId) {
        setUpcomingEvents([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error: err } = await getUpcomingEvents(userId, limit);

      if (err) {
        setError(err);
        setUpcomingEvents([]);
      } else {
        setUpcomingEvents(data || []);
      }

      setLoading(false);
    },
    [userId]
  );

  const loadEventsByDateRange = useCallback(
    async (startDate: string, endDate: string) => {
      if (!userId) return { data: [], error: null };

      const { data, error: err } = await getEventsByDateRange(userId, startDate, endDate);
      return { data: data || [], error: err };
    },
    [userId]
  );

  const loadEventsByWeek = useCallback(
    async (weekStart: string) => {
      if (!userId) return { data: [], error: null };

      const { data, error: err } = await getEventsByWeek(userId, weekStart);
      return { data: data || [], error: err };
    },
    [userId]
  );

  const addEvent = useCallback(
    async (eventData: Omit<CreateEventData, 'user_id'>) => {
      console.log('🪝 [useCalendar] addEvent called');
      console.log('🪝 [useCalendar] userId:', userId);
      console.log('🪝 [useCalendar] eventData:', JSON.stringify(eventData, null, 2));
      
      if (!userId) {
        console.log('❌ [useCalendar] No userId, returning error');
        return { data: null, error: 'User not authenticated' };
      }

      const fullEventData = {
        ...eventData,
        user_id: userId,
      };
      
      console.log('🪝 [useCalendar] Calling createEvent with:', JSON.stringify(fullEventData, null, 2));
      
      const { data, error: err } = await createEvent(fullEventData);

      console.log('🪝 [useCalendar] createEvent returned:', { data, error: err });

      if (!err && data) {
        console.log('✅ [useCalendar] Event created, refreshing list');
        // Refresh upcoming events after adding
        await loadUpcomingEvents();
      } else if (err) {
        console.log('❌ [useCalendar] Error from createEvent:', err);
      }

      return { data, error: err };
    },
    [userId, loadUpcomingEvents]
  );

  const editEvent = useCallback(
    async (eventId: string, updates: UpdateEventData) => {
      if (!userId) return { data: null, error: 'User not authenticated' };

      const { data, error: err } = await updateEvent(eventId, userId, updates);

      if (!err && data) {
        // Refresh upcoming events after updating
        await loadUpcomingEvents();
      }

      return { data, error: err };
    },
    [userId, loadUpcomingEvents]
  );

  const completeEvent = useCallback(
    async (eventId: string) => {
      if (!userId) return { success: false, error: 'User not authenticated' };

      const { success, error: err } = await markEventComplete(eventId, userId);

      if (success) {
        // Refresh upcoming events after completing
        await loadUpcomingEvents();
      }

      return { success, error: err };
    },
    [userId, loadUpcomingEvents]
  );

  const removeEvent = useCallback(
    async (eventId: string) => {
      if (!userId) return { success: false, error: 'User not authenticated' };

      const { success, error: err } = await deleteEvent(eventId, userId);

      if (success) {
        // Refresh upcoming events after deleting
        await loadUpcomingEvents();
      }

      return { success, error: err };
    },
    [userId, loadUpcomingEvents]
  );

  useEffect(() => {
    loadUpcomingEvents();
  }, [loadUpcomingEvents]);

  return {
    upcomingEvents,
    loading,
    error,
    loadUpcomingEvents,
    loadEventsByDateRange,
    loadEventsByWeek,
    addEvent,
    editEvent,
    completeEvent,
    removeEvent,
  };
}

-- =====================================================
-- Fix Calendar to Show ALL Events (Not Just Upcoming)
-- =====================================================
-- Issue: get_upcoming_events filters out past and completed events
-- Solution: Return all events for the user, sorted by date
-- Frontend will categorize them appropriately
-- Date: 2026-02-19
-- =====================================================

-- =====================================================
-- UPDATE: get_upcoming_events (now returns ALL events)
-- =====================================================

DROP FUNCTION IF EXISTS public.get_upcoming_events(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_upcoming_events(
  p_user_id uuid,
  p_limit integer DEFAULT 50  -- Increased default to show more events
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  subject_id text,
  subject_code text,
  subject_name text,
  event_date date,
  event_type text,
  title text,
  notes text,
  duration_minutes integer,
  is_completed boolean,
  completed_at timestamptz,
  score_achieved numeric,
  score_total numeric,
  score_percentage numeric,
  days_remaining integer,
  urgency_level text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.user_id,
    e.subject_id,
    s.code as subject_code,
    s.name as subject_name,
    e.event_date,
    e.event_type,
    e.title,
    e.notes,
    e.duration_minutes,
    e.is_completed,
    e.completed_at,
    e.score_achieved,
    e.score_total,
    e.score_percentage,
    (e.event_date - CURRENT_DATE)::integer as days_remaining,
    CASE
      WHEN (e.event_date - CURRENT_DATE) <= 2 THEN 'red'
      WHEN (e.event_date - CURRENT_DATE) <= 7 THEN 'orange'
      WHEN (e.event_date - CURRENT_DATE) <= 14 THEN 'yellow'
      ELSE 'green'
    END as urgency_level
  FROM public.vk_calendar_events e
  LEFT JOIN public.vk_subjects s ON e.subject_id = s.id
  WHERE e.user_id = p_user_id
  -- REMOVED: Date and completion filters to show ALL events
  ORDER BY 
    -- Show incomplete events first, then completed
    e.is_completed ASC,
    -- Then sort by date (closest first for incomplete, recent first for completed)
    CASE 
      WHEN e.is_completed = false THEN e.event_date
      ELSE NULL
    END ASC NULLS LAST,
    CASE 
      WHEN e.is_completed = true THEN e.completed_at
      ELSE NULL
    END DESC NULLS LAST,
    e.created_at DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.get_upcoming_events IS 'Get all calendar events for a user (past and future, complete and incomplete)';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Calendar Event Display Fix Applied';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ get_upcoming_events now returns:';
  RAISE NOTICE '   - All events (past + future)';
  RAISE NOTICE '   - All statuses (incomplete + completed)';
  RAISE NOTICE '   - Sorted by: incomplete first, then by date';
  RAISE NOTICE '';
  RAISE NOTICE 'Events will now show in calendar!';
  RAISE NOTICE '========================================';
END $$;

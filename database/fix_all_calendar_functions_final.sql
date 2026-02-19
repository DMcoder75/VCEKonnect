-- =====================================================
-- COMPREHENSIVE FIX: All Calendar Functions
-- =====================================================
-- Issue: Functions still reference vk_vce_subjects
-- Solution: Drop and recreate ALL calendar functions with unified vk_subjects
-- Date: 2026-02-19
-- =====================================================

-- =====================================================
-- STEP 1: Drop all existing calendar functions
-- =====================================================

DROP FUNCTION IF EXISTS public.get_upcoming_events(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_events_by_date_range(uuid, date, date) CASCADE;
DROP FUNCTION IF EXISTS public.get_events_by_week(uuid, date) CASCADE;
DROP FUNCTION IF EXISTS public.get_next_event_number(uuid, text) CASCADE;

-- =====================================================
-- STEP 2: Recreate get_upcoming_events (ALL EVENTS)
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_upcoming_events(
  p_user_id uuid,
  p_limit integer DEFAULT 100
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
    COALESCE(s.code, e.subject_id) as subject_code,
    COALESCE(s.name, e.subject_id) as subject_name,
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
  ORDER BY 
    e.is_completed ASC,
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

COMMENT ON FUNCTION public.get_upcoming_events IS 'Get all calendar events for a user with unified subjects table';

-- =====================================================
-- STEP 3: Recreate get_events_by_date_range
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_events_by_date_range(
  p_user_id uuid,
  p_start_date date,
  p_end_date date
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
  score_percentage numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.user_id,
    e.subject_id,
    COALESCE(s.code, e.subject_id) as subject_code,
    COALESCE(s.name, e.subject_id) as subject_name,
    e.event_date,
    e.event_type,
    e.title,
    e.notes,
    e.duration_minutes,
    e.is_completed,
    e.completed_at,
    e.score_achieved,
    e.score_total,
    e.score_percentage
  FROM public.vk_calendar_events e
  LEFT JOIN public.vk_subjects s ON e.subject_id = s.id
  WHERE e.user_id = p_user_id
    AND e.event_date >= p_start_date
    AND e.event_date <= p_end_date
  ORDER BY e.event_date ASC, e.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_events_by_date_range IS 'Get calendar events within date range with unified subjects table';

-- =====================================================
-- STEP 4: Recreate get_events_by_week
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_events_by_week(
  p_user_id uuid,
  p_week_start date
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
  urgency_level text
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_week_end date;
BEGIN
  v_week_end := p_week_start + interval '6 days';
  
  RETURN QUERY
  SELECT 
    e.id,
    e.user_id,
    e.subject_id,
    COALESCE(s.code, e.subject_id) as subject_code,
    COALESCE(s.name, e.subject_id) as subject_name,
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
    CASE
      WHEN (e.event_date - CURRENT_DATE) <= 2 THEN 'red'
      WHEN (e.event_date - CURRENT_DATE) <= 7 THEN 'orange'
      WHEN (e.event_date - CURRENT_DATE) <= 14 THEN 'yellow'
      ELSE 'green'
    END as urgency_level
  FROM public.vk_calendar_events e
  LEFT JOIN public.vk_subjects s ON e.subject_id = s.id
  WHERE e.user_id = p_user_id
    AND e.event_date >= p_week_start
    AND e.event_date <= v_week_end
  ORDER BY e.event_date ASC, e.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_events_by_week IS 'Get calendar events for a week with unified subjects table';

-- =====================================================
-- STEP 5: Recreate get_next_event_number
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_next_event_number(
  p_user_id uuid,
  p_subject_id text
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_max_number integer;
BEGIN
  SELECT COALESCE(MAX(
    CASE 
      WHEN title ~ '[0-9]+$' THEN 
        SUBSTRING(title FROM '[0-9]+$')::integer
      ELSE 0
    END
  ), 0)
  INTO v_max_number
  FROM public.vk_calendar_events
  WHERE user_id = p_user_id
    AND subject_id = p_subject_id;
  
  RETURN v_max_number + 1;
END;
$$;

COMMENT ON FUNCTION public.get_next_event_number IS 'Get next sequential event number for a subject';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_function_count integer;
BEGIN
  SELECT COUNT(*)
  INTO v_function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'get_upcoming_events',
      'get_events_by_date_range',
      'get_events_by_week',
      'get_next_event_number'
    );

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Calendar Functions Recreated';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Functions recreated: %', v_function_count;
  RAISE NOTICE '';
  RAISE NOTICE 'All calendar functions now use:';
  RAISE NOTICE '  - public.vk_subjects (unified table)';
  RAISE NOTICE '  - LEFT JOIN for safety';
  RAISE NOTICE '  - COALESCE for null handling';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Calendar events should now display!';
  RAISE NOTICE '========================================';
END $$;

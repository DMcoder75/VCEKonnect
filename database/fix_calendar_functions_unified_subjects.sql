-- =====================================================
-- Fix Calendar Functions to Use Unified vk_subjects Table
-- =====================================================
-- Issue: Calendar RPC functions still reference old vk_vce_subjects
-- Solution: Update to query unified vk_subjects table
-- Date: 2026-02-19
-- =====================================================

-- =====================================================
-- FUNCTION 1: get_upcoming_events
-- =====================================================

DROP FUNCTION IF EXISTS public.get_upcoming_events(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_upcoming_events(
  p_user_id uuid,
  p_limit integer DEFAULT 10
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
    AND e.event_date >= CURRENT_DATE
    AND e.is_completed = false
  ORDER BY e.event_date ASC, e.created_at ASC
  LIMIT p_limit;
END;
$$;

-- =====================================================
-- FUNCTION 2: get_events_by_date_range
-- =====================================================

DROP FUNCTION IF EXISTS public.get_events_by_date_range(uuid, date, date);

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
    AND e.event_date >= p_start_date
    AND e.event_date <= p_end_date
  ORDER BY e.event_date ASC, e.created_at ASC;
END;
$$;

-- =====================================================
-- FUNCTION 3: get_events_by_week
-- =====================================================

DROP FUNCTION IF EXISTS public.get_events_by_week(uuid, date);

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
  days_remaining integer,
  urgency_level text
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_week_end date;
BEGIN
  -- Calculate week end (6 days after start)
  v_week_end := p_week_start + INTERVAL '6 days';
  
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
    AND e.event_date >= p_week_start
    AND e.event_date <= v_week_end
  ORDER BY e.event_date ASC, e.created_at ASC;
END;
$$;

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================

-- Test query to verify functions work
-- SELECT * FROM get_upcoming_events('580b9eb1-ea3c-4581-9103-780afbedcc83'::uuid, 10);

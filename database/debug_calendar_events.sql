-- =====================================================
-- Debug Calendar Events - Check if RPC function works
-- =====================================================
-- Run this to verify get_upcoming_events returns data
-- Replace the user_id with your actual user_id
-- =====================================================

-- Check 1: Raw calendar events for user
SELECT 
  e.id,
  e.user_id,
  e.subject_id,
  e.event_date,
  e.event_type,
  e.title,
  e.is_completed
FROM public.vk_calendar_events e
WHERE e.user_id = '580b9eb1-ea3c-4581-9103-780afbedcc83'
ORDER BY e.event_date DESC;

-- Check 2: Verify subjects exist
SELECT 
  s.id,
  s.code,
  s.name,
  s.state_id
FROM public.vk_subjects s
WHERE s.id IN ('EAL', 'RE');

-- Check 3: Test the RPC function directly
SELECT * FROM public.get_upcoming_events(
  '580b9eb1-ea3c-4581-9103-780afbedcc83'::uuid,
  50
);

-- Check 4: Verify RLS policies allow access
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'vk_calendar_events';

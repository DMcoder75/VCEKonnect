-- ================================================================
-- CHECK: Previous weekly goals existence
-- ================================================================
-- Purpose: Verify if user has any weekly goals (active or inactive)
-- ================================================================

-- Replace with your actual user_id
-- Example: '580b9eb1-ea3c-4581-9103-780afbedcc83'

-- Query 1: List ALL weekly goal periods for this user
SELECT 
  id,
  period_name,
  start_date,
  end_date,
  total_hours_target,
  total_minutes_achieved,
  round((total_minutes_achieved::numeric / 60), 2) as achieved_hours,
  is_active,
  created_at
FROM vk_goal_periods
WHERE user_id = 'YOUR_USER_ID_HERE'
  AND period_type = 'weekly'
ORDER BY start_date DESC;

-- Query 2: Check the most recent inactive weekly goal (what copy function looks for)
SELECT 
  gp.id,
  gp.period_name,
  gp.start_date,
  gp.end_date,
  gp.is_active,
  COUNT(gs.id) as subject_count
FROM vk_goal_periods gp
LEFT JOIN vk_goal_subjects gs ON gs.goal_period_id = gp.id
WHERE gp.user_id = 'YOUR_USER_ID_HERE'
  AND gp.period_type = 'weekly'
  AND gp.is_active = false
GROUP BY gp.id, gp.period_name, gp.start_date, gp.end_date, gp.is_active
ORDER BY gp.start_date DESC
LIMIT 1;

-- Query 3: If Query 2 returns a result, check its subject goals
-- Replace GOAL_PERIOD_ID with the id from Query 2
SELECT 
  subject_id,
  hours_target,
  minutes_achieved,
  round((minutes_achieved::numeric / 60), 2) as achieved_hours,
  round((minutes_achieved::numeric / (hours_target * 60)) * 100, 1) as progress_percent
FROM vk_goal_subjects
WHERE goal_period_id = 'GOAL_PERIOD_ID_HERE'
ORDER BY hours_target DESC;

-- Query 4: Check if there are ANY goal periods at all (any type)
SELECT 
  period_type,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE is_active = true) as active_count,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_count
FROM vk_goal_periods
WHERE user_id = 'YOUR_USER_ID_HERE'
GROUP BY period_type;

-- ================================================================
-- INTERPRETATION:
--
-- If Query 1 returns NO rows:
--   → You haven't created any weekly goals yet
--   → Solution: Go to dashboard and tap "Set Study Goals" to create first goals
--
-- If Query 1 returns ONLY active goals (is_active = true):
--   → You have current goals but no previous/inactive ones to copy from
--   → Solution: This is expected for first-time users. Skip copy and create manually
--
-- If Query 1 returns inactive goals (is_active = false):
--   → Previous goals exist! The copy function should work
--   → Check Query 3 to see what subjects would be copied
-- ================================================================

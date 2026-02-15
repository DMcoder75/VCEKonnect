-- ================================================================
-- CHECK RAW DATA: vk_goal_periods and vk_goal_subjects tables
-- ================================================================
-- Purpose: See actual data in the tables to diagnose the issue
-- ================================================================

-- Replace with your actual user_id
-- Example: '580b9eb1-ea3c-4581-9103-780afbedcc83'

-- Query 1: Show ALL goal periods for this user (no filters)
SELECT 
  id,
  user_id,
  period_type,
  period_name,
  start_date,
  end_date,
  total_hours_target,
  total_minutes_achieved,
  is_active,  -- THIS IS KEY - shows if goal is active or inactive
  created_at
FROM vk_goal_periods
WHERE user_id = 'YOUR_USER_ID_HERE'
ORDER BY created_at DESC;

-- Query 2: Count goals by type and status
SELECT 
  period_type,
  is_active,
  COUNT(*) as count
FROM vk_goal_periods
WHERE user_id = 'YOUR_USER_ID_HERE'
GROUP BY period_type, is_active
ORDER BY period_type, is_active;

-- Query 3: Show ALL goal subjects (linked to periods)
SELECT 
  gs.id,
  gs.goal_period_id,
  gp.period_name,
  gp.period_type,
  gp.is_active as period_is_active,
  gs.subject_id,
  gs.hours_target,
  gs.minutes_achieved,
  round((gs.minutes_achieved::numeric / 60), 2) as achieved_hours
FROM vk_goal_subjects gs
JOIN vk_goal_periods gp ON gp.id = gs.goal_period_id
WHERE gp.user_id = 'YOUR_USER_ID_HERE'
ORDER BY gp.created_at DESC, gs.subject_id;

-- Query 4: Check if there are ANY weekly goals (active or inactive)
SELECT 
  COUNT(*) as total_weekly_goals,
  COUNT(*) FILTER (WHERE is_active = true) as active_count,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_count
FROM vk_goal_periods
WHERE user_id = 'YOUR_USER_ID_HERE'
  AND period_type = 'weekly';

-- ================================================================
-- INTERPRETATION:
--
-- If Query 1 returns NO rows:
--   → No goals have been created yet
--   → Solution: Create goals first via dashboard "Set Study Goals"
--
-- If Query 1 shows ONLY is_active = true:
--   → All goals are still active (current week)
--   → No previous/inactive goals to copy from
--   → Solution: This is normal for first week - create goals manually
--
-- If Query 1 shows is_active = false:
--   → Previous goals exist!
--   → The copy function SHOULD work
--   → Check Query 3 to see the subject breakdown
-- ================================================================

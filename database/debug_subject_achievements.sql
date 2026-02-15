-- ================================================================
-- DEBUG SCRIPT: Check Subject Achievements System
-- ================================================================
-- Purpose: Verify if subject completions and achievements are being recorded
-- Run these queries to diagnose the subject rewards system
-- ================================================================

-- ================================================================
-- 1. CHECK SUBJECT COMPLETIONS (100%+ subject goals)
-- ================================================================
-- This shows all subjects that reached 100%+ completion
SELECT 
  sc.id,
  sc.user_id,
  sc.subject_id,
  sc.completion_percent,
  sc.completed_at,
  gp.period_name,
  gp.period_type
FROM vk_subject_completions sc
JOIN vk_goal_periods gp ON gp.id = sc.goal_period_id
ORDER BY sc.completed_at DESC
LIMIT 20;

-- Expected: Should show rows when you complete a subject at 100%+
-- If empty: Subject completions are not being recorded


-- ================================================================
-- 2. CHECK SUBJECT ACHIEVEMENTS (Cookie, Pizza, Ice Cream rewards)
-- ================================================================
-- This shows all subject-related achievements earned
SELECT 
  id,
  user_id,
  achievement_type,
  achievement_name,
  achievement_description,
  icon_name,
  earned_at,
  metadata
FROM vk_achievements
WHERE achievement_type LIKE 'subject_%'
ORDER BY earned_at DESC;

-- Expected: Should show achievements like:
-- - subject_first_completion (Cookie Time!)
-- - subject_5_completions (Sweet Streak!)
-- - subject_perfect_week (Perfect Week!)
-- - subject_overachiever (Overachiever!)
-- If empty: Achievements are not being awarded


-- ================================================================
-- 3. CHECK CURRENT SUBJECT PROGRESS (to see if any are at 100%+)
-- ================================================================
-- This shows your current subject goals and their progress
SELECT 
  gs.subject_id,
  gs.hours_target,
  gs.minutes_achieved,
  ROUND((gs.minutes_achieved / 60.0 / gs.hours_target * 100)::numeric, 1) as completion_percent,
  gp.period_name,
  gp.period_type,
  gp.is_active
FROM vk_goal_subjects gs
JOIN vk_goal_periods gp ON gp.id = gs.goal_period_id
WHERE gp.is_active = true
  AND gs.hours_target > 0
ORDER BY completion_percent DESC;

-- Expected: Shows which subjects are close to or above 100%
-- If any show 100%+, they should trigger achievements


-- ================================================================
-- 4. MANUALLY TRIGGER SUBJECT ACHIEVEMENT DETECTION
-- ================================================================
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID
-- This will detect and award any missing achievements
SELECT detect_subject_achievements('YOUR_USER_ID_HERE');

-- Expected output:
-- {
--   "newAchievements": [...],
--   "totalSubjectCompletions": X,
--   "perfectWeek": true/false
-- }


-- ================================================================
-- 5. CHECK SUBJECT STREAKS (consecutive weeks at 100%+)
-- ================================================================
SELECT 
  ss.subject_id,
  ss.current_streak,
  ss.longest_streak,
  ss.last_completion_week,
  ss.updated_at
FROM vk_subject_streaks ss
WHERE ss.user_id = 'YOUR_USER_ID_HERE'
  AND ss.current_streak > 0
ORDER BY ss.current_streak DESC;

-- Expected: Shows subjects with active streaks
-- If empty: No consecutive 100%+ weeks yet


-- ================================================================
-- 6. GET YOUR USER ID (if you don't know it)
-- ================================================================
SELECT id, email, name FROM vk_users LIMIT 10;


-- ================================================================
-- 7. CHECK IF detect_subject_achievements FUNCTION EXISTS
-- ================================================================
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'detect_subject_achievements';

-- Expected: Should return one row with the function definition
-- If empty: Function was not created


-- ================================================================
-- TROUBLESHOOTING STEPS:
-- ================================================================
-- 
-- ISSUE: No subject completions recorded
-- FIX: The detect_subject_achievements() function should be called
--      after study sessions end. Check if endStudySession() in
--      services/studyService.ts is calling the RPC function.
--
-- ISSUE: No achievements awarded despite completions
-- FIX: Run query #4 manually to trigger detection.
--      If it returns newAchievements, the system works but
--      wasn't being called automatically.
--
-- ISSUE: Function doesn't exist
-- FIX: Re-run database/vk_subject_achievements.sql
--
-- ================================================================

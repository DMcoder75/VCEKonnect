-- ================================================================
-- CHECK: Achievement metadata structure
-- ================================================================
-- Purpose: Verify if subject_code is being stored in achievement metadata
-- ================================================================

-- 1. Check existing achievements metadata
SELECT 
  id,
  achievement_type,
  achievement_name,
  metadata,
  earned_at
FROM vk_achievements
WHERE user_id = '580b9eb1-ea3c-4581-9103-780afbedcc83'
ORDER BY earned_at DESC
LIMIT 5;

-- 2. Check subject completions to see subject_id
SELECT 
  id,
  subject_id,
  completion_percent,
  completed_at
FROM vk_subject_completions
WHERE user_id = '580b9eb1-ea3c-4581-9103-780afbedcc83'
ORDER BY completed_at DESC
LIMIT 5;

-- ================================================================
-- If metadata is empty or doesn't contain subject_code:
-- We need to update the detect_subject_achievements() function
-- to include subject_id/subject_code in the metadata JSONB field
-- ================================================================

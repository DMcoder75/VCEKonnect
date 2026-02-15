-- ================================================================
-- FIX: Add unique constraint to vk_achievements table
-- ================================================================
-- Purpose: Enable ON CONFLICT detection in detect_subject_achievements()
-- Error: "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- ================================================================

-- Add unique constraint on (user_id, achievement_type)
-- This ensures each user can only earn each achievement type once
ALTER TABLE vk_achievements
  ADD CONSTRAINT vk_achievements_user_achievement_unique 
  UNIQUE (user_id, achievement_type);

-- Verify the constraint was created
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'vk_achievements'::regclass
  AND conname = 'vk_achievements_user_achievement_unique';

-- ================================================================
-- EXPECTED OUTPUT:
-- constraint_name: vk_achievements_user_achievement_unique
-- constraint_type: u (unique)
-- constraint_definition: UNIQUE (user_id, achievement_type)
-- ================================================================

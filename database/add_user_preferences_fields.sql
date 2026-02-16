-- Add user preferences fields to vk_users table
-- Migration: Add target_atar and study_hours_per_week columns

-- Add target_atar column (decimal, nullable, range 0-99.95)
ALTER TABLE vk_users
ADD COLUMN IF NOT EXISTS target_atar NUMERIC(5,2) CHECK (target_atar >= 0 AND target_atar <= 99.95);

-- Add study_hours_per_week column (decimal, nullable, range 0-168)
ALTER TABLE vk_users
ADD COLUMN IF NOT EXISTS study_hours_per_week NUMERIC(5,2) CHECK (study_hours_per_week >= 0 AND study_hours_per_week <= 168);

-- Add comments
COMMENT ON COLUMN vk_users.target_atar IS 'Student target ATAR score (0-99.95)';
COMMENT ON COLUMN vk_users.study_hours_per_week IS 'Student available study hours per week (0-168)';

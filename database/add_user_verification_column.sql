-- Add is_verified column to vk_users table
-- Migration created: 2026-02-21
-- Tables affected: vk_users

-- Add is_verified column (default false)
ALTER TABLE vk_users 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Add index for quick lookup of unverified users
CREATE INDEX IF NOT EXISTS idx_vk_users_is_verified 
ON vk_users(is_verified);

-- Add email verification timestamp
ALTER TABLE vk_users 
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

-- Comment for clarity
COMMENT ON COLUMN vk_users.is_verified IS 'Whether user has verified their email address';
COMMENT ON COLUMN vk_users.verified_at IS 'Timestamp when email was verified';

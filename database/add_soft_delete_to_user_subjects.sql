-- =====================================================
-- Add Soft Delete Capabilities to User Subjects
-- =====================================================
-- Purpose: Enable soft delete for user subject selections
-- Preserves historical data when subjects are deselected
-- Affected tables: vk_user_subjects
-- =====================================================

-- Step 1: Add soft delete columns to vk_user_subjects table
ALTER TABLE vk_user_subjects
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

-- Step 2: Set existing records to active (backward compatibility)
UPDATE vk_user_subjects
SET is_active = true, deleted_at = NULL
WHERE is_active IS NULL;

-- Step 3: Make is_active NOT NULL after setting defaults
ALTER TABLE vk_user_subjects
ALTER COLUMN is_active SET NOT NULL,
ALTER COLUMN is_active SET DEFAULT true;

-- Step 4: Create index for performance on soft delete queries
CREATE INDEX IF NOT EXISTS idx_vk_user_subjects_active 
ON vk_user_subjects(user_id, is_active) 
WHERE is_active = true;

-- Step 5: Add comment for documentation
COMMENT ON COLUMN vk_user_subjects.is_active IS 'Soft delete flag - false means subject was deselected by user';
COMMENT ON COLUMN vk_user_subjects.deleted_at IS 'Timestamp when subject was deselected (soft deleted)';

-- Step 6: Create function to soft delete subjects
CREATE OR REPLACE FUNCTION soft_delete_user_subject(
  p_user_id uuid,
  p_subject_id text
) RETURNS void AS $$
BEGIN
  UPDATE vk_user_subjects
  SET 
    is_active = false,
    deleted_at = now(),
    updated_at = now()
  WHERE user_id = p_user_id 
    AND subject_id = p_subject_id
    AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create function to restore (un-delete) a subject
CREATE OR REPLACE FUNCTION restore_user_subject(
  p_user_id uuid,
  p_subject_id text
) RETURNS void AS $$
BEGIN
  UPDATE vk_user_subjects
  SET 
    is_active = true,
    deleted_at = NULL,
    updated_at = now()
  WHERE user_id = p_user_id 
    AND subject_id = p_subject_id
    AND is_active = false;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create function to get active subjects only
CREATE OR REPLACE FUNCTION get_active_user_subjects(p_user_id uuid)
RETURNS TABLE (
  subject_id text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    us.subject_id,
    us.created_at,
    us.updated_at
  FROM vk_user_subjects us
  WHERE us.user_id = p_user_id
    AND us.is_active = true
  ORDER BY us.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create function to get subject history (including deleted)
CREATE OR REPLACE FUNCTION get_user_subject_history(p_user_id uuid)
RETURNS TABLE (
  subject_id text,
  subject_name text,
  subject_code text,
  is_active boolean,
  created_at timestamp with time zone,
  deleted_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    us.subject_id,
    s.name as subject_name,
    s.code as subject_code,
    us.is_active,
    us.created_at,
    us.deleted_at
  FROM vk_user_subjects us
  LEFT JOIN vk_subjects s ON s.id = us.subject_id
  WHERE us.user_id = p_user_id
  ORDER BY us.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check if columns were added successfully
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_name = 'vk_user_subjects'
  AND column_name IN ('is_active', 'deleted_at')
ORDER BY column_name;

-- Check if index was created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'vk_user_subjects'
  AND indexname = 'idx_vk_user_subjects_active';

-- Check if functions were created
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN (
  'soft_delete_user_subject',
  'restore_user_subject',
  'get_active_user_subjects',
  'get_user_subject_history'
)
ORDER BY routine_name;

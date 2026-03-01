-- =====================================================
-- AI Note Summary Feature - Database Setup
-- =====================================================
-- Purpose: Add AI summary usage tracking to vk_users table
-- Affected tables: vk_users
-- Date: 2026-03-01
-- =====================================================

-- Step 1: Add ai_summary_usage field to vk_users table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'vk_users' 
    AND column_name = 'ai_summary_usage'
  ) THEN
    ALTER TABLE public.vk_users 
    ADD COLUMN ai_summary_usage integer DEFAULT 0;
    
    RAISE NOTICE 'Added ai_summary_usage column to vk_users table';
  ELSE
    RAISE NOTICE 'ai_summary_usage column already exists';
  END IF;
END $$;

-- Step 2: Create RPC function to increment AI summary usage
CREATE OR REPLACE FUNCTION increment_ai_summary_usage(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Increment usage counter
  UPDATE public.vk_users
  SET ai_summary_usage = COALESCE(ai_summary_usage, 0) + 1
  WHERE id = p_user_id;
  
  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;
END;
$$;

-- Step 3: Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_ai_summary_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_ai_summary_usage(uuid) TO anon;

-- Step 4: Verify the changes
DO $$
DECLARE
  column_exists boolean;
  function_exists boolean;
BEGIN
  -- Check column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'vk_users' 
    AND column_name = 'ai_summary_usage'
  ) INTO column_exists;
  
  -- Check function
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'increment_ai_summary_usage'
  ) INTO function_exists;
  
  -- Report results
  IF column_exists THEN
    RAISE NOTICE '✅ Column ai_summary_usage exists in vk_users';
  ELSE
    RAISE WARNING '❌ Column ai_summary_usage NOT found in vk_users';
  END IF;
  
  IF function_exists THEN
    RAISE NOTICE '✅ Function increment_ai_summary_usage exists';
  ELSE
    RAISE WARNING '❌ Function increment_ai_summary_usage NOT found';
  END IF;
END $$;

-- =====================================================
-- End of AI Note Summary Feature Setup
-- =====================================================

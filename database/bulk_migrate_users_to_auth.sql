-- =====================================================
-- Bulk Migration: vk_users → auth.users
-- Purpose: Migrate all existing users to Supabase Auth with verified emails
-- WARNING: Run this ONCE with service role key via Supabase Dashboard
-- =====================================================

-- STEP 1: Create migration function
-- This function migrates a single user from vk_users to auth.users
CREATE OR REPLACE FUNCTION migrate_single_user_to_auth(
  p_vk_user_id uuid,
  p_email text,
  p_name text,
  p_year_level integer,
  p_state_id text,
  p_temp_password text DEFAULT 'ChangeMe123!'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auth_user_id uuid;
  v_encrypted_password text;
BEGIN
  -- Check if user already migrated
  IF EXISTS (
    SELECT 1 FROM vk_users 
    WHERE id = p_vk_user_id 
    AND auth_user_id IS NOT NULL
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User already migrated',
      'vk_user_id', p_vk_user_id
    );
  END IF;

  -- Generate encrypted password using pgcrypto
  -- Using crypt() function with bcrypt algorithm
  v_encrypted_password := crypt(p_temp_password, gen_salt('bf'));

  -- Insert into auth.users (requires service role)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_sent_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_sso_user,
    deleted_at
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000', -- Default instance
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    v_encrypted_password,
    NOW(), -- ✅ Email confirmed
    NOW(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object(
      'name', p_name,
      'year_level', p_year_level,
      'state_id', p_state_id
    ),
    NOW(),
    NOW(),
    false,
    NULL
  )
  RETURNING id INTO v_auth_user_id;

  -- Link auth_user_id back to vk_users
  UPDATE vk_users
  SET 
    auth_user_id = v_auth_user_id,
    updated_at = NOW()
  WHERE id = p_vk_user_id;

  -- Create identity record
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    v_auth_user_id,
    jsonb_build_object(
      'sub', v_auth_user_id::text,
      'email', p_email
    ),
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'vk_user_id', p_vk_user_id,
    'auth_user_id', v_auth_user_id,
    'email', p_email,
    'temp_password', p_temp_password
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'vk_user_id', p_vk_user_id,
      'email', p_email
    );
END;
$$;

-- STEP 2: Bulk migration function
-- Migrates ALL unmigrated users with a default temporary password
CREATE OR REPLACE FUNCTION bulk_migrate_all_users_to_auth(
  p_temp_password text DEFAULT 'ChangeMe123!'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_result jsonb;
  v_results jsonb[] := '{}';
  v_success_count integer := 0;
  v_error_count integer := 0;
BEGIN
  -- Loop through all unmigrated users
  FOR v_user IN 
    SELECT id, email, name, year_level, state_id
    FROM vk_users
    WHERE auth_user_id IS NULL
    ORDER BY created_at ASC
  LOOP
    -- Migrate each user
    v_result := migrate_single_user_to_auth(
      v_user.id,
      v_user.email,
      v_user.name,
      v_user.year_level,
      v_user.state_id,
      p_temp_password
    );

    -- Track results
    v_results := array_append(v_results, v_result);
    
    IF (v_result->>'success')::boolean THEN
      v_success_count := v_success_count + 1;
    ELSE
      v_error_count := v_error_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'total_migrated', v_success_count,
    'total_errors', v_error_count,
    'temp_password', p_temp_password,
    'details', to_jsonb(v_results)
  );
END;
$$;

-- STEP 3: Helper function to generate migration report
CREATE OR REPLACE FUNCTION get_migration_status()
RETURNS TABLE (
  total_users bigint,
  migrated_users bigint,
  unmigrated_users bigint,
  migration_percentage numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    COUNT(*) as total_users,
    COUNT(auth_user_id) as migrated_users,
    COUNT(*) FILTER (WHERE auth_user_id IS NULL) as unmigrated_users,
    ROUND(
      (COUNT(auth_user_id)::numeric / NULLIF(COUNT(*), 0)) * 100, 
      2
    ) as migration_percentage
  FROM vk_users;
$$;

-- =====================================================
-- USAGE INSTRUCTIONS
-- =====================================================

-- 1. CHECK CURRENT STATUS
-- SELECT * FROM get_migration_status();

-- 2. MIGRATE ALL USERS (with default temp password 'ChangeMe123!')
-- SELECT bulk_migrate_all_users_to_auth();

-- 3. MIGRATE WITH CUSTOM TEMP PASSWORD
-- SELECT bulk_migrate_all_users_to_auth('MySecureTemp2024!');

-- 4. MIGRATE SINGLE USER (for testing)
-- SELECT migrate_single_user_to_auth(
--   'USER_UUID_HERE',
--   'user@example.com',
--   'John Doe',
--   11,
--   'vic',
--   'TempPassword123!'
-- );

-- =====================================================
-- POST-MIGRATION STEPS
-- =====================================================

-- 1. Notify all users to reset their password on first login
-- 2. Optional: Force password reset by setting a flag in vk_users
ALTER TABLE vk_users ADD COLUMN IF NOT EXISTS requires_password_reset boolean DEFAULT false;

-- Mark all migrated users to reset password
-- UPDATE vk_users 
-- SET requires_password_reset = true 
-- WHERE auth_user_id IS NOT NULL AND password_hash IS NOT NULL;

-- 3. Optional: Clear old password hashes after successful migration
-- UPDATE vk_users SET password_hash = NULL WHERE auth_user_id IS NOT NULL;

-- =====================================================
-- CLEANUP (Optional - run after confirming migration success)
-- =====================================================

-- DROP FUNCTION IF EXISTS migrate_single_user_to_auth(uuid, text, text, integer, text, text);
-- DROP FUNCTION IF EXISTS bulk_migrate_all_users_to_auth(text);
-- DROP FUNCTION IF EXISTS get_migration_status();

-- =====================================================
-- Migration: Custom Auth → Supabase Auth
-- Purpose: Migrate from custom bcryptjs auth to Supabase Auth
-- Maintains: Custom email verification via Firebase
-- =====================================================

-- Step 1: Add auth_user_id column to vk_users table
ALTER TABLE vk_users 
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vk_users_auth_user_id ON vk_users(auth_user_id);

-- Step 2: Make password_hash nullable (not needed after migration)
ALTER TABLE vk_users ALTER COLUMN password_hash DROP NOT NULL;

-- Step 3: Create function to sync user profile from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger AS $$
BEGIN
  -- When a new auth.users row is created, check if vk_users entry exists
  -- If not, create it; if yes, link them
  INSERT INTO public.vk_users (
    auth_user_id,
    email,
    name,
    year_level,
    state_id,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Student'),
    COALESCE((NEW.raw_user_meta_data->>'year_level')::integer, 11),
    COALESCE(NEW.raw_user_meta_data->>'state_id', 'vic'),
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO UPDATE SET
    auth_user_id = NEW.id,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Step 5: Update RLS policies for vk_users (SECURE)
DROP POLICY IF EXISTS "Allow anon delete to users" ON vk_users;
DROP POLICY IF EXISTS "Allow anon insert to users" ON vk_users;
DROP POLICY IF EXISTS "Allow anon update to users" ON vk_users;
DROP POLICY IF EXISTS "Public can select for authentication" ON vk_users;
DROP POLICY IF EXISTS "Users can update own profile" ON vk_users;

-- Users can only read their own data
CREATE POLICY "Users can view own profile"
  ON vk_users FOR SELECT
  USING (auth.uid() = auth_user_id);

-- Users can only update their own data (premium fields will be read-only via application logic)
CREATE POLICY "Users can update own profile"
  ON vk_users FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- No direct deletes (handle via Edge Function if needed)
CREATE POLICY "No direct user deletion"
  ON vk_users FOR DELETE
  USING (false);

-- No direct inserts (created via trigger from auth.users)
CREATE POLICY "No direct user creation"
  ON vk_users FOR INSERT
  WITH CHECK (false);

-- Step 6: Update RLS policies for vk_subject_scores
DROP POLICY IF EXISTS "Allow anon access to scores" ON vk_subject_scores;
DROP POLICY IF EXISTS "Users can view own scores" ON vk_subject_scores;
DROP POLICY IF EXISTS "Users can insert own scores" ON vk_subject_scores;
DROP POLICY IF EXISTS "Users can update own scores" ON vk_subject_scores;
DROP POLICY IF EXISTS "Users can delete own scores" ON vk_subject_scores;

CREATE POLICY "Users can view own scores"
  ON vk_subject_scores FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM vk_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own scores"
  ON vk_subject_scores FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM vk_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own scores"
  ON vk_subject_scores FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM vk_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own scores"
  ON vk_subject_scores FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM vk_users WHERE auth_user_id = auth.uid()
    )
  );

-- Step 7: Update RLS policies for vk_study_sessions
DROP POLICY IF EXISTS "Allow anon access to sessions" ON vk_study_sessions;
DROP POLICY IF EXISTS "Users can view own sessions" ON vk_study_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON vk_study_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON vk_study_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON vk_study_sessions;

CREATE POLICY "Users can view own sessions"
  ON vk_study_sessions FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM vk_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own sessions"
  ON vk_study_sessions FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM vk_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own sessions"
  ON vk_study_sessions FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM vk_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own sessions"
  ON vk_study_sessions FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM vk_users WHERE auth_user_id = auth.uid()
    )
  );

-- Step 8: Update RLS policies for vk_notes
DROP POLICY IF EXISTS "allow_anon_all_operations_on_notes" ON vk_notes;
DROP POLICY IF EXISTS "Users can view own notes" ON vk_notes;
DROP POLICY IF EXISTS "Users can insert own notes" ON vk_notes;
DROP POLICY IF EXISTS "Users can update own notes" ON vk_notes;
DROP POLICY IF EXISTS "Users can delete own notes" ON vk_notes;

CREATE POLICY "Users can view own notes"
  ON vk_notes FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM vk_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own notes"
  ON vk_notes FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM vk_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own notes"
  ON vk_notes FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM vk_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own notes"
  ON vk_notes FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM vk_users WHERE auth_user_id = auth.uid()
    )
  );

-- Step 9: Update RLS policies for vk_calendar_events
DROP POLICY IF EXISTS "allow_anon_access_to_calendar_events" ON vk_calendar_events;
DROP POLICY IF EXISTS "Users can view own calendar events" ON vk_calendar_events;
DROP POLICY IF EXISTS "Users can insert own calendar events" ON vk_calendar_events;
DROP POLICY IF EXISTS "Users can update own calendar events" ON vk_calendar_events;
DROP POLICY IF EXISTS "Users can delete own calendar events" ON vk_calendar_events;

CREATE POLICY "Users can view own calendar events"
  ON vk_calendar_events FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM vk_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own calendar events"
  ON vk_calendar_events FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM vk_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own calendar events"
  ON vk_calendar_events FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM vk_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own calendar events"
  ON vk_calendar_events FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM vk_users WHERE auth_user_id = auth.uid()
    )
  );

-- Step 10: Update RLS policies for vk_user_subjects
DROP POLICY IF EXISTS "allow_anon_access_to_user_subjects" ON vk_user_subjects;
DROP POLICY IF EXISTS "Users can view own subjects" ON vk_user_subjects;
DROP POLICY IF EXISTS "Users can insert own subjects" ON vk_user_subjects;
DROP POLICY IF EXISTS "Users can update own subjects" ON vk_user_subjects;
DROP POLICY IF EXISTS "Users can delete own subjects" ON vk_user_subjects;

CREATE POLICY "Users can view own subjects"
  ON vk_user_subjects FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM vk_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own subjects"
  ON vk_user_subjects FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM vk_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own subjects"
  ON vk_user_subjects FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM vk_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own subjects"
  ON vk_user_subjects FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM vk_users WHERE auth_user_id = auth.uid()
    )
  );

-- Step 11: Update RLS policies for vk_premium_subscriptions
DROP POLICY IF EXISTS "anon_view_own_subscriptions" ON vk_premium_subscriptions;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON vk_premium_subscriptions;
DROP POLICY IF EXISTS "No direct subscription modification" ON vk_premium_subscriptions;

CREATE POLICY "Users can view own subscriptions"
  ON vk_premium_subscriptions FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM vk_users WHERE auth_user_id = auth.uid()
    )
  );

-- No direct insert/update/delete for subscriptions (handle via Edge Functions/webhooks)
CREATE POLICY "No direct subscription modification"
  ON vk_premium_subscriptions FOR ALL
  USING (false);

-- Step 12: Update RLS policies for AI features
DROP POLICY IF EXISTS "anon_manage_own_whatif_scenarios" ON vk_whatif_scenarios;
DROP POLICY IF EXISTS "Users can manage own whatif scenarios" ON vk_whatif_scenarios;

DROP POLICY IF EXISTS "anon_manage_own_ai_practice_questions" ON vk_ai_practice_questions;
DROP POLICY IF EXISTS "Users can manage own AI practice questions" ON vk_ai_practice_questions;

DROP POLICY IF EXISTS "anon_manage_own_ai_recommendations" ON vk_ai_recommendations;
DROP POLICY IF EXISTS "Users can manage own AI recommendations" ON vk_ai_recommendations;

DROP POLICY IF EXISTS "anon_manage_own_ai_study_plans" ON vk_ai_study_plans;
DROP POLICY IF EXISTS "Users can manage own AI study plans" ON vk_ai_study_plans;

-- vk_whatif_scenarios
CREATE POLICY "Users can manage own whatif scenarios"
  ON vk_whatif_scenarios FOR ALL
  USING (
    user_id IN (
      SELECT id FROM vk_users WHERE auth_user_id = auth.uid()
    )
  );

-- vk_ai_practice_questions
CREATE POLICY "Users can manage own AI practice questions"
  ON vk_ai_practice_questions FOR ALL
  USING (
    user_id IN (
      SELECT id FROM vk_users WHERE auth_user_id = auth.uid()
    )
  );

-- vk_ai_recommendations
CREATE POLICY "Users can manage own AI recommendations"
  ON vk_ai_recommendations FOR ALL
  USING (
    user_id IN (
      SELECT id FROM vk_users WHERE auth_user_id = auth.uid()
    )
  );

-- vk_ai_study_plans
CREATE POLICY "Users can manage own AI study plans"
  ON vk_ai_study_plans FOR ALL
  USING (
    user_id IN (
      SELECT id FROM vk_users WHERE auth_user_id = auth.uid()
    )
  );

-- Step 13: Helper function to get vk_users.id from auth.uid()
CREATE OR REPLACE FUNCTION public.get_user_id_from_auth()
RETURNS uuid AS $$
BEGIN
  RETURN (SELECT id FROM vk_users WHERE auth_user_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Step 14: Create function to link existing users (migration helper)
-- NOTE: This should be run AFTER users re-login with new system
CREATE OR REPLACE FUNCTION public.migrate_user_to_auth(
  p_email text,
  p_password text
)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_auth_user auth.users;
BEGIN
  -- Check if user exists in vk_users
  SELECT id INTO v_user_id FROM vk_users WHERE email = p_email LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;
  
  -- Create auth.users entry (admin function)
  -- This will be called from Edge Function with service role key
  
  RETURN jsonb_build_object('success', true, 'user_id', v_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 15: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON vk_vce_subjects TO authenticated, anon;

-- Step 16: Comments for documentation
COMMENT ON FUNCTION handle_new_auth_user IS 'Auto-creates vk_users profile when auth.users row is created';
COMMENT ON FUNCTION get_user_id_from_auth IS 'Helper to get vk_users.id from auth.uid() for use in queries';
COMMENT ON COLUMN vk_users.auth_user_id IS 'Links to auth.users.id - primary authentication identity';

-- =====================================================
-- MIGRATION COMPLETE
-- Next steps:
-- 1. Deploy Edge Functions to Supabase
-- 2. Update frontend to use new auth flow
-- 3. Test with new signup flow
-- =====================================================

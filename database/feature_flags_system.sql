-- =====================================================
-- PROGRESSIVE ROLLOUT & ROLLBACK SYSTEM
-- =====================================================
-- Purpose: Implement feature flagging with gradual rollout
-- Target: 10% → 25% → 50% → 75% → 100% user rollout
-- Features: Kill switch, rollback, analytics, audit trail
-- =====================================================

-- =====================================================
-- 1. FEATURE FLAGS TABLE
-- =====================================================
-- Stores all feature flag definitions and current state
CREATE TABLE IF NOT EXISTS public.vk_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text UNIQUE NOT NULL, -- Unique identifier (e.g., 'new_dashboard', 'ai_study_plan')
  feature_name text NOT NULL, -- Display name
  description text, -- What this feature does
  rollout_percentage integer NOT NULL DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  is_enabled boolean NOT NULL DEFAULT true, -- Global kill switch
  target_user_segment text DEFAULT 'all', -- 'all', 'premium', 'year_12', etc.
  rollout_strategy text DEFAULT 'percentage', -- 'percentage', 'whitelist', 'user_ids'
  whitelisted_user_ids jsonb DEFAULT '[]'::jsonb, -- Specific users always get access
  blacklisted_user_ids jsonb DEFAULT '[]'::jsonb, -- Specific users never get access
  min_app_version text, -- Minimum app version required
  max_app_version text, -- Maximum app version (for deprecation)
  start_date timestamp with time zone, -- When rollout can begin
  end_date timestamp with time zone, -- When feature expires/removes
  created_by uuid REFERENCES public.vk_users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_vk_feature_flags_key ON public.vk_feature_flags(feature_key);
CREATE INDEX IF NOT EXISTS idx_vk_feature_flags_enabled ON public.vk_feature_flags(is_enabled);

-- =====================================================
-- 2. USER FEATURE ACCESS TABLE
-- =====================================================
-- Caches which users have access to which features
-- Ensures consistent experience (user doesn't lose feature mid-session)
CREATE TABLE IF NOT EXISTS public.vk_user_feature_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.vk_users(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  has_access boolean NOT NULL DEFAULT false,
  access_granted_at timestamp with time zone DEFAULT now(),
  access_method text, -- 'rollout', 'whitelist', 'admin_override'
  session_id text, -- Track which session first got access
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, feature_key)
);

-- Indexes for fast user lookups
CREATE INDEX IF NOT EXISTS idx_vk_user_feature_access_user ON public.vk_user_feature_access(user_id);
CREATE INDEX IF NOT EXISTS idx_vk_user_feature_access_feature ON public.vk_user_feature_access(feature_key);
CREATE INDEX IF NOT EXISTS idx_vk_user_feature_access_lookup ON public.vk_user_feature_access(user_id, feature_key, has_access);

-- =====================================================
-- 3. FEATURE EVENTS TABLE
-- =====================================================
-- Tracks feature usage, errors, and analytics
CREATE TABLE IF NOT EXISTS public.vk_feature_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.vk_users(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  event_type text NOT NULL, -- 'viewed', 'used', 'error', 'completed'
  event_data jsonb, -- Additional context (error messages, performance metrics, etc.)
  session_id text,
  app_version text,
  platform text, -- 'ios', 'android', 'web'
  created_at timestamp with time zone DEFAULT now()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_vk_feature_events_feature ON public.vk_feature_events(feature_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vk_feature_events_user ON public.vk_feature_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vk_feature_events_type ON public.vk_feature_events(event_type, created_at DESC);

-- =====================================================
-- 4. ROLLOUT HISTORY TABLE
-- =====================================================
-- Audit trail of all rollout changes
CREATE TABLE IF NOT EXISTS public.vk_feature_rollout_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL,
  previous_percentage integer,
  new_percentage integer,
  previous_enabled boolean,
  new_enabled boolean,
  change_reason text, -- 'scheduled_increase', 'rollback', 'emergency_disable'
  changed_by uuid REFERENCES public.vk_users(id),
  affected_user_count integer, -- How many users gained/lost access
  created_at timestamp with time zone DEFAULT now()
);

-- Index for history lookups
CREATE INDEX IF NOT EXISTS idx_vk_feature_rollout_history_feature ON public.vk_feature_rollout_history(feature_key, created_at DESC);

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function: Check if user has access to a feature
-- Returns: boolean
CREATE OR REPLACE FUNCTION check_feature_access(
  p_user_id uuid,
  p_feature_key text,
  p_user_hash integer DEFAULT NULL -- Optional: pass pre-computed hash for performance
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_flag RECORD;
  v_existing_access RECORD;
  v_user_hash integer;
  v_has_access boolean := false;
BEGIN
  -- Get feature flag configuration
  SELECT * INTO v_flag
  FROM vk_feature_flags
  WHERE feature_key = p_feature_key;
  
  -- Feature doesn't exist or is disabled globally
  IF v_flag IS NULL OR v_flag.is_enabled = false THEN
    RETURN false;
  END IF;
  
  -- Check date constraints
  IF v_flag.start_date IS NOT NULL AND now() < v_flag.start_date THEN
    RETURN false;
  END IF;
  IF v_flag.end_date IS NOT NULL AND now() > v_flag.end_date THEN
    RETURN false;
  END IF;
  
  -- Check if user is blacklisted
  IF v_flag.blacklisted_user_ids ? p_user_id::text THEN
    RETURN false;
  END IF;
  
  -- Check if user is whitelisted
  IF v_flag.whitelisted_user_ids ? p_user_id::text THEN
    RETURN true;
  END IF;
  
  -- Check existing access record (for consistency)
  SELECT * INTO v_existing_access
  FROM vk_user_feature_access
  WHERE user_id = p_user_id AND feature_key = p_feature_key;
  
  IF v_existing_access IS NOT NULL THEN
    RETURN v_existing_access.has_access;
  END IF;
  
  -- Calculate deterministic hash for percentage-based rollout
  -- Uses consistent hash function so same user always gets same result
  IF p_user_hash IS NOT NULL THEN
    v_user_hash := p_user_hash;
  ELSE
    -- Hash user_id with feature_key for deterministic but different results per feature
    v_user_hash := abs(hashtext(p_user_id::text || p_feature_key)) % 100;
  END IF;
  
  -- Check if user falls within rollout percentage
  v_has_access := v_user_hash < v_flag.rollout_percentage;
  
  -- Cache the access decision
  INSERT INTO vk_user_feature_access (user_id, feature_key, has_access, access_method)
  VALUES (p_user_id, p_feature_key, v_has_access, 'rollout')
  ON CONFLICT (user_id, feature_key) 
  DO UPDATE SET has_access = v_has_access;
  
  RETURN v_has_access;
END;
$$;

-- Function: Increment rollout percentage
-- Use this to progressively roll out features
CREATE OR REPLACE FUNCTION increment_rollout(
  p_feature_key text,
  p_new_percentage integer,
  p_changed_by uuid DEFAULT NULL,
  p_reason text DEFAULT 'scheduled_increase'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_percentage integer;
  v_old_enabled boolean;
  v_affected_count integer := 0;
  v_result jsonb;
BEGIN
  -- Validate percentage
  IF p_new_percentage < 0 OR p_new_percentage > 100 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Percentage must be between 0 and 100'
    );
  END IF;
  
  -- Get current state
  SELECT rollout_percentage, is_enabled 
  INTO v_old_percentage, v_old_enabled
  FROM vk_feature_flags
  WHERE feature_key = p_feature_key;
  
  IF v_old_percentage IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Feature flag not found'
    );
  END IF;
  
  -- Update feature flag
  UPDATE vk_feature_flags
  SET rollout_percentage = p_new_percentage,
      updated_at = now()
  WHERE feature_key = p_feature_key;
  
  -- Calculate affected users (approximate)
  IF p_new_percentage > v_old_percentage THEN
    -- Users gaining access
    SELECT COUNT(*) INTO v_affected_count
    FROM vk_users
    WHERE abs(hashtext(id::text || p_feature_key)) % 100 < p_new_percentage
      AND abs(hashtext(id::text || p_feature_key)) % 100 >= v_old_percentage;
  ELSIF p_new_percentage < v_old_percentage THEN
    -- Users losing access (rollback)
    SELECT COUNT(*) INTO v_affected_count
    FROM vk_users
    WHERE abs(hashtext(id::text || p_feature_key)) % 100 >= p_new_percentage
      AND abs(hashtext(id::text || p_feature_key)) % 100 < v_old_percentage;
  END IF;
  
  -- Record in history
  INSERT INTO vk_feature_rollout_history (
    feature_key,
    previous_percentage,
    new_percentage,
    previous_enabled,
    new_enabled,
    change_reason,
    changed_by,
    affected_user_count
  ) VALUES (
    p_feature_key,
    v_old_percentage,
    p_new_percentage,
    v_old_enabled,
    v_old_enabled,
    p_reason,
    p_changed_by,
    v_affected_count
  );
  
  -- Clear cached access for affected users (they'll be recalculated on next check)
  DELETE FROM vk_user_feature_access
  WHERE feature_key = p_feature_key;
  
  RETURN jsonb_build_object(
    'success', true,
    'previous_percentage', v_old_percentage,
    'new_percentage', p_new_percentage,
    'affected_users', v_affected_count
  );
END;
$$;

-- Function: Emergency disable (kill switch)
CREATE OR REPLACE FUNCTION disable_feature(
  p_feature_key text,
  p_changed_by uuid DEFAULT NULL,
  p_reason text DEFAULT 'emergency_disable'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_enabled boolean;
  v_old_percentage integer;
BEGIN
  -- Get current state
  SELECT is_enabled, rollout_percentage
  INTO v_old_enabled, v_old_percentage
  FROM vk_feature_flags
  WHERE feature_key = p_feature_key;
  
  IF v_old_enabled IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Feature flag not found'
    );
  END IF;
  
  -- Disable feature
  UPDATE vk_feature_flags
  SET is_enabled = false,
      updated_at = now()
  WHERE feature_key = p_feature_key;
  
  -- Record in history
  INSERT INTO vk_feature_rollout_history (
    feature_key,
    previous_percentage,
    new_percentage,
    previous_enabled,
    new_enabled,
    change_reason,
    changed_by
  ) VALUES (
    p_feature_key,
    v_old_percentage,
    v_old_percentage,
    v_old_enabled,
    false,
    p_reason,
    p_changed_by
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Feature disabled successfully'
  );
END;
$$;

-- Function: Re-enable feature
CREATE OR REPLACE FUNCTION enable_feature(
  p_feature_key text,
  p_changed_by uuid DEFAULT NULL,
  p_reason text DEFAULT 'manual_enable'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_enabled boolean;
  v_old_percentage integer;
BEGIN
  -- Get current state
  SELECT is_enabled, rollout_percentage
  INTO v_old_enabled, v_old_percentage
  FROM vk_feature_flags
  WHERE feature_key = p_feature_key;
  
  IF v_old_enabled IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Feature flag not found'
    );
  END IF;
  
  -- Enable feature
  UPDATE vk_feature_flags
  SET is_enabled = true,
      updated_at = now()
  WHERE feature_key = p_feature_key;
  
  -- Record in history
  INSERT INTO vk_feature_rollout_history (
    feature_key,
    previous_percentage,
    new_percentage,
    previous_enabled,
    new_enabled,
    change_reason,
    changed_by
  ) VALUES (
    p_feature_key,
    v_old_percentage,
    v_old_percentage,
    v_old_enabled,
    true,
    p_reason,
    p_changed_by
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Feature enabled successfully'
  );
END;
$$;

-- Function: Get feature analytics summary
CREATE OR REPLACE FUNCTION get_feature_analytics(
  p_feature_key text,
  p_days_back integer DEFAULT 7
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_users integer;
  v_active_users integer;
  v_error_count integer;
  v_usage_count integer;
  v_rollout_percentage integer;
  v_result jsonb;
BEGIN
  -- Get current rollout percentage
  SELECT rollout_percentage INTO v_rollout_percentage
  FROM vk_feature_flags
  WHERE feature_key = p_feature_key;
  
  -- Count users with access
  SELECT COUNT(DISTINCT user_id) INTO v_total_users
  FROM vk_user_feature_access
  WHERE feature_key = p_feature_key AND has_access = true;
  
  -- Count active users (used feature in last N days)
  SELECT COUNT(DISTINCT user_id) INTO v_active_users
  FROM vk_feature_events
  WHERE feature_key = p_feature_key
    AND created_at >= now() - (p_days_back || ' days')::interval;
  
  -- Count errors
  SELECT COUNT(*) INTO v_error_count
  FROM vk_feature_events
  WHERE feature_key = p_feature_key
    AND event_type = 'error'
    AND created_at >= now() - (p_days_back || ' days')::interval;
  
  -- Count total usage events
  SELECT COUNT(*) INTO v_usage_count
  FROM vk_feature_events
  WHERE feature_key = p_feature_key
    AND created_at >= now() - (p_days_back || ' days')::interval;
  
  RETURN jsonb_build_object(
    'feature_key', p_feature_key,
    'rollout_percentage', v_rollout_percentage,
    'total_users_with_access', v_total_users,
    'active_users_last_' || p_days_back || '_days', v_active_users,
    'adoption_rate', CASE 
      WHEN v_total_users > 0 THEN ROUND((v_active_users::numeric / v_total_users::numeric) * 100, 2)
      ELSE 0 
    END,
    'error_count', v_error_count,
    'total_events', v_usage_count,
    'error_rate', CASE
      WHEN v_usage_count > 0 THEN ROUND((v_error_count::numeric / v_usage_count::numeric) * 100, 2)
      ELSE 0
    END
  );
END;
$$;

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE public.vk_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vk_user_feature_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vk_feature_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vk_feature_rollout_history ENABLE ROW LEVEL SECURITY;

-- Feature Flags: Allow anon/authenticated to read
CREATE POLICY "allow_public_read_feature_flags"
  ON public.vk_feature_flags FOR SELECT
  TO anon, authenticated
  USING (true);

-- User Feature Access: Users can only see their own access
CREATE POLICY "allow_users_read_own_feature_access"
  ON public.vk_user_feature_access FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow system to insert/update (via functions)
CREATE POLICY "allow_system_manage_feature_access"
  ON public.vk_user_feature_access FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Feature Events: Users can insert their own events
CREATE POLICY "allow_users_insert_feature_events"
  ON public.vk_feature_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Feature Events: Users can read their own events
CREATE POLICY "allow_users_read_own_feature_events"
  ON public.vk_feature_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Rollout History: Public read (for transparency)
CREATE POLICY "allow_public_read_rollout_history"
  ON public.vk_feature_rollout_history FOR SELECT
  TO anon, authenticated
  USING (true);

-- =====================================================
-- 7. AUTO-UPDATE TIMESTAMP TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_feature_flags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vk_feature_flags_updated_at
  BEFORE UPDATE ON public.vk_feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_flags_updated_at();

-- =====================================================
-- 8. EXAMPLE FEATURE FLAGS (Optional - for testing)
-- =====================================================

-- Example: AI Study Plan feature with 10% rollout
INSERT INTO public.vk_feature_flags (feature_key, feature_name, description, rollout_percentage, is_enabled)
VALUES (
  'ai_study_plan',
  'AI-Powered Study Plan',
  'Personalized study plan generated by AI based on user performance and goals',
  10, -- Start at 10%
  true
) ON CONFLICT (feature_key) DO NOTHING;

-- Example: New Dashboard UI with 0% rollout (preparing for launch)
INSERT INTO public.vk_feature_flags (feature_key, feature_name, description, rollout_percentage, is_enabled)
VALUES (
  'new_dashboard_ui',
  'Redesigned Dashboard',
  'New dashboard with improved layout and analytics widgets',
  0, -- Not rolled out yet
  true
) ON CONFLICT (feature_key) DO NOTHING;

-- Example: Advanced Analytics (premium only)
INSERT INTO public.vk_feature_flags (feature_key, feature_name, description, rollout_percentage, is_enabled, target_user_segment)
VALUES (
  'advanced_analytics',
  'Advanced Analytics',
  'Detailed study analytics and performance predictions',
  100, -- All premium users
  true,
  'premium'
) ON CONFLICT (feature_key) DO NOTHING;

-- =====================================================
-- 9. VERIFICATION QUERIES
-- =====================================================

-- Check created tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'vk_feature%'
ORDER BY table_name;

-- Check created functions
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%feature%'
ORDER BY routine_name;

-- List all feature flags
SELECT feature_key, feature_name, rollout_percentage, is_enabled
FROM public.vk_feature_flags
ORDER BY created_at DESC;

-- =====================================================
-- END OF SCRIPT
-- =====================================================

-- =====================================================
-- FAIRPREP PREMIUM FEATURES DATABASE SCHEMA
-- =====================================================
-- Purpose: Add premium subscription tiers and feature usage tracking
-- Tables: premium_subscriptions, whatif_scenarios, ai_study_plans, 
--         ai_recommendations, ai_practice_questions
-- Premium Tiers: Free, Basic ($20/6m), Pro ($40/6m)
-- =====================================================

-- =====================================================
-- 1. ADD PREMIUM TIER TO USERS TABLE
-- =====================================================

-- Add premium_tier column to vk_users (if not exists)
ALTER TABLE vk_users 
ADD COLUMN IF NOT EXISTS premium_tier TEXT DEFAULT 'free' CHECK (premium_tier IN ('free', 'basic', 'pro'));

-- Add premium_expiry column (if not exists) 
ALTER TABLE vk_users 
ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMP WITH TIME ZONE;

-- Add premium_auto_renew flag
ALTER TABLE vk_users 
ADD COLUMN IF NOT EXISTS premium_auto_renew BOOLEAN DEFAULT false;

COMMENT ON COLUMN vk_users.premium_tier IS 'Premium subscription tier: free, basic ($20/6m), pro ($40/6m)';
COMMENT ON COLUMN vk_users.premium_expires_at IS 'Premium subscription expiry timestamp';
COMMENT ON COLUMN vk_users.premium_auto_renew IS 'Whether premium auto-renews at expiry';

-- =====================================================
-- 2. PREMIUM SUBSCRIPTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS vk_premium_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES vk_users(id) ON DELETE CASCADE,
  
  -- Subscription details
  subscription_tier TEXT NOT NULL CHECK (subscription_tier IN ('basic', 'pro')),
  price_aud NUMERIC(10, 2) NOT NULL, -- Price paid in AUD
  duration_months INTEGER NOT NULL DEFAULT 6, -- 6 months typically
  
  -- Dates
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Payment details
  payment_method TEXT, -- 'stripe', 'apple', 'google', etc.
  payment_transaction_id TEXT, -- External payment reference
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
  
  -- Auto-renewal
  auto_renew BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_vk_premium_subscriptions_user_id ON vk_premium_subscriptions(user_id);
CREATE INDEX idx_vk_premium_subscriptions_status ON vk_premium_subscriptions(payment_status);
CREATE INDEX idx_vk_premium_subscriptions_dates ON vk_premium_subscriptions(start_date, end_date);

COMMENT ON TABLE vk_premium_subscriptions IS 'Tracks all premium subscription purchases and renewals';

-- =====================================================
-- 3. WHAT-IF SCENARIOS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS vk_whatif_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES vk_users(id) ON DELETE CASCADE,
  
  -- Scenario details
  scenario_name TEXT, -- Optional user-given name
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Scenario data (JSON format for flexibility)
  subject_scores JSONB NOT NULL, -- Array of {subjectId, sacAverage, examPrediction, studyRank}
  predicted_atar NUMERIC(5, 2) NOT NULL,
  predicted_aggregate NUMERIC(6, 2) NOT NULL,
  
  -- Comparison with current
  current_atar NUMERIC(5, 2), -- User's current ATAR at time of scenario
  atar_difference NUMERIC(5, 2), -- predicted_atar - current_atar
  
  -- Metadata
  notes TEXT, -- User notes about this scenario
  is_favorite BOOLEAN DEFAULT false
);

CREATE INDEX idx_vk_whatif_scenarios_user_id ON vk_whatif_scenarios(user_id);
CREATE INDEX idx_vk_whatif_scenarios_created_at ON vk_whatif_scenarios(created_at DESC);
CREATE INDEX idx_vk_whatif_scenarios_favorite ON vk_whatif_scenarios(user_id, is_favorite) WHERE is_favorite = true;

COMMENT ON TABLE vk_whatif_scenarios IS 'Stores what-if ATAR prediction scenarios (Free: 1/month, Basic: unlimited)';

-- =====================================================
-- 4. AI STUDY PLANS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS vk_ai_study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES vk_users(id) ON DELETE CASCADE,
  
  -- Plan details
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- AI-generated content
  plan_content JSONB NOT NULL, -- Full AI study plan data
  plan_summary TEXT, -- Plain text summary
  
  -- Context used for generation
  context_data JSONB, -- User progress, lagging subjects, upcoming SACs, etc.
  
  -- User interaction
  is_active BOOLEAN DEFAULT true, -- User can mark plan as active/archived
  user_feedback TEXT, -- Optional feedback on plan quality
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5)
);

CREATE INDEX idx_vk_ai_study_plans_user_id ON vk_ai_study_plans(user_id);
CREATE INDEX idx_vk_ai_study_plans_week ON vk_ai_study_plans(week_start_date DESC);
CREATE INDEX idx_vk_ai_study_plans_active ON vk_ai_study_plans(user_id, is_active) WHERE is_active = true;

COMMENT ON TABLE vk_ai_study_plans IS 'AI-generated weekly study plans (Free: 1 try, Basic: 5 stored, Pro: unlimited)';

-- =====================================================
-- 5. AI RECOMMENDATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS vk_ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES vk_users(id) ON DELETE CASCADE,
  
  -- Recommendation details
  subject_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- AI-generated content
  recommendation_type TEXT NOT NULL, -- 'study_strategy', 'resource_suggestion', 'exam_prep', etc.
  recommendation_content JSONB NOT NULL, -- Full AI recommendation data
  recommendation_summary TEXT, -- Plain text summary
  
  -- Context
  context_data JSONB, -- Current subject progress, SAC scores, study hours, etc.
  
  -- User interaction
  is_bookmarked BOOLEAN DEFAULT false,
  user_feedback TEXT,
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5)
);

CREATE INDEX idx_vk_ai_recommendations_user_id ON vk_ai_recommendations(user_id);
CREATE INDEX idx_vk_ai_recommendations_subject ON vk_ai_recommendations(user_id, subject_id);
CREATE INDEX idx_vk_ai_recommendations_created_at ON vk_ai_recommendations(created_at DESC);
CREATE INDEX idx_vk_ai_recommendations_bookmarked ON vk_ai_recommendations(user_id, is_bookmarked) WHERE is_bookmarked = true;

COMMENT ON TABLE vk_ai_recommendations IS 'AI subject recommendations (Free: 1 subject once, Basic: all subjects 5 tries, Pro: unlimited)';

-- =====================================================
-- 6. AI PRACTICE QUESTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS vk_ai_practice_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES vk_users(id) ON DELETE CASCADE,
  
  -- Question set details
  subject_id TEXT NOT NULL,
  topic TEXT, -- Specific topic/chapter
  difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'medium', 'hard', 'exam_level')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- AI-generated content
  questions_content JSONB NOT NULL, -- Array of questions with answers/explanations
  question_count INTEGER NOT NULL DEFAULT 0,
  
  -- User progress
  attempted_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  completion_status TEXT DEFAULT 'not_started' CHECK (completion_status IN ('not_started', 'in_progress', 'completed')),
  
  -- User interaction
  is_bookmarked BOOLEAN DEFAULT false,
  last_attempted_at TIMESTAMP WITH TIME ZONE,
  user_notes TEXT
);

CREATE INDEX idx_vk_ai_practice_questions_user_id ON vk_ai_practice_questions(user_id);
CREATE INDEX idx_vk_ai_practice_questions_subject ON vk_ai_practice_questions(user_id, subject_id);
CREATE INDEX idx_vk_ai_practice_questions_created_at ON vk_ai_practice_questions(created_at DESC);
CREATE INDEX idx_vk_ai_practice_questions_bookmarked ON vk_ai_practice_questions(user_id, is_bookmarked) WHERE is_bookmarked = true;

COMMENT ON TABLE vk_ai_practice_questions IS 'AI-generated practice questions (Free: 1 subject once, Basic: all subjects 5 tries, Pro: unlimited)';

-- =====================================================
-- 7. RLS POLICIES
-- =====================================================

-- Premium Subscriptions: Users can view their own subscriptions
ALTER TABLE vk_premium_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_subscriptions"
  ON vk_premium_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "anon_view_own_subscriptions"
  ON vk_premium_subscriptions FOR SELECT
  TO anon
  USING (true); -- Allow anon access for custom auth system

-- What-If Scenarios: Users can manage their own scenarios
ALTER TABLE vk_whatif_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_whatif_scenarios"
  ON vk_whatif_scenarios FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "anon_manage_own_whatif_scenarios"
  ON vk_whatif_scenarios FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- AI Study Plans: Users can manage their own plans
ALTER TABLE vk_ai_study_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_ai_study_plans"
  ON vk_ai_study_plans FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "anon_manage_own_ai_study_plans"
  ON vk_ai_study_plans FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- AI Recommendations: Users can manage their own recommendations
ALTER TABLE vk_ai_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_ai_recommendations"
  ON vk_ai_recommendations FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "anon_manage_own_ai_recommendations"
  ON vk_ai_recommendations FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- AI Practice Questions: Users can manage their own question sets
ALTER TABLE vk_ai_practice_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_ai_practice_questions"
  ON vk_ai_practice_questions FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "anon_manage_own_ai_practice_questions"
  ON vk_ai_practice_questions FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Function to check if user has active premium subscription
CREATE OR REPLACE FUNCTION has_active_premium(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_premium_tier TEXT;
  v_premium_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT premium_tier, premium_expires_at 
  INTO v_premium_tier, v_premium_expires_at
  FROM vk_users 
  WHERE id = p_user_id;
  
  -- Check if user has basic or pro tier and hasn't expired
  IF v_premium_tier IN ('basic', 'pro') THEN
    IF v_premium_expires_at IS NULL OR v_premium_expires_at > NOW() THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's premium tier
CREATE OR REPLACE FUNCTION get_user_premium_tier(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_premium_tier TEXT;
  v_premium_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT premium_tier, premium_expires_at 
  INTO v_premium_tier, v_premium_expires_at
  FROM vk_users 
  WHERE id = p_user_id;
  
  -- Check if premium has expired
  IF v_premium_tier IN ('basic', 'pro') AND v_premium_expires_at IS NOT NULL THEN
    IF v_premium_expires_at < NOW() THEN
      RETURN 'free'; -- Premium expired
    END IF;
  END IF;
  
  RETURN COALESCE(v_premium_tier, 'free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to count what-if scenarios in current month
CREATE OR REPLACE FUNCTION count_whatif_scenarios_this_month(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM vk_whatif_scenarios
    WHERE user_id = p_user_id
      AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
      AND created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to count AI study plans
CREATE OR REPLACE FUNCTION count_ai_study_plans(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM vk_ai_study_plans WHERE user_id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to count AI recommendations per subject
CREATE OR REPLACE FUNCTION count_ai_recommendations_for_subject(p_user_id UUID, p_subject_id TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) 
    FROM vk_ai_recommendations 
    WHERE user_id = p_user_id AND subject_id = p_subject_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to count AI practice questions per subject
CREATE OR REPLACE FUNCTION count_ai_practice_questions_for_subject(p_user_id UUID, p_subject_id TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) 
    FROM vk_ai_practice_questions 
    WHERE user_id = p_user_id AND subject_id = p_subject_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp for premium_subscriptions
CREATE OR REPLACE FUNCTION update_vk_premium_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vk_premium_subscriptions_updated_at
  BEFORE UPDATE ON vk_premium_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_vk_premium_subscriptions_updated_at();

-- =====================================================
-- DEPLOYMENT COMPLETE
-- =====================================================
-- Next steps:
-- 1. Run this script on your Supabase database
-- 2. Update app code to check premium tiers before feature access
-- 3. Implement Stripe payment integration
-- 4. Add UI for premium paywalls
-- =====================================================

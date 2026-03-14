import { supabase } from './supabase';

// =====================================================
// PREMIUM TIER DEFINITIONS
// =====================================================

export type PremiumTier = 'free' | 'basic' | 'pro';

export interface PremiumLimits {
  // What-If Scenarios
  whatifScenariosPerMonth: number | 'unlimited';
  
  // AI Study Plans
  aiStudyPlansTotal: number | 'unlimited';
  aiStudyPlansPersonalized: boolean; // Pro only
  
  // AI Recommendations
  aiRecommendationsPerSubject: number | 'unlimited';
  aiRecommendationsSubjects: 'one' | 'all';
  aiRecommendationsStorage: boolean;
  
  // AI Practice Questions
  aiPracticeQuestionsPerSubject: number | 'unlimited';
  aiPracticeQuestionsSubjects: 'one' | 'all';
  aiPracticeQuestionsStorage: boolean;
  
  // AI Note Summary
  aiNoteSummaryTotal: number | 'unlimited';
  
  // ATAR Features
  atarBestWorstCaseVisible: boolean;
  atarSubjectScoreEditing: boolean;
  atarRoadmapAccess: boolean;
  atarAISubjectStrategy: boolean; // Basic only
  atarAIAdvancedStrategy: boolean; // Pro only
  
  // Export
  exportDataAccess: boolean;
}

export const PREMIUM_TIER_LIMITS: Record<PremiumTier, PremiumLimits> = {
  free: {
    whatifScenariosPerMonth: 1,
    aiStudyPlansTotal: 1,
    aiStudyPlansPersonalized: false,
    aiRecommendationsPerSubject: 1,
    aiRecommendationsSubjects: 'one',
    aiRecommendationsStorage: false,
    aiPracticeQuestionsPerSubject: 1,
    aiPracticeQuestionsSubjects: 'one',
    aiPracticeQuestionsStorage: false,
    aiNoteSummaryTotal: 1,
    atarBestWorstCaseVisible: false,
    atarSubjectScoreEditing: false,
    atarRoadmapAccess: false,
    atarAISubjectStrategy: false,
    atarAIAdvancedStrategy: false,
    exportDataAccess: false,
  },
  basic: {
    whatifScenariosPerMonth: 'unlimited',
    aiStudyPlansTotal: 5,
    aiStudyPlansPersonalized: false,
    aiRecommendationsPerSubject: 2,
    aiRecommendationsSubjects: 'all',
    aiRecommendationsStorage: true,
    aiPracticeQuestionsPerSubject: 3,
    aiPracticeQuestionsSubjects: 'all',
    aiPracticeQuestionsStorage: true,
    aiNoteSummaryTotal: 5,
    atarBestWorstCaseVisible: true,
    atarSubjectScoreEditing: true,
    atarRoadmapAccess: true,
    atarAISubjectStrategy: true,
    atarAIAdvancedStrategy: false,
    exportDataAccess: true,
  },
  pro: {
    whatifScenariosPerMonth: 'unlimited',
    aiStudyPlansTotal: 'unlimited',
    aiStudyPlansPersonalized: true,
    aiRecommendationsPerSubject: 'unlimited',
    aiRecommendationsSubjects: 'all',
    aiRecommendationsStorage: true,
    aiPracticeQuestionsPerSubject: 'unlimited',
    aiPracticeQuestionsSubjects: 'all',
    aiPracticeQuestionsStorage: true,
    aiNoteSummaryTotal: 'unlimited',
    atarBestWorstCaseVisible: true,
    atarSubjectScoreEditing: true,
    atarRoadmapAccess: true,
    atarAISubjectStrategy: true,
    atarAIAdvancedStrategy: true,
    exportDataAccess: true,
  },
};

export const PREMIUM_PRICES = {
  basic: { aud: 20, months: 6, label: '$20 AUD / 6 months' },
  pro: { aud: 40, months: 6, label: '$40 AUD / 6 months' },
};

// =====================================================
// PREMIUM CHECK FUNCTIONS
// =====================================================

/**
 * Get user's current premium tier
 */
export async function getUserPremiumTier(userId: string): Promise<PremiumTier> {
  try {
    // Try RPC function first (if it exists in external DB)
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_premium_tier', {
      p_user_id: userId,
    });
    
    if (!rpcError && rpcData) {
      console.log('✅ [getUserPremiumTier] RPC result:', { userId, tier: rpcData });
      return rpcData as PremiumTier;
    }
    
    // Fallback: Direct query on vk_users table
    console.warn('⚠️ [getUserPremiumTier] RPC failed, using direct query. Error:', rpcError);
    const { data: userData, error: userError } = await supabase
      .from('vk_users')
      .select('premium_tier, is_premium, premium_expires_at')
      .eq('id', userId)
      .single();
    
    if (userError || !userData) {
      console.error('❌ [getUserPremiumTier] Direct query failed:', userError);
      return 'free';
    }
    
    console.log('📊 [getUserPremiumTier] Direct query result:', userData);
    
    // Check if premium is active and not expired
    const now = new Date();
    const expiresAt = userData.premium_expires_at ? new Date(userData.premium_expires_at) : null;
    
    if (userData.is_premium && expiresAt && expiresAt > now) {
      const tier = userData.premium_tier as PremiumTier;
      console.log('✅ [getUserPremiumTier] Active premium:', { tier, expiresAt });
      return tier;
    }
    
    console.log('ℹ️ [getUserPremiumTier] No active premium or expired');
    return 'free';
  } catch (error) {
    console.error('❌ [getUserPremiumTier] Exception:', error);
    return 'free';
  }
}

/**
 * Get premium limits for a user's tier
 */
export async function getUserPremiumLimits(userId: string): Promise<PremiumLimits> {
  const tier = await getUserPremiumTier(userId);
  return PREMIUM_TIER_LIMITS[tier];
}

/**
 * Check if user has active premium (basic or pro)
 */
export async function hasActivePremium(userId: string): Promise<boolean> {
  try {
    // Try RPC function first
    const { data: rpcData, error: rpcError } = await supabase.rpc('has_active_premium', {
      p_user_id: userId,
    });
    
    if (!rpcError) {
      console.log('✅ [hasActivePremium] RPC result:', { userId, isPremium: rpcData });
      return rpcData === true;
    }
    
    // Fallback: Direct query
    console.warn('⚠️ [hasActivePremium] RPC failed, using direct query. Error:', rpcError);
    const { data: userData, error: userError } = await supabase
      .from('vk_users')
      .select('is_premium, premium_tier, premium_expires_at')
      .eq('id', userId)
      .single();
    
    if (userError || !userData) {
      console.error('❌ [hasActivePremium] Direct query failed:', userError);
      return false;
    }
    
    console.log('📊 [hasActivePremium] Direct query result:', userData);
    
    // Check if premium is active and not expired
    const now = new Date();
    const expiresAt = userData.premium_expires_at ? new Date(userData.premium_expires_at) : null;
    const isActive = userData.is_premium && 
                     userData.premium_tier !== 'free' && 
                     expiresAt && 
                     expiresAt > now;
    
    console.log('ℹ️ [hasActivePremium] Result:', { 
      isActive, 
      tier: userData.premium_tier, 
      expiresAt: expiresAt?.toISOString(),
      now: now.toISOString() 
    });
    
    return isActive;
  } catch (error) {
    console.error('❌ [hasActivePremium] Exception:', error);
    return false;
  }
}

// =====================================================
// WHAT-IF SCENARIOS
// =====================================================

export interface WhatIfScenario {
  id?: string;
  userId: string;
  scenarioName?: string;
  subjectScores: Array<{
    subjectId: string;
    sacAverage: number;
    examPrediction: number;
    studyRank: number;
  }>;
  predictedAtar: number;
  predictedAggregate: number;
  currentAtar?: number;
  atarDifference?: number;
  notes?: string;
  isFavorite?: boolean;
}

/**
 * Check if user can create a new what-if scenario
 */
export async function canCreateWhatIfScenario(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  // Use external Supabase client (configured in ./supabase.ts)
  const tier = await getUserPremiumTier(userId);
  const limits = PREMIUM_TIER_LIMITS[tier];
  
  if (limits.whatifScenariosPerMonth === 'unlimited') {
    return { allowed: true };
  }
  
  // Check count this month
  const { data: count, error } = await supabase.rpc('count_whatif_scenarios_this_month', {
    p_user_id: userId,
  });
  
  if (error) {
    console.error('Error counting what-if scenarios:', error);
    return { allowed: false, reason: 'Error checking limit' };
  }
  
  if (count >= limits.whatifScenariosPerMonth) {
    return { 
      allowed: false, 
      reason: `Free tier limited to ${limits.whatifScenariosPerMonth} scenario per month. Upgrade to Basic for unlimited scenarios!` 
    };
  }
  
  return { allowed: true };
}

/**
 * Save a what-if scenario
 */
export async function saveWhatIfScenario(scenario: WhatIfScenario): Promise<{ data: any; error: any }> {
  // Use external Supabase client (configured in ./supabase.ts)
  
  const { data, error } = await supabase
    .from('vk_whatif_scenarios')
    .insert({
      user_id: scenario.userId,
      scenario_name: scenario.scenarioName,
      subject_scores: scenario.subjectScores,
      predicted_atar: scenario.predictedAtar,
      predicted_aggregate: scenario.predictedAggregate,
      current_atar: scenario.currentAtar,
      atar_difference: scenario.atarDifference,
      notes: scenario.notes,
      is_favorite: scenario.isFavorite || false,
    })
    .select()
    .single();
  
  return { data, error };
}

/**
 * Get user's what-if scenarios
 */
export async function getUserWhatIfScenarios(userId: string): Promise<WhatIfScenario[]> {
  // Use external Supabase client (configured in ./supabase.ts)
  
  const { data, error } = await supabase
    .from('vk_whatif_scenarios')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching what-if scenarios:', error);
    return [];
  }
  
  return data || [];
}

// =====================================================
// AI STUDY PLANS
// =====================================================

/**
 * Get current usage count and limit for AI study plans
 */
export async function getAIStudyPlanUsage(userId: string): Promise<{ used: number; limit: number | 'unlimited'; remaining: number | 'unlimited' }> {
  try {
    const tier = await getUserPremiumTier(userId);
    const limits = PREMIUM_TIER_LIMITS[tier];
    
    if (limits.aiStudyPlansTotal === 'unlimited') {
      return { used: 0, limit: 'unlimited', remaining: 'unlimited' };
    }
    
    // Get current count
    let count = 0;
    const { data: rpcData, error: rpcError } = await supabase.rpc('count_ai_study_plans', {
      p_user_id: userId,
    });
    
    if (rpcError) {
      const { count: directCount } = await supabase
        .from('vk_ai_study_plans')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      count = directCount || 0;
    } else {
      count = rpcData || 0;
    }
    
    const limit = limits.aiStudyPlansTotal as number;
    const remaining = Math.max(0, limit - count);
    
    return { used: count, limit, remaining };
  } catch (error) {
    console.error('Error getting AI study plan usage:', error);
    return { used: 0, limit: 1, remaining: 1 };
  }
}

/**
 * Check if user can create a new AI study plan
 */
export async function canCreateAIStudyPlan(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  try {
    // Use external Supabase client (configured in ./supabase.ts)
    const tier = await getUserPremiumTier(userId);
    const limits = PREMIUM_TIER_LIMITS[tier];
    
    if (limits.aiStudyPlansTotal === 'unlimited') {
      return { allowed: true };
    }
    
    // Check total count - use direct query if RPC not available
    let count = 0;
    const { data: rpcData, error: rpcError } = await supabase.rpc('count_ai_study_plans', {
      p_user_id: userId,
    });
    
    if (rpcError) {
      // Fallback to direct query if RPC function doesn't exist
      console.warn('RPC function not available, using direct query:', rpcError);
      const { count: directCount } = await supabase
        .from('vk_ai_study_plans')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      count = directCount || 0;
    } else {
      count = rpcData || 0;
    }
    
    if (count >= limits.aiStudyPlansTotal) {
      if (tier === 'free') {
        return { 
          allowed: false, 
          reason: 'Free tier limited to 1 AI study plan. Upgrade to Basic ($20/6m) for 5 stored plans or Pro ($40/6m) for unlimited personalized plans!' 
        };
      } else {
        return { 
          allowed: false, 
          reason: `Basic tier limited to ${limits.aiStudyPlansTotal} stored plans. Upgrade to Pro ($40/6m) for unlimited personalized weekly plans!` 
        };
      }
    }
    
    return { allowed: true };
  } catch (error) {
    console.error('Unexpected error in canCreateAIStudyPlan:', error);
    return { allowed: false, reason: 'Error checking limit' };
  }
}

/**
 * Save AI study plan to database
 */
export async function saveAIStudyPlan(plan: {
  userId: string;
  weekStartDate: string;
  weekEndDate: string;
  planContent: any;
  planSummary?: string;
  contextData?: any;
}): Promise<{ data: any; error: any }> {
  // Use external Supabase client (configured in ./supabase.ts)
  
  // Prepare insert payload
  const insertPayload = {
    user_id: plan.userId,
    week_start_date: plan.weekStartDate,
    week_end_date: plan.weekEndDate,
    plan_content: plan.planContent,
    plan_summary: plan.planSummary,
    context_data: plan.contextData,
    is_active: true,
  };
  
  // DEBUG: Log exact insert payload
  console.log('🔍 [saveAIStudyPlan] Insert payload:', JSON.stringify({
    user_id: insertPayload.user_id,
    user_id_type: typeof insertPayload.user_id,
    user_id_length: insertPayload.user_id?.length,
    week_start_date: insertPayload.week_start_date,
    week_end_date: insertPayload.week_end_date,
    has_plan_content: !!insertPayload.plan_content,
    has_plan_summary: !!insertPayload.plan_summary,
    has_context_data: !!insertPayload.context_data,
    is_active: insertPayload.is_active,
  }, null, 2));
  
  const { data, error } = await supabase
    .from('vk_ai_study_plans')
    .insert(insertPayload)
    .select()
    .single();
  
  // DEBUG: Log result
  if (error) {
    console.error('❌ [saveAIStudyPlan] Insert failed:', {
      error: error,
      error_message: error?.message,
      error_details: error?.details,
      error_hint: error?.hint,
      error_code: error?.code,
    });
  } else {
    console.log('✅ [saveAIStudyPlan] Insert succeeded:', {
      id: data?.id,
      user_id: data?.user_id,
    });
  }
  
  return { data, error: error?.message || error };
}

// =====================================================
// AI RECOMMENDATIONS
// =====================================================

/**
 * Get current usage count for AI recommendations (per subject)
 */
export async function getAIRecommendationUsage(userId: string, subjectId: string): Promise<{ used: number; limit: number | 'unlimited'; remaining: number | 'unlimited' }> {
  try {
    const tier = await getUserPremiumTier(userId);
    const limits = PREMIUM_TIER_LIMITS[tier];
    
    if (limits.aiRecommendationsPerSubject === 'unlimited') {
      return { used: 0, limit: 'unlimited', remaining: 'unlimited' };
    }
    
    // Get count for this subject
    let count = 0;
    const { data: rpcData, error: rpcError } = await supabase.rpc('count_ai_recommendations_for_subject', {
      p_user_id: userId,
      p_subject_id: subjectId,
    });
    
    if (rpcError) {
      const { count: directCount } = await supabase
        .from('vk_ai_recommendations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('subject_id', subjectId);
      count = directCount || 0;
    } else {
      count = rpcData || 0;
    }
    
    const limit = limits.aiRecommendationsPerSubject as number;
    const remaining = Math.max(0, limit - count);
    
    return { used: count, limit, remaining };
  } catch (error) {
    console.error('Error getting AI recommendation usage:', error);
    return { used: 0, limit: 1, remaining: 1 };
  }
}

/**
 * Check if user can create AI recommendation for subject
 */
export async function canCreateAIRecommendation(userId: string, subjectId: string): Promise<{ allowed: boolean; reason?: string }> {
  try {
    // Use external Supabase client (configured in ./supabase.ts)
    const tier = await getUserPremiumTier(userId);
    const limits = PREMIUM_TIER_LIMITS[tier];
    
    if (limits.aiRecommendationsPerSubject === 'unlimited') {
      return { allowed: true };
    }
    
    // Free tier: only one subject, only once
    if (tier === 'free') {
      const { count } = await supabase
        .from('vk_ai_recommendations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      if (count && count > 0) {
        return { 
          allowed: false, 
          reason: 'Free tier limited to 1 subject recommendation. Upgrade to Basic ($20/6m) for all subjects with 2 tries each!' 
        };
      }
      return { allowed: true };
    }
    
    // Basic tier: check per-subject limit - use direct query if RPC not available
    let count = 0;
    const { data: rpcData, error: rpcError } = await supabase.rpc('count_ai_recommendations_for_subject', {
      p_user_id: userId,
      p_subject_id: subjectId,
    });
    
    if (rpcError) {
      // Fallback to direct query
      console.warn('RPC function not available, using direct query:', rpcError);
      const { data: directData, error: directError } = await supabase
        .from('vk_ai_recommendations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('subject_id', subjectId);
      
      if (directError) {
        console.error('Error counting AI recommendations:', directError);
        return { allowed: false, reason: 'Error checking limit' };
      }
      count = directData || 0;
    } else {
      count = rpcData || 0;
    }
    
    if (count >= limits.aiRecommendationsPerSubject) {
      return { 
        allowed: false, 
        reason: `Basic tier limited to ${limits.aiRecommendationsPerSubject} recommendations per subject. Upgrade to Pro ($40/6m) for unlimited AI study recommendations!` 
      };
    }
    
    return { allowed: true };
  } catch (error) {
    console.error('Unexpected error in canCreateAIRecommendation:', error);
    return { allowed: false, reason: 'Error checking limit' };
  }
}

/**
 * Save AI recommendation to database
 */
export async function saveAIRecommendation(recommendation: {
  userId: string;
  subjectId: string;
  recommendationType: string;
  recommendationContent: any;
  recommendationSummary?: string;
  contextData?: any;
}): Promise<{ data: any; error: any }> {
  // Use external Supabase client (configured in ./supabase.ts)
  
  const { data, error } = await supabase
    .from('vk_ai_recommendations')
    .insert({
      user_id: recommendation.userId,
      subject_id: recommendation.subjectId,
      recommendation_type: recommendation.recommendationType,
      recommendation_content: recommendation.recommendationContent,
      recommendation_summary: recommendation.recommendationSummary,
      context_data: recommendation.contextData,
      is_bookmarked: false,
    })
    .select()
    .single();
  
  return { data, error: error?.message || error };
}

// =====================================================
// AI PRACTICE QUESTIONS
// =====================================================

/**
 * Get current usage count for AI practice questions (per subject)
 */
export async function getAIPracticeQuestionsUsage(userId: string, subjectId: string): Promise<{ used: number; limit: number | 'unlimited'; remaining: number | 'unlimited' }> {
  try {
    const tier = await getUserPremiumTier(userId);
    const limits = PREMIUM_TIER_LIMITS[tier];
    
    if (limits.aiPracticeQuestionsPerSubject === 'unlimited') {
      return { used: 0, limit: 'unlimited', remaining: 'unlimited' };
    }
    
    // Get count for this subject
    let count = 0;
    const { data: rpcData, error: rpcError } = await supabase.rpc('count_ai_practice_questions_for_subject', {
      p_user_id: userId,
      p_subject_id: subjectId,
    });
    
    if (rpcError) {
      const { count: directCount } = await supabase
        .from('vk_ai_practice_questions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('subject_id', subjectId);
      count = directCount || 0;
    } else {
      count = rpcData || 0;
    }
    
    const limit = limits.aiPracticeQuestionsPerSubject as number;
    const remaining = Math.max(0, limit - count);
    
    return { used: count, limit, remaining };
  } catch (error) {
    console.error('Error getting AI practice questions usage:', error);
    return { used: 0, limit: 1, remaining: 1 };
  }
}

/**
 * Check if user can create AI practice questions for subject
 */
export async function canCreateAIPracticeQuestions(userId: string, subjectId: string): Promise<{ allowed: boolean; reason?: string }> {
  try {
    // Use external Supabase client (configured in ./supabase.ts)
    const tier = await getUserPremiumTier(userId);
    const limits = PREMIUM_TIER_LIMITS[tier];
    
    if (limits.aiPracticeQuestionsPerSubject === 'unlimited') {
      return { allowed: true };
    }
    
    // Free tier: only one subject, only once
    if (tier === 'free') {
      const { count } = await supabase
        .from('vk_ai_practice_questions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      if (count && count > 0) {
        return { 
          allowed: false, 
          reason: 'Free tier limited to 1 subject practice questions. Upgrade to Basic ($20/6m) for all subjects with 3 question sets each!' 
        };
      }
      return { allowed: true };
    }
    
    // Basic tier: check per-subject limit - use direct query if RPC not available
    let count = 0;
    const { data: rpcData, error: rpcError } = await supabase.rpc('count_ai_practice_questions_for_subject', {
      p_user_id: userId,
      p_subject_id: subjectId,
    });
    
    if (rpcError) {
      // Fallback to direct query
      console.warn('RPC function not available, using direct query:', rpcError);
      const { data: directData, error: directError } = await supabase
        .from('vk_ai_practice_questions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('subject_id', subjectId);
      
      if (directError) {
        console.error('Error counting AI practice questions:', directError);
        return { allowed: false, reason: 'Error checking limit' };
      }
      count = directData || 0;
    } else {
      count = rpcData || 0;
    }
    
    if (count >= limits.aiPracticeQuestionsPerSubject) {
      return { 
        allowed: false, 
        reason: `Basic tier limited to ${limits.aiPracticeQuestionsPerSubject} question sets per subject. Upgrade to Pro ($40/6m) for unlimited AI practice questions!` 
      };
    }
    
    return { allowed: true };
  } catch (error) {
    console.error('Unexpected error in canCreateAIPracticeQuestions:', error);
    return { allowed: false, reason: 'Error checking limit' };
  }
}

/**
 * Save AI practice questions to database
 */
export async function saveAIPracticeQuestions(questions: {
  userId: string;
  subjectId: string;
  topic?: string;
  difficultyLevel?: 'easy' | 'medium' | 'hard' | 'exam_level';
  questionsContent: any;
  questionCount: number;
}): Promise<{ data: any; error: any }> {
  // Use external Supabase client (configured in ./supabase.ts)
  
  const { data, error } = await supabase
    .from('vk_ai_practice_questions')
    .insert({
      user_id: questions.userId,
      subject_id: questions.subjectId,
      topic: questions.topic,
      difficulty_level: questions.difficultyLevel,
      questions_content: questions.questionsContent,
      question_count: questions.questionCount,
      attempted_count: 0,
      correct_count: 0,
      completion_status: 'not_started',
      is_bookmarked: false,
    })
    .select()
    .single();
  
  return { data, error: error?.message || error };
}

// =====================================================
// AI NOTE SUMMARY
// =====================================================

/**
 * Get current usage count for AI note summaries (total across all notes)
 */
export async function getAINoteSummaryUsage(userId: string): Promise<{ used: number; limit: number | 'unlimited'; remaining: number | 'unlimited' }> {
  try {
    const tier = await getUserPremiumTier(userId);
    const limits = PREMIUM_TIER_LIMITS[tier];
    
    if (limits.aiNoteSummaryTotal === 'unlimited') {
      return { used: 0, limit: 'unlimited', remaining: 'unlimited' };
    }
    
    // Track usage in user preferences
    const { data, error } = await supabase
      .from('vk_users')
      .select('ai_summary_usage')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error getting AI summary usage:', error);
      return { used: 0, limit: limits.aiNoteSummaryTotal as number, remaining: limits.aiNoteSummaryTotal as number };
    }
    
    const used = data?.ai_summary_usage || 0;
    const limit = limits.aiNoteSummaryTotal as number;
    const remaining = Math.max(0, limit - used);
    
    return { used, limit, remaining };
  } catch (error) {
    console.error('Error getting AI note summary usage:', error);
    return { used: 0, limit: 1, remaining: 1 };
  }
}

/**
 * Check if user can use AI note summary
 */
export async function canUseAINoteSummary(userId: string): Promise<{ allowed: boolean; reason?: string; usage?: { used: number; limit: number | 'unlimited'; remaining: number | 'unlimited' } }> {
  try {
    const tier = await getUserPremiumTier(userId);
    const limits = PREMIUM_TIER_LIMITS[tier];
    const usage = await getAINoteSummaryUsage(userId);
    
    if (limits.aiNoteSummaryTotal === 'unlimited') {
      return { allowed: true, usage };
    }
    
    if (usage.remaining === 0) {
      if (tier === 'free') {
        return { 
          allowed: false, 
          reason: 'Free plan: 1 try used. Upgrade to continue!',
          usage,
        };
      } else {
        return { 
          allowed: false, 
          reason: 'Basic plan: 5 tries used. Upgrade to Pro for unlimited!',
          usage,
        };
      }
    }
    
    return { allowed: true, usage };
  } catch (error) {
    console.error('Unexpected error in canUseAINoteSummary:', error);
    return { allowed: false, reason: 'Error checking limit' };
  }
}

/**
 * Increment AI note summary usage count
 */
export async function incrementAINoteSummaryUsage(userId: string): Promise<{ error: any }> {
  try {
    const { error } = await supabase.rpc('increment_ai_summary_usage', {
      p_user_id: userId,
    });
    
    if (error) {
      // Fallback: manual increment
      const { data } = await supabase
        .from('vk_users')
        .select('ai_summary_usage')
        .eq('id', userId)
        .single();
      
      const currentUsage = data?.ai_summary_usage || 0;
      
      await supabase
        .from('vk_users')
        .update({ ai_summary_usage: currentUsage + 1 })
        .eq('id', userId);
    }
    
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Failed to increment usage' };
  }
}

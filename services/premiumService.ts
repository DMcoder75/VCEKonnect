import { getSupabaseClient } from '@/template';

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
    aiRecommendationsPerSubject: 5,
    aiRecommendationsSubjects: 'all',
    aiRecommendationsStorage: true,
    aiPracticeQuestionsPerSubject: 5,
    aiPracticeQuestionsSubjects: 'all',
    aiPracticeQuestionsStorage: true,
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
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase.rpc('get_user_premium_tier', {
    p_user_id: userId,
  });
  
  if (error || !data) {
    console.error('Error fetching premium tier:', error);
    return 'free';
  }
  
  return data as PremiumTier;
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
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase.rpc('has_active_premium', {
    p_user_id: userId,
  });
  
  if (error) {
    console.error('Error checking premium status:', error);
    return false;
  }
  
  return data === true;
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
  const supabase = getSupabaseClient();
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
  const supabase = getSupabaseClient();
  
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
  const supabase = getSupabaseClient();
  
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
 * Check if user can create a new AI study plan
 */
export async function canCreateAIStudyPlan(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = getSupabaseClient();
  const tier = await getUserPremiumTier(userId);
  const limits = PREMIUM_TIER_LIMITS[tier];
  
  if (limits.aiStudyPlansTotal === 'unlimited') {
    return { allowed: true };
  }
  
  // Check total count
  const { data: count, error } = await supabase.rpc('count_ai_study_plans', {
    p_user_id: userId,
  });
  
  if (error) {
    console.error('Error counting AI study plans:', error);
    return { allowed: false, reason: 'Error checking limit' };
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
}

// =====================================================
// AI RECOMMENDATIONS
// =====================================================

/**
 * Check if user can create AI recommendation for subject
 */
export async function canCreateAIRecommendation(userId: string, subjectId: string): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = getSupabaseClient();
  const tier = await getUserPremiumTier(userId);
  const limits = PREMIUM_TIER_LIMITS[tier];
  
  if (limits.aiRecommendationsPerSubject === 'unlimited') {
    return { allowed: true };
  }
  
  // Free tier: only one subject, only once
  if (tier === 'free') {
    const { data: totalCount } = await supabase
      .from('vk_ai_recommendations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    if (totalCount && totalCount > 0) {
      return { 
        allowed: false, 
        reason: 'Free tier limited to 1 subject recommendation. Upgrade to Basic ($20/6m) for all subjects with 5 tries each!' 
      };
    }
    return { allowed: true };
  }
  
  // Basic tier: check per-subject limit
  const { data: count, error } = await supabase.rpc('count_ai_recommendations_for_subject', {
    p_user_id: userId,
    p_subject_id: subjectId,
  });
  
  if (error) {
    console.error('Error counting AI recommendations:', error);
    return { allowed: false, reason: 'Error checking limit' };
  }
  
  if (count >= limits.aiRecommendationsPerSubject) {
    return { 
      allowed: false, 
      reason: `Basic tier limited to ${limits.aiRecommendationsPerSubject} recommendations per subject. Upgrade to Pro ($40/6m) for unlimited!` 
    };
  }
  
  return { allowed: true };
}

// =====================================================
// AI PRACTICE QUESTIONS
// =====================================================

/**
 * Check if user can create AI practice questions for subject
 */
export async function canCreateAIPracticeQuestions(userId: string, subjectId: string): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = getSupabaseClient();
  const tier = await getUserPremiumTier(userId);
  const limits = PREMIUM_TIER_LIMITS[tier];
  
  if (limits.aiPracticeQuestionsPerSubject === 'unlimited') {
    return { allowed: true };
  }
  
  // Free tier: only one subject, only once
  if (tier === 'free') {
    const { data: totalCount } = await supabase
      .from('vk_ai_practice_questions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    if (totalCount && totalCount > 0) {
      return { 
        allowed: false, 
        reason: 'Free tier limited to 1 subject practice questions. Upgrade to Basic ($20/6m) for all subjects with 5 tries each!' 
      };
    }
    return { allowed: true };
  }
  
  // Basic tier: check per-subject limit
  const { data: count, error } = await supabase.rpc('count_ai_practice_questions_for_subject', {
    p_user_id: userId,
    p_subject_id: subjectId,
  });
  
  if (error) {
    console.error('Error counting AI practice questions:', error);
    return { allowed: false, reason: 'Error checking limit' };
  }
  
  if (count >= limits.aiPracticeQuestionsPerSubject) {
    return { 
      allowed: false, 
      reason: `Basic tier limited to ${limits.aiPracticeQuestionsPerSubject} practice question sets per subject. Upgrade to Pro ($40/6m) for unlimited!` 
    };
  }
  
  return { allowed: true };
}

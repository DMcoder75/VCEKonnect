import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import {
  PremiumTier,
  PremiumLimits,
  getUserPremiumTier,
  getUserPremiumLimits,
  hasActivePremium,
  getAIStudyPlanUsage,
  getAIRecommendationUsage,
  getAIPracticeQuestionsUsage,
  PREMIUM_TIER_LIMITS,
} from '@/services/premiumService';
import { supabase } from '@/services/supabase';

export function usePremium() {
  const { user } = useAuth();
  const [tier, setTier] = useState<PremiumTier>('free');
  const [limits, setLimits] = useState<PremiumLimits>(PREMIUM_TIER_LIMITS.free);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Usage tracking for display
  const [studyPlanUsage, setStudyPlanUsage] = useState<{ used: number; limit: number | 'unlimited'; remaining: number | 'unlimited' } | null>(null);

  useEffect(() => {
    if (user) {
      loadPremiumStatus();
      // Also check Stripe subscription status
      checkStripeSubscription();
    } else {
      setTier('free');
      setLimits(PREMIUM_TIER_LIMITS.free);
      setIsPremium(false);
      setIsLoading(false);
    }
  }, [user]);

  async function checkStripeSubscription() {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        console.error('Error checking Stripe subscription:', error);
        return;
      }
      
      if (data?.subscribed && data?.tier) {
        // Update local state if Stripe tier differs
        if (data.tier !== tier) {
          console.log('Stripe tier mismatch, updating:', { stripe: data.tier, local: tier });
          setTier(data.tier);
          
          // Reload limits for new tier
          const newLimits = await getUserPremiumLimits(user.id);
          setLimits(newLimits);
        }
      }
    } catch (error) {
      console.error('Exception checking Stripe subscription:', error);
    }
  }

  async function loadPremiumStatus() {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const [userTier, userLimits, hasPremium] = await Promise.all([
        getUserPremiumTier(user.id),
        getUserPremiumLimits(user.id),
        hasActivePremium(user.id),
      ]);
      
      setTier(userTier);
      setLimits(userLimits);
      setIsPremium(hasPremium);
    } catch (error) {
      console.error('Error loading premium status:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function refresh() {
    await loadPremiumStatus();
  }

  // Get usage for specific features
  async function getStudyPlanUsage() {
    if (!user) return null;
    const usage = await getAIStudyPlanUsage(user.id);
    setStudyPlanUsage(usage);
    return usage;
  }

  async function getRecommendationUsage(subjectId: string) {
    if (!user) return null;
    return await getAIRecommendationUsage(user.id, subjectId);
  }

  async function getPracticeQuestionsUsage(subjectId: string) {
    if (!user) return null;
    return await getAIPracticeQuestionsUsage(user.id, subjectId);
  }

  return {
    tier,
    limits,
    isPremium,
    isLoading,
    refresh,
    studyPlanUsage,
    getStudyPlanUsage,
    getRecommendationUsage,
    getPracticeQuestionsUsage,
  };
}

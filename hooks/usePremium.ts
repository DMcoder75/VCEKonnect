import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import {
  PremiumTier,
  PremiumLimits,
  getUserPremiumTier,
  getUserPremiumLimits,
  hasActivePremium,
  PREMIUM_TIER_LIMITS,
} from '@/services/premiumService';

export function usePremium() {
  const { user } = useAuth();
  const [tier, setTier] = useState<PremiumTier>('free');
  const [limits, setLimits] = useState<PremiumLimits>(PREMIUM_TIER_LIMITS.free);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPremiumStatus();
    } else {
      setTier('free');
      setLimits(PREMIUM_TIER_LIMITS.free);
      setIsPremium(false);
      setIsLoading(false);
    }
  }, [user]);

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

  return {
    tier,
    limits,
    isPremium,
    isLoading,
    refresh,
  };
}

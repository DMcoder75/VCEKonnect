import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { checkFeatureAccess, trackFeatureEvent, FeatureAccessResult } from '@/services/featureFlagsService';

/**
 * Hook to check if user has access to a specific feature
 * Automatically tracks 'viewed' events when feature is checked
 */
export function useFeatureAccess(featureKey: string) {
  const { user } = useAuth();
  const [result, setResult] = useState<FeatureAccessResult>({
    hasAccess: false,
    featureName: featureKey,
    requiresPremium: false,
    rolloutPercentage: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAccess() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const accessResult = await checkFeatureAccess(user.id, featureKey);
      setResult(accessResult);
      setIsLoading(false);

      // Track that user viewed this feature check
      if (accessResult.hasAccess) {
        trackFeatureEvent(user.id, featureKey, 'viewed');
      }
    }

    checkAccess();
  }, [user?.id, featureKey]);

  /**
   * Track feature usage
   */
  const trackUsage = async (eventType: 'used' | 'error' | 'completed', eventData?: any) => {
    if (user) {
      await trackFeatureEvent(user.id, featureKey, eventType, eventData);
    }
  };

  return {
    hasAccess: result.hasAccess,
    featureName: result.featureName,
    requiresPremium: result.requiresPremium,
    rolloutPercentage: result.rolloutPercentage,
    isLoading,
    trackUsage,
  };
}

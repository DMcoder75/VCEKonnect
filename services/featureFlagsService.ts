import { supabase } from './supabase.native';

export interface FeatureFlag {
  id: string;
  featureKey: string;
  featureName: string;
  description: string | null;
  rolloutPercentage: number;
  isEnabled: boolean;
  targetUserSegment: string;
  minAppVersion: string | null;
  maxAppVersion: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureAccessResult {
  hasAccess: boolean;
  featureName: string;
  requiresPremium: boolean;
  rolloutPercentage: number;
}

/**
 * Check if current user has access to a feature
 */
export async function checkFeatureAccess(
  userId: string,
  featureKey: string
): Promise<FeatureAccessResult> {
  try {
    // Call the database function to check access
    const { data, error } = await supabase.rpc('check_feature_access', {
      p_user_id: userId,
      p_feature_key: featureKey,
    });

    if (error) {
      console.error('checkFeatureAccess error:', error);
      return {
        hasAccess: false,
        featureName: featureKey,
        requiresPremium: false,
        rolloutPercentage: 0,
      };
    }

    // Get feature flag details
    const { data: flagData, error: flagError } = await supabase
      .from('vk_feature_flags')
      .select('feature_name, rollout_percentage, target_user_segment')
      .eq('feature_key', featureKey)
      .single();

    if (flagError) {
      console.error('Get feature flag error:', flagError);
    }

    return {
      hasAccess: data === true,
      featureName: flagData?.feature_name || featureKey,
      requiresPremium: flagData?.target_user_segment === 'premium',
      rolloutPercentage: flagData?.rollout_percentage || 0,
    };
  } catch (err) {
    console.error('checkFeatureAccess exception:', err);
    return {
      hasAccess: false,
      featureName: featureKey,
      requiresPremium: false,
      rolloutPercentage: 0,
    };
  }
}

/**
 * Get all feature flags
 */
export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  try {
    const { data, error } = await supabase
      .from('vk_feature_flags')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('getAllFeatureFlags error:', error);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      featureKey: row.feature_key,
      featureName: row.feature_name,
      description: row.description,
      rolloutPercentage: row.rollout_percentage,
      isEnabled: row.is_enabled,
      targetUserSegment: row.target_user_segment,
      minAppVersion: row.min_app_version,
      maxAppVersion: row.max_app_version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    console.error('getAllFeatureFlags exception:', err);
    return [];
  }
}

/**
 * Track feature usage event
 */
export async function trackFeatureEvent(
  userId: string,
  featureKey: string,
  eventType: 'viewed' | 'used' | 'error' | 'completed',
  eventData?: any
): Promise<void> {
  try {
    await supabase.from('vk_feature_events').insert({
      user_id: userId,
      feature_key: featureKey,
      event_type: eventType,
      event_data: eventData || null,
    });
  } catch (err) {
    console.error('trackFeatureEvent exception:', err);
  }
}

/**
 * Get feature analytics
 */
export async function getFeatureAnalytics(
  featureKey: string,
  daysBack: number = 7
): Promise<any> {
  try {
    const { data, error } = await supabase.rpc('get_feature_analytics', {
      p_feature_key: featureKey,
      p_days_back: daysBack,
    });

    if (error) {
      console.error('getFeatureAnalytics error:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('getFeatureAnalytics exception:', err);
    return null;
  }
}

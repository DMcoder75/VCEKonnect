import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useFeatureAccess } from '@/hooks/useFeatureFlags';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface FeatureGateProps {
  featureKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

/**
 * Gate content behind a feature flag
 * Shows upgrade prompt if user doesn't have access
 */
export function FeatureGate({
  featureKey,
  children,
  fallback,
  showUpgradePrompt = true,
}: FeatureGateProps) {
  const router = useRouter();
  const { hasAccess, featureName, requiresPremium, isLoading } = useFeatureAccess(featureKey);

  if (isLoading) {
    return <LoadingSpinner message="Checking access..." size="small" />;
  }

  // User has access - show feature
  if (hasAccess) {
    return <>{children}</>;
  }

  // User doesn't have access - show custom fallback or upgrade prompt
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default: Show upgrade prompt
  if (showUpgradePrompt) {
    return (
      <View style={styles.upgradePrompt}>
        <MaterialIcons 
          name={requiresPremium ? "star" : "lock"} 
          size={48} 
          color={requiresPremium ? colors.premium : colors.primary} 
        />
        <Text style={styles.upgradeTitle}>
          {requiresPremium ? 'Premium Feature' : 'Feature Not Available Yet'}
        </Text>
        <Text style={styles.upgradeFeatureName}>{featureName}</Text>
        <Text style={styles.upgradeMessage}>
          {requiresPremium
            ? 'This feature is available for Premium users. Upgrade to unlock!'
            : 'This feature is being gradually rolled out. Check back soon!'}
        </Text>
        {requiresPremium && (
          <Pressable
            style={styles.upgradeButton}
            onPress={() => router.push('/premium')}
          >
            <MaterialIcons name="star" size={20} color={colors.background} />
            <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  upgradePrompt: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    marginVertical: spacing.md,
  },
  upgradeTitle: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  upgradeFeatureName: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.primary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  upgradeMessage: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.premium,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  upgradeButtonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.background,
  },
});

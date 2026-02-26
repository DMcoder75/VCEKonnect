import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { PremiumTier } from '@/services/premiumService';

interface PremiumBlurOverlayProps {
  children: React.ReactNode;
  isLocked: boolean;
  feature: string;
  requiredTier: 'basic' | 'pro';
  onUpgrade: () => void;
}

export function PremiumBlurOverlay({
  children,
  isLocked,
  feature,
  requiredTier,
  onUpgrade,
}: PremiumBlurOverlayProps) {
  if (!isLocked) {
    return <>{children}</>;
  }

  const tierInfo = {
    basic: { icon: 'star' as const, color: colors.primary, label: 'Basic' },
    pro: { icon: 'emoji-events' as const, color: colors.premium, label: 'Pro' },
  };

  const info = tierInfo[requiredTier];

  return (
    <View style={styles.container}>
      {/* Blurred background content */}
      <View style={styles.blurredContent} pointerEvents="none">
        {children}
      </View>

      {/* Blur overlay */}
      <BlurView intensity={80} tint="dark" style={styles.blurOverlay}>
        <View style={styles.lockCard}>
          <MaterialIcons name="lock" size={48} color={info.color} />
          <Text style={styles.lockTitle}>Premium Feature</Text>
          <Text style={styles.lockFeature}>{feature}</Text>
          
          <View style={[styles.tierBadge, { backgroundColor: info.color + '20', borderColor: info.color }]}>
            <MaterialIcons name={info.icon} size={16} color={info.color} />
            <Text style={[styles.tierText, { color: info.color }]}>
              {info.label} Plan Required
            </Text>
          </View>

          <Pressable style={[styles.upgradeButton, { backgroundColor: info.color }]} onPress={onUpgrade}>
            <MaterialIcons name="star" size={20} color={colors.background} />
            <Text style={styles.upgradeButtonText}>Unlock Premium</Text>
          </Pressable>
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    flex: 1,
  },
  blurredContent: {
    flex: 1,
    opacity: 0.4,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  lockCard: {
    backgroundColor: colors.surfaceElevated + 'F0',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    maxWidth: 320,
    borderWidth: 2,
    borderColor: colors.border,
  },
  lockTitle: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  lockFeature: {
    fontSize: typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  tierText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.bold,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  upgradeButtonText: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    color: colors.background,
  },
});

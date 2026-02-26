import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { PremiumTier } from '@/services/premiumService';

interface PremiumPaywallProps {
  visible: boolean;
  onClose: () => void;
  feature: string;
  description: string;
  requiredTier: 'basic' | 'pro';
  currentTier?: PremiumTier;
}

export function PremiumPaywall({
  visible,
  onClose,
  feature,
  description,
  requiredTier,
  currentTier = 'free',
}: PremiumPaywallProps) {
  const router = useRouter();

  function handleUpgrade() {
    onClose();
    router.push('/premium');
  }

  const tierInfo = {
    basic: {
      price: '$20',
      period: '6 months',
      color: colors.primary,
      icon: 'star' as const,
    },
    pro: {
      price: '$40',
      period: '6 months',
      color: colors.premium,
      icon: 'emoji-events' as const,
    },
  };

  const info = tierInfo[requiredTier];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <MaterialIcons name="close" size={24} color={colors.textSecondary} />
          </Pressable>

          <View style={styles.content}>
            <MaterialIcons name={info.icon} size={64} color={info.color} />
            
            <Text style={styles.title}>Premium Feature</Text>
            <Text style={styles.feature}>{feature}</Text>
            <Text style={styles.description}>{description}</Text>

            <View style={[styles.tierBadge, { backgroundColor: info.color + '20', borderColor: info.color }]}>
              <MaterialIcons name={info.icon} size={20} color={info.color} />
              <Text style={[styles.tierText, { color: info.color }]}>
                {requiredTier === 'basic' ? 'Basic Plan' : 'Pro Plan'} Required
              </Text>
            </View>

            <View style={styles.priceCard}>
              <Text style={styles.price}>{info.price} AUD</Text>
              <Text style={styles.period}>per {info.period}</Text>
            </View>

            <Pressable style={[styles.upgradeButton, { backgroundColor: info.color }]} onPress={handleUpgrade}>
              <Text style={styles.upgradeButtonText}>
                {currentTier === 'free' ? 'Unlock Premium' : 'Upgrade Plan'}
              </Text>
              <MaterialIcons name="arrow-forward" size={20} color={colors.background} />
            </Pressable>

            <Pressable style={styles.learnMoreButton} onPress={handleUpgrade}>
              <Text style={styles.learnMoreText}>View all premium features</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    width: '100%',
    maxWidth: 400,
    padding: spacing.xl,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: spacing.xs,
    zIndex: 10,
  },
  content: {
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  feature: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.primary,
    textAlign: 'center',
  },
  description: {
    fontSize: typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  tierText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.bold,
  },
  priceCard: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  price: {
    fontSize: 40,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  period: {
    fontSize: typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    width: '100%',
    marginTop: spacing.lg,
  },
  upgradeButtonText: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    color: colors.background,
  },
  learnMoreButton: {
    padding: spacing.sm,
  },
  learnMoreText: {
    fontSize: typography.bodySmall,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});

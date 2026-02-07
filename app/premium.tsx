import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { Button } from '@/components';

export default function PremiumScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  function handleSubscribe() {
    // Mock Stripe payment - V1.0
    alert('Premium subscription coming soon! This will integrate with Stripe payments.');
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Pressable style={styles.closeButton} onPress={() => router.back()}>
        <MaterialIcons name="close" size={24} color={colors.textSecondary} />
      </Pressable>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <MaterialIcons name="star" size={64} color={colors.premium} />
          <Text style={styles.title}>Go Premium</Text>
          <Text style={styles.subtitle}>Unlock your full ATAR potential</Text>
        </View>

        {/* Pricing */}
        <View style={styles.pricingCard}>
          <Text style={styles.price}>$20 AUD</Text>
          <Text style={styles.period}>per 6 months</Text>
          <Text style={styles.trial}>1 month free trial included</Text>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>Premium Features</Text>
          
          <View style={styles.feature}>
            <MaterialIcons name="check-circle" size={24} color={colors.success} />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Unlimited Subjects</Text>
              <Text style={styles.featureDesc}>Track all your VCE subjects without limits</Text>
            </View>
          </View>

          <View style={styles.feature}>
            <MaterialIcons name="check-circle" size={24} color={colors.success} />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Advanced ATAR Predictions</Text>
              <Text style={styles.featureDesc}>Detailed breakdowns with scenario modeling</Text>
            </View>
          </View>

          <View style={styles.feature}>
            <MaterialIcons name="check-circle" size={24} color={colors.success} />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Export PDF Reports</Text>
              <Text style={styles.featureDesc}>Share progress with parents and teachers</Text>
            </View>
          </View>

          <View style={styles.feature}>
            <MaterialIcons name="check-circle" size={24} color={colors.success} />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Unlimited Notes Storage</Text>
              <Text style={styles.featureDesc}>Store all your study notes with photos</Text>
            </View>
          </View>

          <View style={styles.feature}>
            <MaterialIcons name="check-circle" size={24} color={colors.success} />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Voice-to-Text Notes</Text>
              <Text style={styles.featureDesc}>Record notes hands-free during study</Text>
            </View>
          </View>

          <View style={styles.feature}>
            <MaterialIcons name="check-circle" size={24} color={colors.success} />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Community Access</Text>
              <Text style={styles.featureDesc}>Compare ATAR predictions anonymously</Text>
            </View>
          </View>
        </View>

        {/* CTA */}
        <Button
          title="Start Free Trial"
          onPress={handleSubscribe}
          size="large"
          fullWidth
        />

        <Text style={styles.disclaimer}>
          Cancel anytime. Auto-renews after 6 months unless cancelled.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  closeButton: {
    position: 'absolute',
    top: 48,
    right: spacing.md,
    zIndex: 10,
    padding: spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.h1,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  subtitle: {
    fontSize: typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  pricingCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
    borderWidth: 2,
    borderColor: colors.premium,
  },
  price: {
    fontSize: 48,
    fontWeight: typography.bold,
    color: colors.premium,
  },
  period: {
    fontSize: typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  trial: {
    fontSize: typography.bodySmall,
    color: colors.success,
    marginTop: spacing.sm,
    fontWeight: typography.semibold,
  },
  featuresContainer: {
    marginBottom: spacing.xl,
  },
  featuresTitle: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  feature: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  featureDesc: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  disclaimer: {
    fontSize: typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});

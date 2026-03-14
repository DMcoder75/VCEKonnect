import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Linking, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { Button } from '@/components';
import { usePremium } from '@/hooks/usePremium';
import { STRIPE_TIERS } from '@/constants/stripeConfig';
import { supabase } from '@/services/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';


type PlanType = 'basic' | 'pro';

export default function PremiumScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tier } = usePremium();
  const params = useLocalSearchParams();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('basic');

  // Set initial tab based on requiredTier from paywall
  useEffect(() => {
    if (params.requiredTier === 'pro') {
      setSelectedPlan('pro');
    } else if (params.requiredTier === 'basic') {
      setSelectedPlan('basic');
    }
  }, [params.requiredTier]);

  const [isLoading, setIsLoading] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setDebugLogs(prev => [...prev, logMessage]);
    console.log('💳 ' + logMessage);
  };

  async function handleSubscribe(plan: PlanType) {
    addDebugLog(`🚀 Starting subscription for plan: ${plan}`);
    setIsLoading(true);
    
    try {
      // Check if STRIPE_TIERS has the plan
      if (!STRIPE_TIERS[plan]) {
        addDebugLog(`❌ Plan "${plan}" not found in STRIPE_TIERS`);
        throw new Error(`Invalid plan: ${plan}`);
      }

      const tierConfig = STRIPE_TIERS[plan];
      addDebugLog(`✅ Tier config found: ${tierConfig.name}`);
      addDebugLog(`   Price ID: ${tierConfig.price_id}`);
      addDebugLog(`   Product ID: ${tierConfig.product_id}`);
      
      // Verify supabase client is available
      if (!supabase) {
        addDebugLog('❌ Supabase client not initialized!');
        throw new Error('Database connection not available');
      }
      addDebugLog('✅ Supabase client verified');
      
      // Call Edge Function to create checkout session
      addDebugLog('📡 Calling create-checkout Edge Function...');
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: tierConfig.price_id,
          tier: plan,
        },
      });

      addDebugLog(`📥 Response received - Error: ${error ? 'YES' : 'NO'}, Data: ${data ? 'YES' : 'NO'}`);

      if (error) {
        // Extract detailed error from FunctionsHttpError
        let errorMessage = error.message || 'Unknown error';
        
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
            addDebugLog(`❌ HTTP Error (${statusCode}): ${textContent}`);
          } catch {
            errorMessage = error.message || 'Failed to read error response';
            addDebugLog(`❌ Failed to extract error details`);
          }
        } else {
          addDebugLog(`❌ Error type: ${error.constructor.name}`);
          addDebugLog(`❌ Error message: ${errorMessage}`);
        }
        
        throw new Error(errorMessage);
      }
      
      if (!data?.url) {
        addDebugLog(`❌ No checkout URL in response. Data: ${JSON.stringify(data)}`);
        throw new Error('No checkout URL returned from server');
      }

      addDebugLog(`✅ Checkout URL received: ${data.url.substring(0, 50)}...`);
      
      // Navigate to in-app WebView modal
      addDebugLog('🌐 Opening WebView modal...');
      router.push({
        pathname: '/stripe-checkout-modal',
        params: { url: data.url, tier: plan }
      });
      addDebugLog('✅ Modal navigation initiated');
    } catch (error: any) {
      addDebugLog(`💥 Exception caught: ${error.message || String(error)}`);
      Alert.alert(
        'Subscription Error',
        error.message || 'Failed to start subscription process. Please try again.',
      );
    } finally {
      setIsLoading(false);
      addDebugLog('🏁 Process completed');
    }
  }

  async function handleManageSubscription() {
    addDebugLog('💳 Opening customer portal...');
    setIsLoading(true);
    
    try {
      // Call Edge Function to create customer portal session
      addDebugLog('📡 Calling customer-portal Edge Function...');
      const { data, error } = await supabase.functions.invoke('customer-portal');

      addDebugLog(`📥 Portal response - Error: ${error ? 'YES' : 'NO'}, Data: ${data ? 'YES' : 'NO'}`);

      if (error) {
        // Extract detailed error from FunctionsHttpError
        let errorMessage = error.message || 'Unknown error';
        
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
            addDebugLog(`❌ Portal HTTP Error (${statusCode}): ${textContent}`);
          } catch {
            errorMessage = error.message || 'Failed to read error response';
            addDebugLog(`❌ Failed to extract portal error`);
          }
        }
        
        throw new Error(errorMessage);
      }
      
      if (!data?.url) {
        addDebugLog(`❌ No portal URL in response. Data: ${JSON.stringify(data)}`);
        throw new Error('No portal URL returned from server');
      }

      addDebugLog(`✅ Portal URL received: ${data.url.substring(0, 50)}...`);
      
      // Navigate to in-app WebView modal for portal
      addDebugLog('🌐 Opening WebView modal for portal...');
      router.push({
        pathname: '/stripe-checkout-modal',
        params: { url: data.url, tier: 'portal' }
      });
      addDebugLog('✅ Portal modal navigation initiated');
    } catch (error: any) {
      addDebugLog(`💥 Portal exception: ${error.message || String(error)}`);
      Alert.alert(
        'Error',
        error.message || 'Failed to open subscription management. Please try again.',
      );
    } finally {
      setIsLoading(false);
      addDebugLog('🏁 Portal process completed');
    }
  }

  // Note: Subscription status is refreshed automatically after browser closes in handleSubscribe/handleManageSubscription

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Debug Panel Toggle */}
      <Pressable 
        style={styles.debugToggle} 
        onPress={() => setShowDebug(!showDebug)}
        onLongPress={() => setDebugLogs([])}
      >
        <MaterialIcons name="bug-report" size={20} color={showDebug ? colors.primary : colors.textTertiary} />
        <Text style={styles.debugToggleText}>Debug ({debugLogs.length})</Text>
      </Pressable>

      {/* Debug Panel */}
      {showDebug && (
        <View style={styles.debugPanel}>
          <ScrollView style={styles.debugScroll}>
            {debugLogs.map((log, index) => (
              <Text key={index} style={styles.debugLog}>{log}</Text>
            ))}
            {debugLogs.length === 0 && (
              <Text style={styles.debugLogEmpty}>No debug logs yet. Click Subscribe to see logs.</Text>
            )}
          </ScrollView>
          <Pressable style={styles.debugClear} onPress={() => setDebugLogs([])}>
            <Text style={styles.debugClearText}>Clear Logs</Text>
          </Pressable>
        </View>
      )}

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
          <MaterialIcons name="workspace-premium" size={64} color={colors.premium} />
          <Text style={styles.title}>Upgrade to Premium</Text>
          <Text style={styles.subtitle}>Choose the plan that fits your needs</Text>
          {tier !== 'free' && (
            <View style={styles.currentPlanBadge}>
              <MaterialIcons name="check-circle" size={16} color={colors.success} />
              <Text style={styles.currentPlanText}>Current: {tier === 'basic' ? 'Basic Plan' : 'Pro Plan'}</Text>
            </View>
          )}
        </View>

        {/* Plan Selection Toggle */}
        <View style={styles.planToggle}>
          <Pressable
            style={[styles.planToggleButton, selectedPlan === 'basic' && styles.planToggleButtonActive]}
            onPress={() => setSelectedPlan('basic')}
          >
            <Text style={[styles.planToggleText, selectedPlan === 'basic' && styles.planToggleTextActive]}>Basic</Text>
          </Pressable>
          <Pressable
            style={[styles.planToggleButton, selectedPlan === 'pro' && styles.planToggleButtonActivePro]}
            onPress={() => setSelectedPlan('pro')}
          >
            <Text style={[styles.planToggleText, selectedPlan === 'pro' && styles.planToggleTextActive]}>Pro</Text>
          </Pressable>
        </View>

        {/* Pricing Card */}
        <View style={[
          styles.pricingCard,
          selectedPlan === 'pro' && styles.pricingCardPro,
        ]}>
          <View style={styles.pricingHeader}>
            <Text style={styles.planName}>{selectedPlan === 'basic' ? 'Basic Plan' : 'Pro Plan'}</Text>
            {selectedPlan === 'pro' && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>MOST POPULAR</Text>
              </View>
            )}
          </View>
          <Text style={styles.price}>${selectedPlan === 'basic' ? '20' : '40'} AUD</Text>
          <Text style={styles.period}>per 6 months</Text>
          <Text style={styles.perMonth}>${selectedPlan === 'basic' ? '3.33' : '6.67'}/month</Text>
        </View>

        {/* Features List */}
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>What's Included</Text>
          
          {/* AI Study Plans */}
          <View style={styles.feature}>
            <MaterialIcons 
              name={selectedPlan === 'basic' ? 'check-circle' : 'check-circle'} 
              size={24} 
              color={selectedPlan === 'basic' ? colors.primary : colors.premium} 
            />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>AI Study Plans</Text>
              <Text style={styles.featureDesc}>
                {selectedPlan === 'basic' ? '5 AI plans' : 'Unlimited AI plans'}
              </Text>
            </View>
          </View>

          {/* AI Recommendations */}
          <View style={styles.feature}>
            <MaterialIcons 
              name={selectedPlan === 'basic' ? 'check-circle' : 'check-circle'} 
              size={24} 
              color={selectedPlan === 'basic' ? colors.primary : colors.premium} 
            />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>AI Study Recommendations</Text>
              <Text style={styles.featureDesc}>
                {selectedPlan === 'basic' ? '2 recommendations per subject' : 'Unlimited AI recommendations'}
              </Text>
            </View>
          </View>

          {/* AI Practice Questions */}
          <View style={styles.feature}>
            <MaterialIcons 
              name={selectedPlan === 'basic' ? 'check-circle' : 'check-circle'} 
              size={24} 
              color={selectedPlan === 'basic' ? colors.primary : colors.premium} 
            />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>AI Practice Questions</Text>
              <Text style={styles.featureDesc}>
                {selectedPlan === 'basic' ? '3 question sets per subject' : 'Unlimited AI practice questions'}
              </Text>
            </View>
          </View>

          {/* AI Note Summary */}
          <View style={styles.feature}>
            <MaterialIcons 
              name={selectedPlan === 'basic' ? 'check-circle' : 'check-circle'} 
              size={24} 
              color={selectedPlan === 'basic' ? colors.primary : colors.premium} 
            />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>AI Note Summary</Text>
              <Text style={styles.featureDesc}>
                {selectedPlan === 'basic' ? '5 tries across all notes' : 'Unlimited AI note summaries'}
              </Text>
            </View>
          </View>

          {/* What-If Scenarios */}
          <View style={styles.feature}>
            <MaterialIcons 
              name={selectedPlan === 'basic' ? 'check-circle' : 'check-circle'} 
              size={24} 
              color={selectedPlan === 'basic' ? colors.primary : colors.premium} 
            />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>ATAR What-If Scenarios</Text>
              <Text style={styles.featureDesc}>
                {selectedPlan === 'basic' ? 'Unlimited scenarios' : 'Unlimited scenarios'}
              </Text>
            </View>
          </View>

          {/* PDF Export */}
          <View style={styles.feature}>
            <MaterialIcons 
              name="check-circle" 
              size={24} 
              color={selectedPlan === 'basic' ? colors.primary : colors.premium} 
            />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>PDF Export</Text>
              <Text style={styles.featureDesc}>Export study plans, ATAR predictions, and all data</Text>
            </View>
          </View>

          {/* Advanced Analytics */}
          <View style={styles.feature}>
            <MaterialIcons 
              name="check-circle" 
              size={24} 
              color={selectedPlan === 'basic' ? colors.primary : colors.premium} 
            />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Advanced Analytics (Free)</Text>
              <Text style={styles.featureDesc}>Detailed insights into study patterns and progress</Text>
            </View>
          </View>

          {/* Study Goals & Tracking */}
          <View style={styles.feature}>
            <MaterialIcons 
              name="check-circle" 
              size={24} 
              color={selectedPlan === 'basic' ? colors.primary : colors.premium} 
            />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Study Goals & Tracking (Free)</Text>
              <Text style={styles.featureDesc}>Weekly, monthly, and term goal management</Text>
            </View>
          </View>

          {/* Unlimited Subjects */}
          <View style={styles.feature}>
            <MaterialIcons 
              name="check-circle" 
              size={24} 
              color={selectedPlan === 'basic' ? colors.primary : colors.premium} 
            />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Unlimited Subjects (Free)</Text>
              <Text style={styles.featureDesc}>Track all subjects without limits</Text>
            </View>
          </View>

          {/* Notes System */}
          <View style={styles.feature}>
            <MaterialIcons 
              name="check-circle" 
              size={24} 
              color={selectedPlan === 'basic' ? colors.primary : colors.premium} 
            />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Enhanced Notes System (Free)</Text>
              <Text style={styles.featureDesc}>Rich text, tags, and advanced search</Text>
            </View>
          </View>

          {/* Achievements */}
          <View style={styles.feature}>
            <MaterialIcons 
              name="check-circle" 
              size={24} 
              color={selectedPlan === 'basic' ? colors.primary : colors.premium} 
            />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Achievements & Streaks (Free)</Text>
              <Text style={styles.featureDesc}>Gamified motivation system with milestones</Text>
            </View>
          </View>

          {/* Priority Support - Pro Only */}
          {selectedPlan === 'pro' && (
            <View style={styles.feature}>
              <MaterialIcons 
                name="stars" 
                size={24} 
                color={colors.premium} 
              />
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Priority Support</Text>
                <Text style={styles.featureDesc}>Fast response times for technical issues</Text>
              </View>
            </View>
          )}

          {/* Early Access - Pro Only */}
          {selectedPlan === 'pro' && (
            <View style={styles.feature}>
              <MaterialIcons 
                name="stars" 
                size={24} 
                color={colors.premium} 
              />
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Early Access</Text>
                <Text style={styles.featureDesc}>Be first to try new features before everyone else</Text>
              </View>
            </View>
          )}
        </View>

        {/* CTA Button */}
        <Pressable
          style={[
            styles.subscribeButton,
            selectedPlan === 'pro' && styles.subscribeButtonPro,
            (tier === selectedPlan || isLoading) && styles.subscribeButtonDisabled,
          ]}
          onPress={() => handleSubscribe(selectedPlan)}
          disabled={tier === selectedPlan || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <MaterialIcons name="workspace-premium" size={24} color={colors.background} />
          )}
          <Text style={styles.subscribeButtonText}>
            {isLoading
              ? 'Processing...'
              : tier === selectedPlan 
              ? `Current Plan: ${selectedPlan === 'basic' ? 'Basic' : 'Pro'}` 
              : tier === 'pro' && selectedPlan === 'basic'
              ? 'Downgrade to Basic'
              : tier === 'basic' && selectedPlan === 'pro'
              ? 'Upgrade to Pro'
              : `Subscribe to ${selectedPlan === 'basic' ? 'Basic' : 'Pro'}`
            }
          </Text>
        </Pressable>

        {/* Manage Subscription Button - Only show if user has active subscription */}
        {tier !== 'free' && (
          <Pressable
            style={styles.manageButton}
            onPress={handleManageSubscription}
            disabled={isLoading}
          >
            <MaterialIcons name="settings" size={20} color={colors.primary} />
            <Text style={styles.manageButtonText}>
              Manage Subscription
            </Text>
          </Pressable>
        )}

        <Text style={styles.disclaimer}>
          Cancel anytime. Auto-renews after 6 months unless cancelled. All prices in AUD.
        </Text>

        {/* Comparison Note */}
        <View style={styles.comparisonNote}>
          <MaterialIcons name="info-outline" size={20} color={colors.primary} />
          <Text style={styles.comparisonText}>
            Free tier includes: 1 AI study plan trial, 1 AI recommendation trial, 1 AI questions trial, 1 AI note summary, basic ATAR prediction, and limited study tracking.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  debugToggle: {
    position: 'absolute',
    top: 48,
    left: spacing.md,
    zIndex: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  debugToggleText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: typography.semibold,
  },
  debugPanel: {
    position: 'absolute',
    top: 90,
    left: spacing.md,
    right: spacing.md,
    height: 300,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    zIndex: 10,
    overflow: 'hidden',
  },
  debugScroll: {
    flex: 1,
    padding: spacing.sm,
  },
  debugLog: {
    fontSize: 11,
    color: colors.textPrimary,
    fontFamily: 'monospace',
    marginBottom: 4,
    lineHeight: 16,
  },
  debugLogEmpty: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  debugClear: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.sm,
    alignItems: 'center',
  },
  debugClearText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: typography.semibold,
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
    marginBottom: spacing.lg,
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
    textAlign: 'center',
  },
  currentPlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.sm,
  },
  currentPlanText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.success,
  },
  planToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  planToggleButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  planToggleButtonActive: {
    backgroundColor: colors.primary,
  },
  planToggleButtonActivePro: {
    backgroundColor: colors.premium,
  },
  planToggleText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  planToggleTextActive: {
    color: colors.background,
  },
  pricingCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  pricingCardPro: {
    borderColor: colors.premium,
  },
  pricingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  planName: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  popularBadge: {
    backgroundColor: colors.premium,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  popularText: {
    fontSize: 10,
    fontWeight: typography.bold,
    color: colors.background,
    letterSpacing: 0.5,
  },
  price: {
    fontSize: 56,
    fontWeight: typography.bold,
    color: colors.primary,
  },
  period: {
    fontSize: typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  perMonth: {
    fontSize: typography.bodySmall,
    color: colors.textTertiary,
    marginTop: spacing.xs,
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
    marginBottom: spacing.md,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  subscribeButtonPro: {
    backgroundColor: colors.premium,
  },
  subscribeButtonDisabled: {
    opacity: 0.5,
  },
  subscribeButtonText: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
    color: colors.background,
  },
  disclaimer: {
    fontSize: typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  comparisonNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  comparisonText: {
    flex: 1,
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  manageButtonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.primary,
  },
});

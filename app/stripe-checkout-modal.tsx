import React, { useRef, useState } from 'react';
import { View, StyleSheet, Pressable, Text, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { usePremium } from '@/hooks/usePremium';

export default function StripeCheckoutModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ url: string; tier: string }>();
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { refresh } = usePremium();

  const checkoutUrl = params.url || '';

  const handleNavigationStateChange = async (navState: any) => {
    console.log('🌐 WebView navigation:', navState.url);
    
    // Check for success deep link
    if (navState.url.includes('fairprep://subscription/success')) {
      console.log('✅ Payment successful! Refreshing subscription...');
      await refresh();
      router.back();
      return;
    }
    
    // Check for cancel deep link
    if (navState.url.includes('fairprep://subscription/cancel')) {
      console.log('❌ Payment cancelled');
      router.back();
      return;
    }
  };

  const handleClose = () => {
    console.log('🔙 Closing checkout modal');
    router.back();
  };

  if (!checkoutUrl) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={colors.error} />
          <Text style={styles.errorText}>No checkout URL provided</Text>
          <Pressable style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialIcons name="lock" size={20} color={colors.success} />
        <Text style={styles.headerText}>Secure Checkout</Text>
        <Pressable style={styles.headerCloseButton} onPress={handleClose}>
          <MaterialIcons name="close" size={24} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading checkout...</Text>
        </View>
      )}

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: checkoutUrl }}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('❌ WebView error:', nativeEvent);
          setIsLoading(false);
        }}
        startInLoadingState={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        sharedCookiesEnabled={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    flex: 1,
  },
  headerCloseButton: {
    padding: spacing.xs,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingText: {
    fontSize: typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  closeButtonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.background,
  },
});

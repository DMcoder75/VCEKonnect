import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
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
  const { refresh } = usePremium();
  const webViewRef = useRef<WebView>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState('');
  
  const checkoutUrl = params.url;
  const tier = params.tier;

  if (!checkoutUrl) {
    router.back();
    return null;
  }

  function handleNavigationStateChange(navState: any) {
    setCurrentUrl(navState.url);
    console.log('🌐 WebView navigated to:', navState.url);
    
    // Check if user completed payment or cancelled
    if (navState.url.includes('fairprep://subscription/success')) {
      console.log('✅ Payment successful!');
      
      // Close modal and refresh subscription status
      setTimeout(async () => {
        await refresh();
        router.back();
        // Show success message
        setTimeout(() => {
          alert(`Successfully subscribed to ${tier === 'basic' ? 'Basic' : 'Pro'} Plan!`);
        }, 500);
      }, 1000);
    } else if (navState.url.includes('fairprep://subscription/cancel')) {
      console.log('❌ Payment cancelled');
      
      // Close modal
      setTimeout(() => {
        router.back();
      }, 500);
    }
  }

  function handleClose() {
    router.back();
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleClose} style={styles.closeButton}>
          <MaterialIcons name="close" size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <MaterialIcons name="lock" size={16} color={colors.success} />
          <Text style={styles.headerTitle}>Secure Checkout</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading checkout...</Text>
        </View>
      )}

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: checkoutUrl }}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onNavigationStateChange={handleNavigationStateChange}
        style={styles.webview}
        startInLoadingState={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        // Handle errors
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView HTTP error:', nativeEvent.statusCode);
        }}
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    padding: spacing.xs,
    width: 40,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    alignItems: 'center',
    gap: spacing.md,
    zIndex: 10,
  },
  loadingText: {
    fontSize: typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

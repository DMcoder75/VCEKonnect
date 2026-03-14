import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { usePremium } from '@/hooks/usePremium';

export default function StripeCheckoutModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ url: string; tier: string }>();
  const { refresh } = usePremium();

  const url = params.url || '';
  const tier = params.tier || 'basic';

  const [isLoading, setIsLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [navigationLog, setNavigationLog] = useState<string[]>([]);

  // Log navigation for debugging
  const logNavigation = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const log = `[${timestamp}] ${message}`;
    console.log('🌐 WEBVIEW:', log);
    setNavigationLog(prev => [...prev, log]);
  };

  // Log initial URL
  useEffect(() => {
    logNavigation(`Initial URL: ${url}`);
  }, [url]);

  const handleNavigationStateChange = async (navState: any) => {
    const newUrl = navState.url;
    setCurrentUrl(newUrl);
    logNavigation(`Navigation detected: ${newUrl}`);
    logNavigation(`Loading: ${navState.loading ? 'YES' : 'NO'}`);
    logNavigation(`Title: ${navState.title || 'No title'}`);

    // Check if redirected to success deep link
    if (newUrl.includes('fairprep://subscription/success')) {
      logNavigation('✅ SUCCESS DEEP LINK DETECTED!');
      console.log('✅ Payment successful! Refreshing subscription...');
      
      // Refresh subscription status in background
      refresh().catch(error => {
        console.error('Refresh error:', error);
        logNavigation(`Error refreshing: ${error}`);
      });
      
      // Show success alert ALWAYS (payment was successful)
      Alert.alert(
        'Subscription Successful!',
        `Your ${tier === 'pro' ? 'Pro' : 'Basic'} subscription is now active.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to dashboard
              router.dismissAll();
              router.replace('/(tabs)');
            }
          }
        ]
      );
      return;
    }

    // Check if redirected to cancel deep link
    if (newUrl.includes('fairprep://subscription/cancel')) {
      logNavigation('❌ CANCEL DEEP LINK DETECTED!');
      console.log('❌ Payment cancelled');
      router.back();
      return;
    }

    // Check if we hit Stripe's success page (they show a success message before redirecting)
    // Only log, don't auto-close - wait for actual redirect
    if (newUrl.includes('checkout.stripe.com') && navState.title?.toLowerCase().includes('success')) {
      logNavigation('🎯 Stripe success page detected! Waiting for redirect...');
    }

    // Check if we hit the payment success/cancel handler pages
    if (newUrl.includes('functions/v1/payment-success')) {
      logNavigation('📄 Hit payment-success handler page');
      handlePaymentComplete('success');
    }
    if (newUrl.includes('functions/v1/payment-cancel')) {
      logNavigation('📄 Hit payment-cancel handler page');
      handlePaymentComplete('cancel');
    }
  };

  const handlePaymentComplete = async (status: 'success' | 'cancel') => {
    if (status === 'success') {
      logNavigation('✅ Processing payment success');
      
      // Refresh subscription status in background
      refresh().catch(error => {
        console.error('Refresh error:', error);
        logNavigation(`Error: ${error}`);
      });
      
      // Show success alert ALWAYS (payment was successful)
      Alert.alert(
        'Subscription Successful!',
        `Your ${tier === 'pro' ? 'Pro' : 'Basic'} subscription is now active.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to dashboard
              router.dismissAll();
              router.replace('/(tabs)');
            }
          }
        ]
      );
    } else {
      logNavigation('❌ Processing payment cancellation');
      router.back();
    }
  };

  if (!url) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={colors.error} />
          <Text style={styles.errorText}>No checkout URL provided</Text>
          <Pressable style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.closeButton} onPress={() => {
          logNavigation('User manually closed modal');
          router.back();
        }}>
          <MaterialIcons name="close" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Secure Checkout</Text>
        <Pressable 
          style={styles.debugButton}
          onPress={() => {
            Alert.alert(
              'Debug Info',
              `Current URL: ${currentUrl}\n\nNavigation Log:\n${navigationLog.slice(-5).join('\n')}`,
              [{ text: 'OK' }]
            );
          }}
        >
          <MaterialIcons name="bug-report" size={20} color={colors.textTertiary} />
        </Pressable>
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading secure checkout...</Text>
        </View>
      )}

      <WebView
        source={{ uri: url }}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={() => {
          setIsLoading(true);
          logNavigation('WebView started loading');
        }}
        onLoadEnd={() => {
          setIsLoading(false);
          logNavigation('WebView finished loading');
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          logNavigation(`WebView error: ${nativeEvent.description}`);
          console.error('WebView error:', nativeEvent);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          logNavigation(`HTTP error: ${nativeEvent.statusCode} - ${nativeEvent.url}`);
        }}
        onShouldStartLoadWithRequest={(request) => {
          // Intercept deep link attempts
          if (request.url.startsWith('fairprep://')) {
            logNavigation(`🔗 Deep link intercepted: ${request.url}`);
            // Let the navigation handler process it
            return true;
          }
          return true;
        }}
        startInLoadingState={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        sharedCookiesEnabled={true}
        allowsBackForwardNavigationGestures={false}
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
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: spacing.sm,
  },
  debugButton: {
    padding: spacing.sm,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
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
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  buttonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.background,
  },
});

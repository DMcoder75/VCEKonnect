import React, { useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';
import { Pressable } from 'react-native';

export default function StripeCheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ url: string; tier: string }>();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);

  const handleNavigationStateChange = (navState: any) => {
    const { url } = navState;
    
    console.log('📱 WebView navigating to:', url);
    
    // Check if we're on success URL
    if (url.includes('subscription/success')) {
      console.log('✅ Payment successful!');
      Alert.alert(
        'Subscription Successful! 🎉',
        'Your premium subscription is now active.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.back();
              // Parent screen will refresh subscription status
            },
          },
        ],
      );
      return false; // Prevent WebView from navigating
    }
    
    // Check if we're on cancel URL
    if (url.includes('subscription/cancel')) {
      console.log('❌ Payment cancelled');
      Alert.alert(
        'Subscription Cancelled',
        'You cancelled the subscription process.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ],
      );
      return false; // Prevent WebView from navigating
    }
    
    return true; // Allow navigation
  };

  if (!params.url) {
    Alert.alert('Error', 'No checkout URL provided');
    router.back();
    return null;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Close Button */}
      <View style={styles.header}>
        <Pressable style={styles.closeButton} onPress={() => {
          Alert.alert(
            'Cancel Payment?',
            'Are you sure you want to cancel the subscription process?',
            [
              { text: 'Continue Payment', style: 'cancel' },
              { text: 'Cancel', style: 'destructive', onPress: () => router.back() },
            ],
          );
        }}>
          <MaterialIcons name="close" size={24} color={colors.textPrimary} />
        </Pressable>
      </View>

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: params.url }}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
          Alert.alert(
            'Loading Error',
            'Failed to load payment page. Please try again.',
            [{ text: 'OK', onPress: () => router.back() }],
          );
        }}
        // Security settings
        javaScriptEnabled={true}
        domStorageEnabled={true}
        thirdPartyCookiesEnabled={true}
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
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    padding: 8,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});

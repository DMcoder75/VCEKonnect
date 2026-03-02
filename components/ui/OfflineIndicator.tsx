import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { isOnline, onNetworkChange } from '@/services/networkService';

export function OfflineIndicator() {
  const [isConnected, setIsConnected] = useState(isOnline());
  const [slideAnim] = useState(new Animated.Value(-60));

  useEffect(() => {
    const unsubscribe = onNetworkChange((connected) => {
      setIsConnected(connected);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isConnected) {
      // Slide down
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 8,
      }).start();
    } else {
      // Slide up
      Animated.spring(slideAnim, {
        toValue: -60,
        useNativeDriver: true,
        tension: 65,
        friction: 8,
      }).start();
    }
  }, [isConnected]);

  return (
    <Animated.View 
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }] }
      ]}
    >
      <MaterialIcons name="cloud-off" size={16} color={colors.background} />
      <Text style={styles.text}>Offline Mode - Showing cached data</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    zIndex: 9999,
  },
  text: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.background,
  },
});

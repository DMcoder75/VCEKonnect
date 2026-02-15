import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';

interface GoalAlertBannerProps {
  show: boolean;
  type: 'week_complete' | 'on_pace' | 'behind_pace' | 'milestone';
  message: string;
  onDismiss?: () => void;
}

export function GoalAlertBanner({ show, type, message, onDismiss }: GoalAlertBannerProps) {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (show) {
      // Slide down
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();

      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Slide up
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [show]);

  const getConfig = () => {
    switch (type) {
      case 'week_complete':
        return {
          icon: 'emoji-events' as const,
          color: colors.premium,
          bgColor: `${colors.premium}20`,
          borderColor: colors.premium,
        };
      case 'on_pace':
        return {
          icon: 'trending-up' as const,
          color: colors.success,
          bgColor: `${colors.success}20`,
          borderColor: colors.success,
        };
      case 'behind_pace':
        return {
          icon: 'trending-down' as const,
          color: colors.warning,
          bgColor: `${colors.warning}20`,
          borderColor: colors.warning,
        };
      case 'milestone':
        return {
          icon: 'stars' as const,
          color: colors.primary,
          bgColor: `${colors.primary}20`,
          borderColor: colors.primary,
        };
      default:
        return {
          icon: 'info' as const,
          color: colors.primary,
          bgColor: `${colors.primary}20`,
          borderColor: colors.primary,
        };
    }
  };

  const config = getConfig();

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
          transform: [{ translateY: slideAnim }, { scale: pulseAnim }],
        },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: config.color }]}>
        <MaterialIcons name={config.icon} size={24} color={colors.background} />
      </View>
      <Text style={styles.message}>{message}</Text>
      {onDismiss && (
        <Pressable onPress={onDismiss} style={styles.closeButton}>
          <MaterialIcons name="close" size={20} color={colors.textSecondary} />
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    flex: 1,
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  closeButton: {
    padding: spacing.xs,
  },
});

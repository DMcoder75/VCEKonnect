import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { Achievement } from '@/services/achievementsService';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const ANIMATION_DURATION = 3000; // 3 seconds total
const TOAST_HEIGHT = 80;

interface AchievementLaunchToastProps {
  achievement: Achievement;
  onComplete: () => void;
}

export function AchievementLaunchToast({ achievement, onComplete }: AchievementLaunchToastProps) {
  const translateY = useRef(new Animated.Value(0)).current; // Start at bottom (offset 0)
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation sequence:
    // 1. Slide up from bottom to 80% screen (0.8s)
    // 2. Stay visible at 80% (1.5s)
    // 3. Fade out while continuing upward to ~75% (0.7s)
    
    const targetPosition = SCREEN_HEIGHT * 0.8; // 80% from bottom
    const fadeOutPosition = SCREEN_HEIGHT * 0.75; // 75% from bottom

    Animated.sequence([
      // Phase 1: Slide up and fade in (800ms)
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -targetPosition,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.8, // 80% visible
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      
      // Phase 2: Stay visible (1500ms)
      Animated.delay(1500),
      
      // Phase 3: Continue upward and fade out (700ms)
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -fadeOutPosition,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      onComplete();
    });
  }, []);

  // Helper to map icon names to MaterialIcons
  function getIconName(iconName: string): any {
    const iconMap: Record<string, any> = {
      cookie: 'cookie',
      pizza: 'local-pizza',
      'ice-cream': 'icecream',
      chocolate: 'cake',
      trophy: 'emoji-events',
      star: 'star',
      fire: 'local-fire-department',
      medal: 'military-tech',
    };
    return iconMap[iconName] || 'emoji-events';
  }

  // Helper to get color based on achievement type
  function getColor(type: string): string {
    if (type.includes('subject_first_completion')) return colors.warning;
    if (type.includes('subject_5_completions')) return '#FF69B4';
    if (type.includes('subject_10_completions')) return colors.premium;
    if (type.includes('subject_perfect_week')) return '#FFD700';
    if (type.includes('subject_overachiever')) return '#FF8C00';
    if (type.includes('subject_streak_3')) return '#CD7F32';
    if (type.includes('subject_streak_5')) return '#C0C0C0';
    if (type.includes('subject_streak_10')) return '#FFD700';
    return colors.primary;
  }

  const accentColor = getColor(achievement.achievementType);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
          borderColor: accentColor,
        },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: accentColor + '30' }]}>
        <MaterialIcons
          name={getIconName(achievement.iconName)}
          size={40}
          color={accentColor}
        />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.badge}>🎉 ACHIEVEMENT UNLOCKED</Text>
        <Text style={styles.title} numberOfLines={1}>
          {achievement.achievementName}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {achievement.achievementDescription}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: TOAST_HEIGHT,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  badge: {
    fontSize: 10,
    fontWeight: typography.bold,
    color: colors.premium,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
  },
});

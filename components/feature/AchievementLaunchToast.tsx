import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { Achievement } from '@/services/achievementsService';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const ANIMATION_DURATION = 7000; // 7 seconds total (slower)
const TOAST_HEIGHT = 60;

interface AchievementLaunchToastProps {
  achievement: Achievement;
  onComplete: () => void;
}

export function AchievementLaunchToast({ achievement, onComplete }: AchievementLaunchToastProps) {
  const translateY = useRef(new Animated.Value(0)).current; // Start at bottom (offset 0)
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation sequence (slower, left-aligned, travels more):
    // 1. Slide up from bottom to 35% from bottom (2s)
    // 2. Stay visible at 35% (3.5s)
    // 3. Fade out while continuing upward to 65% (1.5s)
    
    const targetPosition = SCREEN_HEIGHT * 0.35; // 35% from bottom (visible area)
    const fadeOutPosition = SCREEN_HEIGHT * 0.65; // 65% from bottom (travel more)

    Animated.sequence([
      // Phase 1: Slide up and fade in (2000ms)
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -targetPosition,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.85, // 85% visible
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
      
      // Phase 2: Stay visible (3500ms)
      Animated.delay(3500),
      
      // Phase 3: Continue upward and fade out (1500ms)
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -fadeOutPosition,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 1500,
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

  // Extract subject name from metadata (subject_code or subject_id)
  const subjectCode = achievement.metadata?.subject_code || achievement.metadata?.subject_id || achievement.metadata?.subjectCode || achievement.metadata?.subjectName;
  const subjectName = subjectCode || 'Subject';
  const periodType = 'weekly';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
          backgroundColor: accentColor + '15',
        },
      ]}
    >
      <Text style={styles.simpleMessage}>
        <Text style={styles.icon}>{achievement.iconName === 'cookie' ? '🍪' : 
                                    achievement.iconName === 'pizza' ? '🍕' : 
                                    achievement.iconName === 'ice-cream' ? '🍦' : 
                                    achievement.iconName === 'chocolate' ? '🍫' : 
                                    achievement.iconName === 'trophy' ? '🏆' : '⭐'}</Text>
        <Text style={styles.messageText}> {subjectName} {periodType} achievement</Text>
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: spacing.md,
    right: SCREEN_WIDTH * 0.25, // Leave space on right (75% width)
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    alignItems: 'flex-start', // Left-aligned
    justifyContent: 'center',
    minHeight: TOAST_HEIGHT,
  },
  simpleMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  icon: {
    fontSize: 20,
  },
  messageText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
});

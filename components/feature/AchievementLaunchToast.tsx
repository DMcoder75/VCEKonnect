import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { Achievement } from '@/services/achievementsService';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const ANIMATION_DURATION = 6000; // 6 seconds total (slower)
const TOAST_HEIGHT = 60;

interface AchievementLaunchToastProps {
  achievement: Achievement;
  onComplete: () => void;
}

export function AchievementLaunchToast({ achievement, onComplete }: AchievementLaunchToastProps) {
  const translateY = useRef(new Animated.Value(0)).current; // Start at bottom (offset 0)
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation sequence (slower, stays lower on screen):
    // 1. Slide up from bottom to 20% from bottom (1.5s)
    // 2. Stay visible at 20% (3s)
    // 3. Fade out while continuing upward to ~15% (1.5s)
    
    const targetPosition = SCREEN_HEIGHT * 0.2; // 20% from bottom (stay lower)
    const fadeOutPosition = SCREEN_HEIGHT * 0.25; // 25% from bottom

    Animated.sequence([
      // Phase 1: Slide up and fade in (1500ms)
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -targetPosition,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.8, // 80% visible
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
      
      // Phase 2: Stay visible (3000ms)
      Animated.delay(3000),
      
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

  // Extract subject name from metadata or description
  const subjectName = achievement.metadata?.subjectCode || achievement.metadata?.subjectName || 'Subject';
  const periodType = achievement.achievementType.includes('weekly') ? 'weekly' : 
                     achievement.achievementType.includes('monthly') ? 'monthly' : 'goal';

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
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TOAST_HEIGHT,
  },
  simpleMessage: {
    flexDirection: 'row',
    alignItems: 'center',
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

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { Achievement } from '@/services/achievementsService';

interface LatestAchievementBannerProps {
  achievement: Achievement;
  onPress?: () => void;
}

export function LatestAchievementBanner({ achievement, onPress }: LatestAchievementBannerProps) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const [descriptionWidth, setDescriptionWidth] = React.useState(0);
  const [containerWidth, setContainerWidth] = React.useState(0);

  useEffect(() => {
    if (descriptionWidth > containerWidth && containerWidth > 0) {
      // Start scrolling animation if text overflows
      const scrollDistance = descriptionWidth - containerWidth;
      Animated.loop(
        Animated.sequence([
          Animated.delay(1000), // Wait 1s before scrolling
          Animated.timing(scrollX, {
            toValue: -scrollDistance,
            duration: scrollDistance * 30, // Slower scroll (30ms per pixel)
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.delay(1000), // Wait 1s at end
          Animated.timing(scrollX, {
            toValue: 0,
            duration: scrollDistance * 30,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [descriptionWidth, containerWidth]);
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

  // Helper to get icon color based on achievement type
  function getIconColor(type: string): string {
    if (type.includes('subject_first_completion')) return colors.warning; // Cookie
    if (type.includes('subject_5_completions')) return '#FF69B4'; // Sweet Streak (pink)
    if (type.includes('subject_10_completions')) return colors.premium; // Snack Master
    if (type.includes('subject_perfect_week')) return '#FFD700'; // Perfect Week (gold)
    if (type.includes('subject_overachiever')) return '#FF8C00'; // Overachiever (orange)
    if (type.includes('subject_streak_3')) return '#CD7F32'; // 3-Week Champ (bronze)
    if (type.includes('subject_streak_5')) return '#C0C0C0'; // 5-Week Master (silver)
    if (type.includes('subject_streak_10')) return '#FFD700'; // 10-Week Legend (gold)
    return colors.primary;
  }

  // Extract subject name from metadata
  const subjectName = achievement.metadata?.subjectCode || achievement.metadata?.subjectName || 'Subject';
  const periodType = achievement.achievementType.includes('weekly') ? 'weekly' : 
                     achievement.achievementType.includes('monthly') ? 'monthly' : '';
  
  // Format description as: "Completed {subject} {period} goal! {original description}"
  const formattedDescription = periodType 
    ? `Completed ${subjectName} ${periodType} goal! ${achievement.achievementDescription.split(' - ')[1] || achievement.achievementDescription}`
    : achievement.achievementDescription;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { borderColor: getIconColor(achievement.achievementType) },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: getIconColor(achievement.achievementType) + '20' }]}>
          <MaterialIcons
            name={getIconName(achievement.iconName)}
            size={32}
            color={getIconColor(achievement.achievementType)}
          />
        </View>
        <View 
          style={styles.textContainer}
          onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
          <View style={styles.titleRow}>
            <Text style={styles.newBadge}>NEW</Text>
          </View>
          <Text style={styles.title}>{achievement.achievementName}</Text>
          <View style={styles.descriptionContainer}>
            <Animated.Text
              style={[
                styles.description,
                { transform: [{ translateX: scrollX }] },
              ]}
              numberOfLines={1}
              onLayout={(e) => setDescriptionWidth(e.nativeEvent.layout.width)}
            >
              {formattedDescription}
            </Animated.Text>
          </View>
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pressed: {
    opacity: 0.7,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  newBadge: {
    fontSize: 10,
    fontWeight: typography.bold,
    color: colors.background,
    backgroundColor: colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  descriptionContainer: {
    overflow: 'hidden',
  },
  title: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
  },
});

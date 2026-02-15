import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/constants/theme';
import { MaterialIcons } from '@expo/vector-icons';

interface StudyGoalRingProps {
  label: string;
  targetHours: number;
  achievedHours: number;
  progressPercent: number;
  size?: 'small' | 'medium' | 'large';
  icon?: keyof typeof MaterialIcons.glyphMap;
}

export function StudyGoalRing({
  label,
  targetHours,
  achievedHours,
  progressPercent,
  size = 'medium',
  icon,
}: StudyGoalRingProps) {
  const progress = Math.min(100, Math.max(0, progressPercent));
  
  const getColor = () => {
    if (progress >= 100) return colors.success;
    if (progress >= 75) return colors.primary;
    if (progress >= 50) return colors.warning;
    return colors.error;
  };
  
  const ringColor = getColor();

  return (
    <View style={styles.container}>
      <View style={styles.ringWrapper}>
        <View style={[styles.progressCircle, { borderColor: ringColor }]}>
          <Text style={[styles.percentage, { color: ringColor }]}>
            {Math.round(progress)}%
          </Text>
        </View>
      </View>
      
      <View style={styles.stats}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.hours}>
          {achievedHours.toFixed(1)}/{targetHours}h
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  ringWrapper: {
    marginBottom: spacing.sm,
  },
  progressCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  percentage: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
  },
  stats: {
    alignItems: 'center',
  },
  label: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    fontWeight: typography.semibold,
  },
  hours: {
    fontSize: typography.bodySmall,
    color: colors.textPrimary,
    marginTop: 2,
  },
});

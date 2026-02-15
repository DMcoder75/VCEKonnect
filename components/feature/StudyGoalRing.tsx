import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/constants/theme';

interface StudyGoalRingProps {
  label: string;
  targetHours: number;
  achievedHours: number;
  progressPercent: number;
  size?: 'small' | 'medium' | 'large';
  icon?: string;
}

export function StudyGoalRing({
  label,
  targetHours,
  achievedHours,
  progressPercent,
}: StudyGoalRingProps) {
  const progress = Math.min(100, Math.max(0, progressPercent || 0));
  
  let ringColor = colors.error;
  if (progress >= 100) ringColor = colors.success;
  else if (progress >= 75) ringColor = colors.primary;
  else if (progress >= 50) ringColor = colors.warning;

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
        <Text style={styles.label}>{label || 'Goal'}</Text>
        <Text style={styles.hours}>
          {(achievedHours || 0).toFixed(1)}/{targetHours || 0}h
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
    fontWeight: typography.bold as any,
  },
  stats: {
    alignItems: 'center',
  },
  label: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    fontWeight: typography.semibold as any,
  },
  hours: {
    fontSize: typography.bodySmall,
    color: colors.textPrimary,
    marginTop: 2,
  },
});

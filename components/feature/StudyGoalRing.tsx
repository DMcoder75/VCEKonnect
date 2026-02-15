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
  
  // Color based on progress
  const getColor = () => {
    if (progress >= 100) return colors.success;
    if (progress >= 75) return colors.primary;
    if (progress >= 50) return colors.warning;
    return colors.error;
  };
  
  const ringColor = getColor();
  const ringSize = size === 'large' ? 100 : size === 'medium' ? 80 : 60;

  return (
    <View style={styles.container}>
      {/* Simple circular progress indicator */}
      <View style={[styles.ringContainer, { width: ringSize, height: ringSize }]}>
        <View
          style={[
            styles.ring,
            {
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              borderWidth: 8,
              borderColor: colors.border,
            },
          ]}
        />
        <View style={styles.centerContent}>
          {icon && <MaterialIcons name={icon} size={20} color={ringColor} />}
          <Text style={[styles.percentage, { color: ringColor }]}>
            {Math.round(progress)}%
          </Text>
        </View>
      </View>
      
      {/* Label and stats */}
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
  ringContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
  },
  centerContent: {
    alignItems: 'center',
    gap: 4,
  },
  percentage: {
    fontSize: typography.body,
    fontWeight: typography.bold,
  },
  stats: {
    marginTop: spacing.sm,
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

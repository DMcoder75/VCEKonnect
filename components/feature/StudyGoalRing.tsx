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
  // Size configs
  const sizeConfig = {
    small: { ring: 60, stroke: 6, fontSize: 14, iconSize: 16 },
    medium: { ring: 80, stroke: 8, fontSize: 16, iconSize: 20 },
    large: { ring: 100, stroke: 10, fontSize: 20, iconSize: 24 },
  };
  
  const config = sizeConfig[size];
  const progress = Math.min(100, Math.max(0, progressPercent));
  
  // Color based on progress
  const getColor = () => {
    if (progress >= 100) return colors.success;
    if (progress >= 75) return colors.primary;
    if (progress >= 50) return colors.warning;
    return colors.error;
  };
  
  const ringColor = getColor();

  return (
    <View style={styles.container}>
      {/* Progress Ring */}
      <View style={[styles.ringContainer, { width: config.ring, height: config.ring }]}>
        {/* Background circle */}
        <View
          style={[
            styles.backgroundRing,
            {
              width: config.ring,
              height: config.ring,
              borderRadius: config.ring / 2,
              borderWidth: config.stroke,
              borderColor: colors.border,
            },
          ]}
        />
        
        {/* Progress overlay - simplified to colored border */}
        <View
          style={[
            styles.progressRing,
            {
              width: config.ring,
              height: config.ring,
              borderRadius: config.ring / 2,
              borderWidth: config.stroke,
              borderColor: 'transparent',
              borderTopColor: progress > 0 ? ringColor : 'transparent',
              borderRightColor: progress > 25 ? ringColor : 'transparent',
              borderBottomColor: progress > 50 ? ringColor : 'transparent',
              borderLeftColor: progress > 75 ? ringColor : 'transparent',
              opacity: progress / 100,
            },
          ]}
        />
        
        {/* Center content */}
        <View style={styles.centerContent}>
          {icon && (
            <MaterialIcons name={icon} size={config.iconSize} color={ringColor} />
          )}
          <Text style={[styles.percentage, { fontSize: config.fontSize, color: ringColor }]}>
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
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundRing: {
    position: 'absolute',
  },
  progressRing: {
    position: 'absolute',
  },
  centerContent: {
    alignItems: 'center',
    gap: 2,
  },
  percentage: {
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

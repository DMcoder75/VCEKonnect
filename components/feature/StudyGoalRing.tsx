import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { colors, spacing, typography } from '@/constants/theme';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

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
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const previousProgress = useRef(0);
  // Size configs
  const sizeConfig = {
    small: { ring: 60, stroke: 6, fontSize: 14, iconSize: 16 },
    medium: { ring: 80, stroke: 8, fontSize: 16, iconSize: 20 },
    large: { ring: 100, stroke: 10, fontSize: 20, iconSize: 24 },
  };
  
  const config = sizeConfig[size];
  const radius = (config.ring - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, progressPercent));
  
  // Celebrate when goal is achieved
  useEffect(() => {
    if (progress >= 100 && previousProgress.current < 100) {
      // Pulse animation for celebration
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
    previousProgress.current = progress;
  }, [progress]);
  
  // Smooth progress animation
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress]);
  
  const animatedStrokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });
  
  // Color based on progress
  const getColor = () => {
    if (progress >= 100) return colors.success;
    if (progress >= 75) return colors.primary;
    if (progress >= 50) return colors.warning;
    return colors.error;
  };
  
  const ringColor = getColor();

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
      {/* Trophy icon for 100% completion */}
      {progress >= 100 && (
        <View style={styles.trophyBadge}>
          <MaterialIcons name="emoji-events" size={16} color={colors.premium} />
        </View>
      )}
      
      {/* Progress Ring */}
      <View style={[styles.ringContainer, { width: config.ring, height: config.ring }]}>
        {/* Background circle */}
        <Svg width={config.ring} height={config.ring} style={styles.svg}>
          <Circle
            cx={config.ring / 2}
            cy={config.ring / 2}
            r={radius}
            stroke={colors.border}
            strokeWidth={config.stroke}
            fill="none"
          />
          {/* Progress circle */}
          <AnimatedCircle
            cx={config.ring / 2}
            cy={config.ring / 2}
            r={radius}
            stroke={ringColor}
            strokeWidth={config.stroke}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={animatedStrokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${config.ring / 2}, ${config.ring / 2}`}
          />
        </Svg>
        
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
    </Animated.View>
  );
}

// Animated SVG Circle component
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    position: 'relative',
  },
  trophyBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.background,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.premium,
    zIndex: 10,
  },
  ringContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  svg: {
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

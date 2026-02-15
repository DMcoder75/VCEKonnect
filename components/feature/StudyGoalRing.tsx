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
  isActive?: boolean; // True when timer is running for this goal
  liveProgress?: number; // Real-time progress including current timer
}

export function StudyGoalRing({
  label,
  targetHours,
  achievedHours,
  progressPercent,
  size = 'medium',
  icon,
  isActive = false,
  liveProgress,
}: StudyGoalRingProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
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
  // Use live progress when timer is active, otherwise use stored progress
  const displayProgress = isActive && liveProgress !== undefined ? liveProgress : progressPercent;
  const progress = Math.min(100, Math.max(0, displayProgress));
  
  // Pulsing glow animation when timer is active
  useEffect(() => {
    if (isActive) {
      // Continuous pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
      
      // Glow animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Reset to normal when inactive
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
      
      // Celebrate when goal is achieved
      if (progress >= 100 && previousProgress.current < 100) {
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
    }
    previousProgress.current = progress;
  }, [isActive, progress]);
  
  // Smooth progress animation (faster when active for real-time feel)
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: isActive ? 300 : 800,
      easing: isActive ? Easing.linear : Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, isActive]);
  
  const animatedStrokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });
  
  // Color based on progress with smooth transitions
  const getColor = () => {
    if (progress >= 100) return colors.success;
    if (progress >= 90) return '#00d084'; // Bright green approaching completion
    if (progress >= 75) return colors.primary;
    if (progress >= 50) return colors.warning;
    if (progress >= 25) return '#ff9500'; // Orange
    return colors.error;
  };
  
  const ringColor = getColor();
  
  // Animated glow opacity
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
      {/* Glow effect when active */}
      {isActive && (
        <Animated.View
          style={[
            styles.glowRing,
            {
              width: config.ring + 16,
              height: config.ring + 16,
              borderRadius: (config.ring + 16) / 2,
              opacity: glowOpacity,
              backgroundColor: ringColor,
            },
          ]}
        />
      )}
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
  glowRing: {
    position: 'absolute',
    top: -8,
    left: -8,
    opacity: 0.3,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
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

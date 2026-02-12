import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';

interface StudyTimerCardProps {
  subjectId: string;
  subjectCode?: string;
  subjectName?: string;
  elapsedSeconds: number;
  isActive: boolean;
  totalMinutes?: number;
  onStart: () => void;
  onStop: () => void;
}

export function StudyTimerCard({
  subjectId,
  subjectCode,
  subjectName,
  elapsedSeconds,
  isActive,
  totalMinutes = 0,
  onStart,
  onStop,
}: StudyTimerCardProps) {
  // Use code as primary display, name as secondary
  const displayCode = subjectCode || subjectId;
  const displayName = subjectName || '';
  
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  const formatTotalTime = (minutes: number): string => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  return (
    <View style={[styles.card, isActive && styles.cardActive]}>
      <View style={styles.header}>
        <View style={styles.leftSection}>
          <Text style={styles.subjectCode}>{displayCode}</Text>
          {displayName && <Text style={styles.subjectName}>{displayName}</Text>}
        </View>
        
        <View style={styles.centerSection}>
          <Text style={styles.totalTime}>{formatTotalTime(totalMinutes)}</Text>
          <Text style={styles.totalTimeLabel}>Total</Text>
        </View>
        
        <Pressable
          onPress={isActive ? onStop : onStart}
          style={({ pressed }) => [
            styles.button,
            isActive ? styles.buttonStop : styles.buttonStart,
            pressed && styles.buttonPressed,
          ]}
        >
          <MaterialIcons
            name={isActive ? 'stop' : 'play-arrow'}
            size={24}
            color={colors.textPrimary}
          />
        </Pressable>
      </View>
      
      {isActive && (
        <View style={styles.timerContainer}>
          <Text style={styles.timer}>{formatTime(elapsedSeconds)}</Text>
          <View style={styles.pulseIndicator} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  cardActive: {
    borderColor: colors.timerActive,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flex: 1,
  },
  centerSection: {
    alignItems: 'center',
    marginHorizontal: spacing.md,
  },
  subjectCode: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  subjectName: {
    fontSize: typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  totalTime: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  totalTimeLabel: {
    fontSize: typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonStart: {
    backgroundColor: colors.primary,
  },
  buttonStop: {
    backgroundColor: colors.error,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  timerContainer: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timer: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.primary,
  },
  pulseIndicator: {
    width: 12,
    height: 12,
    borderRadius: borderRadius.full,
    backgroundColor: colors.success,
  },
});

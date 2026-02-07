import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { VCE_SUBJECTS } from '@/constants/vceData';

interface StudyTimerCardProps {
  subjectId: string;
  elapsedSeconds: number;
  isActive: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function StudyTimerCard({
  subjectId,
  elapsedSeconds,
  isActive,
  onStart,
  onStop,
}: StudyTimerCardProps) {
  const subject = VCE_SUBJECTS.find(s => s.id === subjectId);
  
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  return (
    <View style={[styles.card, isActive && styles.cardActive]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.subjectName}>{subject?.name || subjectId}</Text>
          <Text style={styles.subjectCode}>{subject?.code || ''}</Text>
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
  subjectName: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  subjectCode: {
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

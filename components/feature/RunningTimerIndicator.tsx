import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/constants/theme';
import { useStudyTimer } from '@/hooks/useStudyTimer';
import { VCESubject } from '@/services/vceSubjectsService';
import { getUserSubjects } from '@/services/userSubjectsService';
import { useAuth } from '@/hooks/useAuth';

export function RunningTimerIndicator() {
  const { user } = useAuth();
  const { activeSubject, isRunning, elapsedSeconds } = useStudyTimer();
  const [subjectCode, setSubjectCode] = useState<string>('');
  const [blinkAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (activeSubject && user) {
      loadSubjectCode();
    }
  }, [activeSubject, user]);

  // Blinking animation
  useEffect(() => {
    if (isRunning) {
      const blink = Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, {
            toValue: 0.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(blinkAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      blink.start();
      return () => blink.stop();
    } else {
      blinkAnim.setValue(1);
    }
  }, [isRunning]);

  async function loadSubjectCode() {
    if (!user || !activeSubject) return;
    
    const subjects = await getUserSubjects(user.id);
    const subject = subjects.find(s => s.id === activeSubject);
    if (subject) {
      setSubjectCode(subject.code);
    }
  }

  function formatTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m ${secs}s`;
  }

  if (!isRunning || !subjectCode) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.subjectCode}>{subjectCode}</Text>
        <Animated.View style={{ opacity: blinkAnim }}>
          <MaterialIcons name="access-time" size={16} color={colors.error} />
        </Animated.View>
        <Text style={styles.time}>{formatTime(elapsedSeconds)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: colors.error,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.error,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  subjectCode: {
    fontSize: typography.caption,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  time: {
    fontSize: typography.caption,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
});

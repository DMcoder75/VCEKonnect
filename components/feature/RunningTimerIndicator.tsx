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
  const { activeSubject, isRunning } = useStudyTimer();
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
            toValue: 0.3,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(blinkAnim, {
            toValue: 1,
            duration: 600,
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

  if (!isRunning || !subjectCode) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.subjectCode}>{subjectCode}:</Text>
      <Animated.View style={{ opacity: blinkAnim }}>
        <MaterialIcons name="access-time" size={14} color={colors.error} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  subjectCode: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
});

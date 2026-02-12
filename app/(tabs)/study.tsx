import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useStudyTimer } from '@/hooks/useStudyTimer';
import { StudyTimerCard } from '@/components/feature';
import { getAllVCESubjects, VCESubject } from '@/services/vceSubjectsService';

export default function StudyScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { activeSubject, elapsedSeconds, startTimer, stopTimer } = useStudyTimer();
  
  const [weeklyTime, setWeeklyTime] = useState<{ [key: string]: number }>({});
  const [allSubjects, setAllSubjects] = useState<VCESubject[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);

  useEffect(() => {
    loadSubjects();
  }, []);

  useEffect(() => {
    loadWeeklyTime();
  }, [activeSubject]);

  async function loadSubjects() {
    setIsLoadingSubjects(true);
    const subjects = await getAllVCESubjects();
    setAllSubjects(subjects);
    setIsLoadingSubjects(false);
  }

  async function loadWeeklyTime() {
    const { getWeeklyStudyTime } = useStudyTimer();
    const time = await getWeeklyStudyTime();
    setWeeklyTime(time);
  }

  const userSubjects = allSubjects.filter(s => user?.selectedSubjects.includes(s.id));

  async function handleStopTimer() {
    await stopTimer();
    loadWeeklyTime();
  }

  const totalWeeklyMinutes = Object.values(weeklyTime).reduce((sum, time) => sum + time, 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Study Tracker</Text>
          <MaterialIcons name="timer" size={32} color={colors.primary} />
        </View>

        {/* Weekly Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>This Week's Total</Text>
          <Text style={styles.summaryTime}>
            {Math.floor(totalWeeklyMinutes / 60)}h {totalWeeklyMinutes % 60}m
          </Text>
          <View style={styles.summaryStats}>
            <View style={styles.statItem}>
              <MaterialIcons name="local-fire-department" size={20} color={colors.warning} />
              <Text style={styles.statText}>
                {Math.floor(totalWeeklyMinutes / 7)}m daily avg
              </Text>
            </View>
          </View>
        </View>

        {/* Subject Timers */}
        <Text style={styles.sectionTitle}>Your Subjects</Text>
        {isLoadingSubjects ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading subjects...</Text>
          </View>
        ) : userSubjects.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="subject" size={64} color={colors.textTertiary} />
            <Text style={styles.emptyText}>No subjects selected</Text>
            <Text style={styles.emptyDesc}>Add subjects in settings</Text>
          </View>
        ) : (
          <>
            {userSubjects.map(subject => {
              const weeklyMins = weeklyTime[subject.id] || 0;
              return (
                <View key={subject.id}>
                  <StudyTimerCard
                    subjectId={subject.id}
                    elapsedSeconds={activeSubject === subject.id ? elapsedSeconds : 0}
                    isActive={activeSubject === subject.id}
                    onStart={() => startTimer(subject.id)}
                    onStop={handleStopTimer}
                  />
                  <View style={styles.weeklyTimeContainer}>
                    <Text style={styles.weeklyTimeText}>
                      This week: {Math.floor(weeklyMins / 60)}h {weeklyMins % 60}m
                    </Text>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.h1,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  summaryCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryTime: {
    fontSize: 40,
    fontWeight: typography.bold,
    color: colors.primary,
    marginTop: spacing.sm,
  },
  summaryStats: {
    marginTop: spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statText: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  weeklyTimeContainer: {
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    paddingLeft: spacing.md,
  },
  weeklyTimeText: {
    fontSize: typography.caption,
    color: colors.textTertiary,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  emptyText: {
    fontSize: typography.h3,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyDesc: {
    fontSize: typography.bodySmall,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.body,
    color: colors.textSecondary,
  },
});


import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useStudyTimer } from '@/hooks/useStudyTimer';
import { LoadingSpinner } from '@/components/ui';
import { StudyTimerCard } from '@/components/feature';
import { VCESubject } from '@/services/vceSubjectsService';
import { getUserSubjects } from '@/services/userSubjectsService';

export default function StudyScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { activeSubject, elapsedSeconds, startTimer, stopTimer } = useStudyTimer();
  
  const [allTime, setAllTime] = useState<{ [key: string]: number }>({});
  const [userSubjects, setUserSubjects] = useState<VCESubject[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [isLoadingStudyTime, setIsLoadingStudyTime] = useState(true);

  useEffect(() => {
    if (user) {
      loadSubjects();
      loadAllTime();
    }
  }, [user]);

  useEffect(() => {
    if (user && !isLoadingSubjects) {
      loadAllTime();
    }
  }, [user, activeSubject, isLoadingSubjects]);

  async function loadSubjects() {
    if (!user) return;
    setIsLoadingSubjects(true);
    const subjects = await getUserSubjects(user.id);
    setUserSubjects(subjects);
    setIsLoadingSubjects(false);
  }

  async function loadAllTime() {
    if (!user) return;
    setIsLoadingStudyTime(true);
    const { getStudyTimeBySubject } = await import('@/services/studyService');
    const time = await getStudyTimeBySubject(user.id, undefined, undefined);
    setAllTime(time);
    setIsLoadingStudyTime(false);
  }

  async function handleStopTimer() {
    await stopTimer();
    loadAllTime();
  }

  const totalMinutes = Object.values(allTime).reduce((sum, time) => sum + time, 0);
  const isLoading = isLoadingSubjects || isLoadingStudyTime;

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

        {isLoading ? (
          <LoadingSpinner message="Loading study tracker..." />
        ) : (
          <> {/* Added a Fragment here to wrap the conditional content */}
            {/* All Time Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Study Time (All Time)</Text>
              <Text style={styles.summaryTime}>
                {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
              </Text>
              <View style={styles.summaryStats}>
                <View style={styles.statItem}>
                  <MaterialIcons name="local-fire-department" size={20} color={colors.warning} />
                  <Text style={styles.statText}>
                    {userSubjects.length} subjects tracked
                  </Text>
                </View>
              </View>
            </View>

            {/* Subject Timers */}
            <Text style={styles.sectionTitle}>Your Subjects</Text>
            {userSubjects.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="subject" size={64} color={colors.textTertiary} />
                <Text style={styles.emptyText}>No subjects selected</Text>
                <Text style={styles.emptyDesc}>Add subjects in settings</Text>
              </View>
            ) : (
              <>
                {userSubjects.map(subject => {
                  const subjectMins = allTime[subject.id] || 0;
                  return (
                    <StudyTimerCard
                      key={subject.id}
                      subjectId={subject.id}
                      subjectCode={subject.code}
                      subjectName={subject.name}
                      elapsedSeconds={activeSubject === subject.id ? elapsedSeconds : 0}
                      isActive={activeSubject === subject.id}
                      totalMinutes={subjectMins}
                      onStart={() => startTimer(subject.id)}
                      onStop={handleStopTimer}
                    />
                  );
                })}
              </>
            )}
          </>
        )} {/* Closing bracket for the ternary operator */}
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

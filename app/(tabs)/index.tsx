
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useATAR } from '@/hooks/useATAR';
import { useStudyTimer } from '@/hooks/useStudyTimer';
import { ATARDisplay } from '@/components/ui';
import { StudyTimerCard, UpcomingAssessmentCard } from '@/components/feature';
import { useCalendar } from '@/hooks/useCalendar';
import { getAllVCESubjects, VCESubject } from '@/services/vceSubjectsService';
import { getUserSubjects } from '@/services/userSubjectsService';

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { getPrediction, subjectScores } = useATAR();
  const { activeSubject, elapsedSeconds, startTimer, stopTimer, isRunning, getTodayStudyTime } = useStudyTimer();
  const { upcomingEvents, loading: calendarLoading, completeEvent } = useCalendar(user?.id);
  
  const [allTime, setAllTime] = useState(0);
  const [allTimeBySubject, setAllTimeBySubject] = useState<{ [key: string]: number }>({});
  const [userSubjects, setUserSubjects] = useState<VCESubject[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);

  const prediction = getPrediction();

  useEffect(() => {
    if (user) {
      loadSubjects();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadAllTime();
    }
  }, [user]);

  async function loadSubjects() {
    if (!user) return;
    setIsLoadingSubjects(true);
    const subjects = await getUserSubjects(user.id);
    setUserSubjects(subjects);
    setIsLoadingSubjects(false);
  }

  async function loadAllTime() {
    if (!user) return;
    
    // Get ALL study time (no date filtering)
    const timeBySubject = await getAllStudyTime();
    const total = Object.values(timeBySubject).reduce((sum, time) => sum + time, 0);
    setAllTime(total);
    setAllTimeBySubject(timeBySubject);
  }

  async function getAllStudyTime(): Promise<{ [subjectId: string]: number }> {
    if (!user) return {};
    
    // Import the service function directly
    const { getStudyTimeBySubject } = await import('@/services/studyService');
    
    // Get all time - pass undefined for both dates to skip filtering
    return await getStudyTimeBySubject(user.id, undefined, undefined);
  }

  function handleStartTimer(subjectId: string) {
    startTimer(subjectId);
  }

  async function handleStopTimer() {
    await stopTimer();
    loadAllTime();
  }

  async function handleCompleteEvent(eventId: string) {
    const result = await completeEvent(eventId);
    if (result.error) {
      Alert.alert('Error', result.error);
    }
  }

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centeredContainer}>
          <Text style={styles.emptyText}>Please log in to continue</Text>
          <Pressable
            style={styles.loginButton}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>G'day, {user.name}!</Text>
            <Text style={styles.subtitle}>Year {user.yearLevel} VCE Student</Text>
          </View>
          <Pressable
            onPress={() => router.push('/settings')}
            style={styles.settingsButton}
          >
            <MaterialIcons name="settings" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* ATAR Prediction Card */}
        <View style={styles.atarCard}>
          <ATARDisplay atar={prediction.atar} size="large" />
          <View style={styles.atarStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{prediction.aggregate.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Aggregate</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{subjectScores.length}/{userSubjects.length}</Text>
              <Text style={styles.statLabel}>Subjects Tracked</Text>
            </View>
          </View>
          <Pressable
            style={styles.atarButton}
            onPress={() => router.push('/(tabs)/atar')}
          >
            <Text style={styles.atarButtonText}>View Full Prediction</Text>
            <MaterialIcons name="arrow-forward" size={20} color={colors.primary} />
          </Pressable>
        </View>

        {/* Upcoming Assessments */}
        {upcomingEvents.length > 0 && (
          <View style={styles.assessmentsSection}>
            <View style={styles.sectionHeaderInline}>
              <MaterialIcons name="event" size={20} color={colors.primary} />
              <Text style={styles.sectionTitleInline}>Upcoming Assessments</Text>
            </View>
            {upcomingEvents.slice(0, 4).map((event, index) => (
              <UpcomingAssessmentCard
                key={event.id}
                event={event}
                index={index + 1}
                onComplete={handleCompleteEvent}
              />
            ))}
            {upcomingEvents.length > 4 && (
              <Pressable
                style={styles.viewAllButton}
                onPress={() => router.push('/(tabs)/calendar')}
              >
                <Text style={styles.viewAllText}>View All ({upcomingEvents.length})</Text>
                <MaterialIcons name="arrow-forward" size={16} color={colors.primary} />
              </Pressable>
            )}
          </View>
        )}

        {/* All Study Time */}
        <View style={styles.todayCard}>
          <View style={styles.todayHeader}>
            <MaterialIcons name="access-time" size={24} color={colors.primary} />
            <Text style={styles.todayTitle}>Total Study Time (All Time)</Text>
          </View>
          <Text style={styles.todayTime}>
            {Math.floor(allTime / 60)}h {allTime % 60}m
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Start Timer</Text>
            <Pressable
              style={styles.manageButton}
              onPress={() => router.push('/subjects')}
            >
              <MaterialIcons name="edit" size={16} color={colors.primary} />
              <Text style={styles.manageButtonText}>Manage</Text>
            </Pressable>
          </View>
          {isLoadingSubjects ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Loading subjects...</Text>
            </View>
          ) : userSubjects.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="subject" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyText}>No subjects selected</Text>
              <Text style={styles.emptySubtext}>Add subjects to start tracking your study time</Text>
            </View>
          ) : (
            userSubjects.map(subject => {
              const subjectMins = allTimeBySubject[subject.id] || 0;
              return (
                <StudyTimerCard
                  key={subject.id}
                  subjectId={subject.id}
                  subjectCode={subject.code}
                  subjectName={subject.name}
                  elapsedSeconds={activeSubject === subject.id ? elapsedSeconds : 0}
                  isActive={activeSubject === subject.id}
                  totalMinutes={subjectMins}
                  onStart={() => handleStartTimer(subject.id)}
                  onStop={handleStopTimer}
                />
              );
            })
          )}
        </View>

        {/* Action Cards */}
        <View style={styles.actionGrid}>
          <Pressable
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/study')}
          >
            <MaterialIcons name="timer" size={32} color={colors.primary} />
            <Text style={styles.actionTitle}>Study Tracker</Text>
            <Text style={styles.actionDesc}>View all timers</Text>
          </Pressable>

          <Pressable
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/notes')}
          >
            <MaterialIcons name="note" size={32} color={colors.success} />
            <Text style={styles.actionTitle}>Notes</Text>
            <Text style={styles.actionDesc}>View progress</Text>
          </Pressable>

          <Pressable
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/pathway')}
          >
            <MaterialIcons name="school" size={32} color={colors.warning} />
            <Text style={styles.actionTitle}>Uni Pathway</Text>
            <Text style={styles.actionDesc}>Plan your future</Text>
          </Pressable>

          {!user.isPremium && (
            <Pressable
              style={[styles.actionCard, styles.premiumCard]}
              onPress={() => router.push('/premium')}
            >
              <MaterialIcons name="star" size={32} color={colors.premium} />
              <Text style={[styles.actionTitle, { color: colors.premium }]}>Go Premium</Text>
              <Text style={styles.actionDesc}>Unlock all features</Text>
            </Pressable>
          )}
        </View>
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
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: typography.h1,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  settingsButton: {
    padding: spacing.sm,
  },
  atarCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  atarStats: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  atarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  atarButtonText: {
    fontSize: typography.bodySmall,
    color: colors.primary,
    fontWeight: typography.semibold,
  },
  todayCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  todayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  todayTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  todayTime: {
    fontSize: typography.h1,
    fontWeight: typography.bold,
    color: colors.primary,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  manageButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: typography.bodySmall,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
  },

  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  premiumCard: {
    borderColor: colors.premium,
    backgroundColor: colors.surface,
  },
  actionTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  actionDesc: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  loginButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  loginButtonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  assessmentsSection: {
    marginBottom: spacing.md,
  },
  sectionHeaderInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitleInline: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  viewAllText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.primary,
  },
});

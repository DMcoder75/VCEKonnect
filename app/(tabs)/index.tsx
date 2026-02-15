
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { CalendarEvent } from '@/services/calendarService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { useATAR } from '@/hooks/useATAR';
import { useStudyTimer } from '@/hooks/useStudyTimer';
import { useStudyGoals } from '@/hooks/useStudyGoals';
import { useAchievements } from '@/hooks/useAchievements';
import { checkNeedsWeeklyReset, copyPreviousWeekGoals } from '@/services/achievementsService';
import { ActiveGoalsResponse } from '@/services/studyGoalsService';
import { ATARDisplay, LoadingSpinner } from '@/components/ui';
import { StudyTimerCard, UpcomingAssessmentCard, StudyGoalRing, CelebrationOverlay, LatestAchievementBanner, AchievementLaunchManager } from '@/components/feature';
import { useCalendar } from '@/hooks/useCalendar';
import { getAllVCESubjects, VCESubject } from '@/services/vceSubjectsService';
import { getUserSubjects } from '@/services/userSubjectsService';

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { getPrediction, subjectScores, reloadScores } = useATAR();
  const { activeSubject, elapsedSeconds, startTimer, stopTimer, isRunning, getTodayStudyTime } = useStudyTimer();
  const { upcomingEvents, loading: calendarLoading, completeEvent } = useCalendar(user?.id);
  const { activeGoals, loadActiveGoals } = useStudyGoals();
  const { streaks, achievements, loadAchievements } = useAchievements();
  
  const [allTime, setAllTime] = useState(0);
  const [allTimeBySubject, setAllTimeBySubject] = useState<{ [key: string]: number }>({});
  const [userSubjects, setUserSubjects] = useState<VCESubject[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showWeeklyResetPrompt, setShowWeeklyResetPrompt] = useState(false);
  const [resetInfo, setResetInfo] = useState<{ currentWeekStart: Date } | null>(null);
  
  const previousGoalsRef = React.useRef<ActiveGoalsResponse | null>(null);

  const prediction = getPrediction();

  // Memoize load functions to ensure stable references
  const loadSubjectsMemoized = useCallback(loadSubjects, [user]);
  const loadAllTimeMemoized = useCallback(loadAllTime, [user]);

  // Check for weekly reset on mount
  useEffect(() => {
    if (user) {
      checkWeeklyReset();
    }
  }, [user]);

  async function checkWeeklyReset() {
    if (!user) return;
    
    const result = await checkNeedsWeeklyReset(user.id);
    if (result.needsReset) {
      setResetInfo({ currentWeekStart: result.currentWeekStart });
      setShowWeeklyResetPrompt(true);
    }
  }

  async function handleCopyPreviousGoals() {
    if (!user || !resetInfo) return;
    
    const result = await copyPreviousWeekGoals(user.id, resetInfo.currentWeekStart);
    if (result.success) {
      setShowWeeklyResetPrompt(false);
      await loadActiveGoals();
      showAlert('Goals Copied!', `${result.copiedCount} subject goals copied to ${result.periodName}`);
    } else {
      showAlert('Info', result.message);
    }
  }

  function handleSkipWeeklyReset() {
    setShowWeeklyResetPrompt(false);
  }

  // Refresh data when dashboard comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadSubjectsMemoized();
        loadAllTimeMemoized();
        reloadScores(); // Reload ATAR scores when returning to dashboard
        loadActiveGoals(); // Reload study goals when returning to dashboard
        loadAchievements(); // Reload achievements and streaks
      }
    }, [user, loadSubjectsMemoized, loadAllTimeMemoized, reloadScores, loadActiveGoals, loadAchievements])
  );

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

  // Calculate live progress including current timer session
  function calculateLiveProgress(
    period: { achievedHours: number; targetHours: number; subjects?: any[] } | undefined,
    currentSubject: string | null
  ): number {
    if (!period || !isRunning || !currentSubject) {
      return period?.achievedHours ? (period.achievedHours / period.targetHours) * 100 : 0;
    }
    
    // Add current elapsed time to achieved hours
    const currentSessionHours = elapsedSeconds / 3600;
    const liveAchieved = period.achievedHours + currentSessionHours;
    return (liveAchieved / period.targetHours) * 100;
  }

  async function handleStopTimer() {
    await stopTimer();
    loadAllTime();
    
    // Save previous goals state before reload
    const prevGoals = activeGoals;
    
    await loadActiveGoals(); // Refresh goal progress after timer stops
    
    // Check if any goal just completed
    if (prevGoals && activeGoals) {
      const weeklyCompleted = 
        activeGoals.weekly?.progressPercent >= 100 && 
        prevGoals.weekly?.progressPercent < 100;
      const monthlyCompleted = 
        activeGoals.monthly?.progressPercent >= 100 && 
        prevGoals.monthly?.progressPercent < 100;
      const termCompleted = 
        activeGoals.term?.progressPercent >= 100 && 
        prevGoals.term?.progressPercent < 100;
      
      if (weeklyCompleted || monthlyCompleted || termCompleted) {
        setShowCelebration(true);
      }
    }
  }

  async function handleCompleteEvent(eventId: string) {
    const result = await completeEvent(eventId);
    if (result.error) {
      showAlert('Error', result.error);
    }
  }

  function handleEventPress(event: CalendarEvent) {
    router.push({
      pathname: '/edit-event',
      params: { eventId: event.id },
    });
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

  // Get latest achievement (most recent)
  const latestAchievement = achievements.length > 0 ? achievements[0] : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <CelebrationOverlay
        show={showCelebration}
        onComplete={() => setShowCelebration(false)}
      />
      <AchievementLaunchManager achievements={achievements} />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
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

        {/* Total Study Time */}
        <View style={styles.todayCard}>
          <View style={styles.todayHeader}>
            <MaterialIcons name="access-time" size={24} color={colors.primary} />
            <Text style={styles.todayTitle}>Total Study Time (All Time)</Text>
          </View>
          <Text style={styles.todayTime}>
            {Math.floor(allTime / 60)}h {allTime % 60}m
          </Text>
        </View>

        {/* Weekly Reset Prompt */}
        {showWeeklyResetPrompt && (
          <View style={styles.resetPrompt}>
            <View style={styles.resetHeader}>
              <MaterialIcons name="refresh" size={24} color={colors.primary} />
              <Text style={styles.resetTitle}>New Week Started!</Text>
            </View>
            <Text style={styles.resetMessage}>
              Would you like to copy your previous week's goals to this week?
            </Text>
            <View style={styles.resetButtons}>
              <Pressable
                style={[styles.resetButton, styles.resetButtonOutline]}
                onPress={handleSkipWeeklyReset}
              >
                <Text style={styles.resetButtonTextOutline}>Skip</Text>
              </Pressable>
              <Pressable
                style={[styles.resetButton, styles.resetButtonPrimary]}
                onPress={handleCopyPreviousGoals}
              >
                <Text style={styles.resetButtonTextPrimary}>Copy Goals</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Streaks Card */}
        {streaks.length > 0 && streaks.some(s => s.currentStreak > 0) && (
          <Pressable
            style={styles.streaksCard}
            onPress={() => router.push('/achievements')}
          >
            <View style={styles.streaksHeader}>
              <MaterialIcons name="local-fire-department" size={20} color={colors.warning} />
              <Text style={styles.streaksTitle}>Current Streaks</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </View>
            <View style={styles.streaksContent}>
              {streaks.find(s => s.streakType === 'weekly' && s.currentStreak > 0) && (
                <View style={styles.streakBadge}>
                  <Text style={styles.streakNumber}>{streaks.find(s => s.streakType === 'weekly')?.currentStreak}</Text>
                  <Text style={styles.streakLabel}>Week Streak</Text>
                </View>
              )}
              {streaks.find(s => s.streakType === 'monthly' && s.currentStreak > 0) && (
                <View style={styles.streakBadge}>
                  <Text style={styles.streakNumber}>{streaks.find(s => s.streakType === 'monthly')?.currentStreak}</Text>
                  <Text style={styles.streakLabel}>Month Streak</Text>
                </View>
              )}
            </View>
          </Pressable>
        )}

        {/* Latest Achievement */}
        {latestAchievement && (
          <LatestAchievementBanner
            achievement={latestAchievement}
            onPress={() => router.push('/achievements')}
          />
        )}

        {/* Multi-Period Goals */}
        {activeGoals && (activeGoals.weekly || activeGoals.monthly || activeGoals.term) && (
          <View style={styles.goalsCard}>
            <View style={styles.goalsHeader}>
              <View style={styles.goalsHeaderLeft}>
                <MaterialIcons name="flag" size={20} color={colors.primary} />
                <Text style={styles.goalsTitle}>Goal Progress Summary</Text>
                {isRunning && (
                  <View style={styles.liveIndicator}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                )}
              </View>
              <View style={styles.goalsHeaderButtons}>
                <Pressable
                  style={styles.smallButton}
                  onPress={() => router.push('/goals')}
                >
                  <MaterialIcons name="edit" size={16} color={colors.primary} />
                </Pressable>
                <Pressable
                  style={styles.smallButton}
                  onPress={() => router.push('/goals-progress')}
                >
                  <MaterialIcons name="visibility" size={16} color={colors.primary} />
                </Pressable>
                <Pressable
                  style={styles.smallButton}
                  onPress={() => router.push('/achievements')}
                >
                  <MaterialIcons name="emoji-events" size={16} color={colors.premium} />
                </Pressable>
              </View>
            </View>
            <View style={styles.goalsRings}>
              {activeGoals.weekly && (
                <StudyGoalRing
                  label="Week"
                  targetHours={activeGoals.weekly.targetHours}
                  achievedHours={activeGoals.weekly.achievedHours}
                  progressPercent={activeGoals.weekly.progressPercent}
                  size="large"
                  icon="calendar-today"
                  isActive={isRunning}
                  liveProgress={calculateLiveProgress(activeGoals.weekly, activeSubject)}
                />
              )}
              {activeGoals.monthly && (
                <StudyGoalRing
                  label="Month"
                  targetHours={activeGoals.monthly.targetHours}
                  achievedHours={activeGoals.monthly.achievedHours}
                  progressPercent={activeGoals.monthly.progressPercent}
                  size="medium"
                  icon="event-note"
                  isActive={isRunning}
                  liveProgress={calculateLiveProgress(activeGoals.monthly, activeSubject)}
                />
              )}
              {activeGoals.term && (
                <StudyGoalRing
                  label="Term"
                  targetHours={activeGoals.term.targetHours}
                  achievedHours={activeGoals.term.achievedHours}
                  progressPercent={activeGoals.term.progressPercent}
                  size="medium"
                  icon="school"
                  isActive={isRunning}
                  liveProgress={calculateLiveProgress(activeGoals.term, activeSubject)}
                />
              )}
            </View>
          </View>
        )}

        {/* 2. Upcoming Assessments */}
        {upcomingEvents.filter(e => !e.is_completed).length > 0 && (
          <View style={styles.assessmentsSection}>
            <View style={styles.sectionHeaderInline}>
              <MaterialIcons name="event" size={20} color={colors.primary} />
              <Text style={styles.sectionTitleInline}>Upcoming Assessments</Text>
            </View>
            {upcomingEvents.filter(e => !e.is_completed).slice(0, 4).map((event, index) => (
              <UpcomingAssessmentCard
                key={event.id}
                event={event}
                index={index + 1}
                onComplete={handleCompleteEvent}
                onPress={handleEventPress}
              />
            ))}
            {upcomingEvents.filter(e => !e.is_completed).length > 4 && (
              <Pressable
                style={styles.viewAllButton}
                onPress={() => router.push('/(tabs)/calendar')}
              >
                <Text style={styles.viewAllText}>View All ({upcomingEvents.filter(e => !e.is_completed).length})</Text>
                <MaterialIcons name="arrow-forward" size={16} color={colors.primary} />
              </Pressable>
            )}
          </View>
        )}

        {/* 3. ATAR Prediction Card */}
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

        {/* 4. Quick Start Timer */}
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
            <LoadingSpinner message="Loading subjects..." size="small" />
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

        {/* Study Goals Card - Always visible */}
        {!activeGoals?.weekly && !activeGoals?.monthly && !activeGoals?.term && (
          <Pressable
            style={styles.setGoalsCard}
            onPress={() => router.push('/goals')}
          >
            <MaterialIcons name="flag" size={32} color={colors.warning} />
            <Text style={styles.setGoalsTitle}>Set Study Goals</Text>
            <Text style={styles.setGoalsDesc}>Set weekly, monthly & term targets</Text>
          </Pressable>
        )}

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
  resetPrompt: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  resetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  resetTitle: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  resetMessage: {
    fontSize: typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  resetButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  resetButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  resetButtonOutline: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  resetButtonPrimary: {
    backgroundColor: colors.primary,
  },
  resetButtonTextOutline: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  resetButtonTextPrimary: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.background,
  },
  header: {
    position: 'relative',
    marginBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: 60,
  },
  greeting: {
    fontSize: typography.h1,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  settingsButton: {
    position: 'absolute',
    right: 0,
    top: spacing.sm,
    padding: spacing.sm,
    zIndex: 5,
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
    fontSize: 48,
    fontWeight: typography.bold,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  streaksCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  streaksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  streaksTitle: {
    flex: 1,
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  streaksContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.md,
  },
  streakBadge: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flex: 1,
  },
  streakNumber: {
    fontSize: 32,
    fontWeight: typography.bold,
    color: colors.warning,
  },
  streakLabel: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
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
  goalsCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  goalsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  goalsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  goalsHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  smallButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  goalsTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  goalsRings: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: spacing.md,
  },
  setGoalsCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.warning,
    borderStyle: 'dashed',
  },
  setGoalsTitle: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  setGoalsDesc: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: spacing.sm,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textPrimary,
  },
  liveText: {
    fontSize: 10,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
});

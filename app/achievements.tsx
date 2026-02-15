import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useAchievements } from '@/hooks/useAchievements';
import { useStudyGoals } from '@/hooks/useStudyGoals';
import { LoadingSpinner } from '@/components/ui';
import { GoalPeriod, GoalSubject } from '@/services/studyGoalsService';
import { getUserSubjects } from '@/services/userSubjectsService';
import { VCESubject } from '@/services/vceSubjectsService';

export default function AchievementsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { achievements, streaks, isLoading: achievementsLoading } = useAchievements();
  const { activeGoals, loadHistory, isLoading: goalsLoading } = useStudyGoals();
  
  const [weeklyHistory, setWeeklyHistory] = useState<GoalPeriod[]>([]);
  const [monthlyHistory, setMonthlyHistory] = useState<GoalPeriod[]>([]);
  const [termHistory, setTermHistory] = useState<GoalPeriod[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [userSubjects, setUserSubjects] = useState<VCESubject[]>([]);

  useEffect(() => {
    if (user) {
      loadAllHistory();
      loadSubjects();
    }
  }, [user]);

  async function loadAllHistory() {
    if (!user) return;
    
    setIsLoadingHistory(true);
    const [weekly, monthly, term] = await Promise.all([
      loadHistory('weekly', 10),
      loadHistory('monthly', 6),
      loadHistory('term', 4),
    ]);
    
    setWeeklyHistory(weekly);
    setMonthlyHistory(monthly);
    setTermHistory(term);
    setIsLoadingHistory(false);
  }

  async function loadSubjects() {
    if (!user) return;
    const subjects = await getUserSubjects(user.id);
    setUserSubjects(subjects);
  }

  function getSubjectName(subjectId: string): string {
    const subject = userSubjects.find(s => s.id === subjectId);
    return subject?.code || subjectId;
  }

  function formatPeriodDate(period: GoalPeriod): string {
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);
    
    if (period.periodType === 'weekly') {
      return `${start.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}`;
    } else if (period.periodType === 'monthly') {
      return start.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
    } else {
      return `Term ${Math.ceil((start.getMonth() + 1) / 3)} ${start.getFullYear()}`;
    }
  }

  function getCompletionIcon(progressPercent: number) {
    if (progressPercent >= 100) return { name: 'check-circle', color: colors.success };
    if (progressPercent >= 75) return { name: 'sentiment-satisfied', color: colors.primary };
    if (progressPercent >= 50) return { name: 'sentiment-neutral', color: colors.warning };
    return { name: 'sentiment-dissatisfied', color: colors.error };
  }

  function getAchievementIcon(type: string): string {
    if (type.includes('streak_50')) return 'emoji-events';
    if (type.includes('streak_20')) return 'military-tech';
    if (type.includes('streak_10')) return 'star';
    if (type.includes('streak_5')) return 'local-fire-department';
    if (type.includes('first_')) return 'flag';
    return 'emoji-events';
  }

  function getAchievementColor(type: string): string {
    if (type.includes('streak_50')) return colors.premium;
    if (type.includes('streak_20')) return '#FFD700'; // Gold
    if (type.includes('streak_10')) return '#FF8C00'; // Dark orange
    if (type.includes('streak_5')) return colors.warning;
    return colors.primary;
  }

  // Helper to render subject breakdown
  function renderSubjectBreakdown(subjects: GoalSubject[] | undefined, showEmptyState = false) {
    if (!subjects || subjects.length === 0) {
      if (showEmptyState) {
        return (
          <Text style={styles.noSubjectsText}>No subjects set for this goal</Text>
        );
      }
      return null;
    }

    return (
      <View style={styles.subjectBreakdown}>
        {subjects.map(subject => {
          const subjectProgress = subject.hoursTarget > 0
            ? ((subject.minutesAchieved / 60) / subject.hoursTarget) * 100
            : 0;
          const isCompleted = subjectProgress >= 100;
          
          return (
            <View key={subject.subjectId} style={styles.subjectRow}>
              <View style={styles.subjectInfo}>
                <View style={styles.subjectNameRow}>
                  <Text style={styles.subjectName}>
                    {getSubjectName(subject.subjectId)}
                  </Text>
                  {isCompleted && (
                    <MaterialIcons 
                      name="verified" 
                      size={16} 
                      color={colors.success} 
                    />
                  )}
                </View>
                <View style={styles.subjectProgressBar}>
                  <View 
                    style={[
                      styles.subjectProgressFill,
                      { 
                        width: `${Math.min(subjectProgress, 100)}%`,
                        backgroundColor: isCompleted ? colors.success : colors.primary,
                      }
                    ]} 
                  />
                </View>
              </View>
              <Text style={[
                styles.subjectProgressText,
                isCompleted && { color: colors.success, fontWeight: '700' }
              ]}>
                {Math.round(subjectProgress)}%
              </Text>
            </View>
          );
        })}
      </View>
    );
  }

  const weeklyStreak = streaks.find(s => s.streakType === 'weekly');
  const monthlyStreak = streaks.find(s => s.streakType === 'monthly');

  const isLoading = achievementsLoading || isLoadingHistory || goalsLoading;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Achievements & History</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <LoadingSpinner message="Loading achievements..." />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Current Active Goals */}
          {activeGoals?.weekly && (
            <View style={styles.activeGoalsSection}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="trending-up" size={24} color={colors.primary} />
                <Text style={styles.sectionTitle}>Current Week Progress</Text>
              </View>
              
              <View style={styles.activeGoalCard}>
                <View style={styles.activeGoalHeader}>
                  <Text style={styles.activeGoalName}>{activeGoals.weekly.periodName}</Text>
                  <View style={styles.activeGoalProgress}>
                    <Text style={styles.activeGoalPercent}>
                      {Math.round(activeGoals.weekly.progressPercent)}%
                    </Text>
                  </View>
                </View>
                <Text style={styles.activeGoalStats}>
                  {activeGoals.weekly.achievedHours.toFixed(1)}/{activeGoals.weekly.targetHours}h completed
                </Text>
                {renderSubjectBreakdown(activeGoals.weekly.subjects, true)}
              </View>
            </View>
          )}

          {activeGoals?.monthly && (
            <View style={styles.activeGoalsSection}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="calendar-month" size={24} color={colors.success} />
                <Text style={styles.sectionTitle}>Current Month Progress</Text>
              </View>
              
              <View style={styles.activeGoalCard}>
                <View style={styles.activeGoalHeader}>
                  <Text style={styles.activeGoalName}>{activeGoals.monthly.periodName}</Text>
                  <View style={styles.activeGoalProgress}>
                    <Text style={styles.activeGoalPercent}>
                      {Math.round(activeGoals.monthly.progressPercent)}%
                    </Text>
                  </View>
                </View>
                <Text style={styles.activeGoalStats}>
                  {activeGoals.monthly.achievedHours.toFixed(1)}/{activeGoals.monthly.targetHours}h completed
                </Text>
                {renderSubjectBreakdown(activeGoals.monthly.subjects, true)}
              </View>
            </View>
          )}

          {activeGoals?.term && (
            <View style={styles.activeGoalsSection}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="school" size={24} color={colors.warning} />
                <Text style={styles.sectionTitle}>Current Term Progress</Text>
              </View>
              
              <View style={styles.activeGoalCard}>
                <View style={styles.activeGoalHeader}>
                  <Text style={styles.activeGoalName}>{activeGoals.term.periodName}</Text>
                  <View style={styles.activeGoalProgress}>
                    <Text style={styles.activeGoalPercent}>
                      {Math.round(activeGoals.term.progressPercent)}%
                    </Text>
                  </View>
                </View>
                <Text style={styles.activeGoalStats}>
                  {activeGoals.term.achievedHours.toFixed(1)}/{activeGoals.term.targetHours}h completed
                </Text>
                {renderSubjectBreakdown(activeGoals.term.subjects, true)}
              </View>
            </View>
          )}

          {/* Streaks Card */}
          <View style={styles.streaksCard}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="local-fire-department" size={24} color={colors.warning} />
              <Text style={styles.sectionTitle}>Current Streaks</Text>
            </View>
            
            <View style={styles.streakRow}>
              <View style={styles.streakItem}>
                <MaterialIcons name="calendar-today" size={32} color={colors.primary} />
                <Text style={styles.streakNumber}>{weeklyStreak?.currentStreak || 0}</Text>
                <Text style={styles.streakLabel}>Weekly Streak</Text>
                {weeklyStreak && weeklyStreak.longestStreak > 0 && (
                  <Text style={styles.streakBest}>Best: {weeklyStreak.longestStreak}</Text>
                )}
              </View>
              
              <View style={styles.streakDivider} />
              
              <View style={styles.streakItem}>
                <MaterialIcons name="event-note" size={32} color={colors.success} />
                <Text style={styles.streakNumber}>{monthlyStreak?.currentStreak || 0}</Text>
                <Text style={styles.streakLabel}>Monthly Streak</Text>
                {monthlyStreak && monthlyStreak.longestStreak > 0 && (
                  <Text style={styles.streakBest}>Best: {monthlyStreak.longestStreak}</Text>
                )}
              </View>
            </View>
          </View>

          {/* Achievements */}
          {achievements.length > 0 && (
            <View style={styles.achievementsSection}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="emoji-events" size={24} color={colors.premium} />
                <Text style={styles.sectionTitle}>Earned Badges</Text>
              </View>
              
              <View style={styles.achievementsGrid}>
                {achievements.map(achievement => (
                  <View key={achievement.id} style={styles.achievementCard}>
                    <MaterialIcons
                      name={achievement.iconName as any}
                      size={40}
                      color={getAchievementColor(achievement.achievementType)}
                    />
                    <Text style={styles.achievementName}>{achievement.achievementName}</Text>
                    <Text style={styles.achievementDesc}>{achievement.achievementDescription}</Text>
                    <Text style={styles.achievementDate}>
                      {new Date(achievement.earnedAt).toLocaleDateString('en-AU', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Weekly History */}
          {weeklyHistory.length > 0 && (
            <View style={styles.historySection}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="history" size={24} color={colors.primary} />
                <Text style={styles.sectionTitle}>Weekly History</Text>
              </View>
              
              {weeklyHistory.map(period => {
                const progressPercent = period.totalHoursTarget > 0
                  ? ((period.totalMinutesAchieved / 60) / period.totalHoursTarget) * 100
                  : 0;
                const icon = getCompletionIcon(progressPercent);
                
                return (
                  <View key={period.id} style={styles.historyCard}>
                    <View style={styles.historyHeader}>
                      <View style={styles.historyInfo}>
                        <Text style={styles.historyDate}>{formatPeriodDate(period)}</Text>
                        <Text style={styles.historyProgress}>
                          {(period.totalMinutesAchieved / 60).toFixed(1)}/{period.totalHoursTarget}h
                        </Text>
                      </View>
                      <View style={styles.historyCompletion}>
                        <MaterialIcons name={icon.name as any} size={32} color={icon.color} />
                        <Text style={[styles.historyPercent, { color: icon.color }]}>
                          {Math.round(progressPercent)}%
                        </Text>
                      </View>
                    </View>
                    
                    {/* Per-Subject Breakdown */}
                    {renderSubjectBreakdown(period.subjects)}
                  </View>
                );
              })}
            </View>
          )}

          {/* Monthly History */}
          {monthlyHistory.length > 0 && (
            <View style={styles.historySection}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="calendar-month" size={24} color={colors.success} />
                <Text style={styles.sectionTitle}>Monthly History</Text>
              </View>
              
              {monthlyHistory.map(period => {
                const progressPercent = period.totalHoursTarget > 0
                  ? ((period.totalMinutesAchieved / 60) / period.totalHoursTarget) * 100
                  : 0;
                const icon = getCompletionIcon(progressPercent);
                
                return (
                  <View key={period.id} style={styles.historyCard}>
                    <View style={styles.historyHeader}>
                      <View style={styles.historyInfo}>
                        <Text style={styles.historyDate}>{formatPeriodDate(period)}</Text>
                        <Text style={styles.historyProgress}>
                          {(period.totalMinutesAchieved / 60).toFixed(1)}/{period.totalHoursTarget}h
                        </Text>
                      </View>
                      <View style={styles.historyCompletion}>
                        <MaterialIcons name={icon.name as any} size={32} color={icon.color} />
                        <Text style={[styles.historyPercent, { color: icon.color }]}>
                          {Math.round(progressPercent)}%
                        </Text>
                      </View>
                    </View>
                    
                    {/* Per-Subject Breakdown */}
                    {renderSubjectBreakdown(period.subjects)}
                  </View>
                );
              })}
            </View>
          )}

          {/* Term History */}
          {termHistory.length > 0 && (
            <View style={styles.historySection}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="school" size={24} color={colors.warning} />
                <Text style={styles.sectionTitle}>Term History</Text>
              </View>
              
              {termHistory.map(period => {
                const progressPercent = period.totalHoursTarget > 0
                  ? ((period.totalMinutesAchieved / 60) / period.totalHoursTarget) * 100
                  : 0;
                const icon = getCompletionIcon(progressPercent);
                
                return (
                  <View key={period.id} style={styles.historyCard}>
                    <View style={styles.historyHeader}>
                      <View style={styles.historyInfo}>
                        <Text style={styles.historyDate}>{formatPeriodDate(period)}</Text>
                        <Text style={styles.historyProgress}>
                          {(period.totalMinutesAchieved / 60).toFixed(1)}/{period.totalHoursTarget}h
                        </Text>
                      </View>
                      <View style={styles.historyCompletion}>
                        <MaterialIcons name={icon.name as any} size={32} color={icon.color} />
                        <Text style={[styles.historyPercent, { color: icon.color }]}>
                          {Math.round(progressPercent)}%
                        </Text>
                      </View>
                    </View>
                    
                    {/* Per-Subject Breakdown */}
                    {renderSubjectBreakdown(period.subjects)}
                  </View>
                );
              })}
            </View>
          )}

          {/* Empty State */}
          {!activeGoals?.weekly && !activeGoals?.monthly && !activeGoals?.term && 
           weeklyHistory.length === 0 && monthlyHistory.length === 0 && termHistory.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name="history" size={64} color={colors.textTertiary} />
              <Text style={styles.emptyText}>No goals yet</Text>
              <Text style={styles.emptyDesc}>Create your first goal to start tracking!</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  activeGoalsSection: {
    marginBottom: spacing.md,
  },
  activeGoalCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  activeGoalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  activeGoalName: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    flex: 1,
  },
  activeGoalProgress: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  activeGoalPercent: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  activeGoalStats: {
    fontSize: typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  noSubjectsText: {
    fontSize: typography.bodySmall,
    color: colors.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  streaksCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  streakItem: {
    alignItems: 'center',
    flex: 1,
  },
  streakNumber: {
    fontSize: 40,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  streakLabel: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  streakBest: {
    fontSize: typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  streakDivider: {
    width: 1,
    height: 80,
    backgroundColor: colors.border,
  },
  achievementsSection: {
    marginBottom: spacing.md,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  achievementCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    minWidth: '30%',
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  achievementName: {
    fontSize: typography.bodySmall,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  achievementDesc: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  achievementDate: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  historySection: {
    marginBottom: spacing.md,
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyInfo: {
    flex: 1,
  },
  historyDate: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  historyProgress: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  historyCompletion: {
    alignItems: 'center',
  },
  historyPercent: {
    fontSize: typography.bodySmall,
    fontWeight: typography.bold,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  emptyText: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyDesc: {
    fontSize: typography.body,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  subjectBreakdown: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  subjectInfo: {
    flex: 1,
  },
  subjectNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  subjectName: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  subjectProgressBar: {
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  subjectProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  subjectProgressText: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: typography.semibold,
    minWidth: 42,
    textAlign: 'right',
  },
});

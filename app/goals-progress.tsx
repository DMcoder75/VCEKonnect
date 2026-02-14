import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useStudyGoals } from '@/hooks/useStudyGoals';
import { getUserSubjects } from '@/services/userSubjectsService';
import { VCESubject } from '@/services/vceSubjectsService';
import { StudyGoalRing } from '@/components/feature';
import { LoadingSpinner } from '@/components/ui';

export default function GoalsProgressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { activeGoals, isLoading: goalsLoading } = useStudyGoals();
  
  const [userSubjects, setUserSubjects] = useState<VCESubject[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);

  useEffect(() => {
    if (user) {
      loadSubjects();
    }
  }, [user]);

  async function loadSubjects() {
    if (!user) return;
    setIsLoadingSubjects(true);
    const subjects = await getUserSubjects(user.id);
    setUserSubjects(subjects);
    setIsLoadingSubjects(false);
  }

  function getSubjectName(subjectId: string): string {
    const subject = userSubjects.find(s => s.id === subjectId);
    return subject?.code || subjectId;
  }

  function getMotivationalMessage(period: any): string {
    if (!period) return '';
    
    const progress = period.progressPercent;
    if (progress >= 100) return '🎉 Goal achieved! Outstanding effort!';
    if (progress >= 90) return '🔥 Almost there! Keep going!';
    if (progress >= 75) return '💪 Great progress! Stay consistent!';
    if (progress >= 50) return '⭐ Halfway there! You can do it!';
    if (progress >= 25) return '🚀 Good start! Keep building momentum!';
    return '📚 Time to get started! You got this!';
  }

  function getOverallMessage(): string {
    if (!activeGoals) return '';
    
    const weekly = activeGoals.weekly?.progressPercent || 0;
    const monthly = activeGoals.monthly?.progressPercent || 0;
    const term = activeGoals.term?.progressPercent || 0;
    
    const allComplete = weekly >= 100 && monthly >= 100 && term >= 100;
    const mostComplete = (weekly >= 75 && monthly >= 75) || (weekly >= 75 && term >= 75) || (monthly >= 75 && term >= 75);
    
    if (allComplete) return '👑 All goals achieved! You are crushing it!';
    if (mostComplete) return '🌟 Excellent progress across all timeframes!';
    
    return '💡 Track your study time to see progress update automatically!';
  }

  const isLoading = isLoadingSubjects || goalsLoading;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Goals Progress</Text>
        <Pressable onPress={() => router.push('/goals')} style={styles.editButton}>
          <MaterialIcons name="edit" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {isLoading ? (
        <LoadingSpinner message="Loading your progress..." />
      ) : !activeGoals?.weekly && !activeGoals?.monthly && !activeGoals?.term ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="flag" size={64} color={colors.textTertiary} />
          <Text style={styles.emptyText}>No active goals</Text>
          <Text style={styles.emptyDesc}>Set weekly, monthly & term goals to track progress</Text>
          <Pressable
            style={styles.setGoalsButton}
            onPress={() => router.push('/goals')}
          >
            <MaterialIcons name="add" size={20} color={colors.background} />
            <Text style={styles.setGoalsButtonText}>Set Goals</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Overall Message */}
          <View style={styles.messageCard}>
            <Text style={styles.messageText}>{getOverallMessage()}</Text>
          </View>

          {/* Overall Progress Rings */}
          <View style={styles.ringsCard}>
            <Text style={styles.sectionTitle}>Overall Progress</Text>
            <View style={styles.ringsContainer}>
              {activeGoals.weekly && (
                <StudyGoalRing
                  label="Weekly"
                  targetHours={activeGoals.weekly.targetHours}
                  achievedHours={activeGoals.weekly.achievedHours}
                  progressPercent={activeGoals.weekly.progressPercent}
                  size="large"
                  icon="calendar-today"
                />
              )}
              {activeGoals.monthly && (
                <StudyGoalRing
                  label="Monthly"
                  targetHours={activeGoals.monthly.targetHours}
                  achievedHours={activeGoals.monthly.achievedHours}
                  progressPercent={activeGoals.monthly.progressPercent}
                  size="large"
                  icon="event-note"
                />
              )}
              {activeGoals.term && (
                <StudyGoalRing
                  label="Term"
                  targetHours={activeGoals.term.targetHours}
                  achievedHours={activeGoals.term.achievedHours}
                  progressPercent={activeGoals.term.progressPercent}
                  size="large"
                  icon="school"
                />
              )}
            </View>
          </View>

          {/* Weekly Breakdown */}
          {activeGoals.weekly && (
            <View style={styles.periodCard}>
              <View style={styles.periodHeader}>
                <MaterialIcons name="calendar-today" size={24} color={colors.primary} />
                <View style={styles.periodInfo}>
                  <Text style={styles.periodTitle}>Weekly Goal</Text>
                  <Text style={styles.periodName}>{activeGoals.weekly.periodName}</Text>
                </View>
              </View>
              
              <View style={styles.motivationBanner}>
                <Text style={styles.motivationText}>
                  {getMotivationalMessage(activeGoals.weekly)}
                </Text>
              </View>

              <Text style={styles.subjectsTitle}>Subject Breakdown</Text>
              {activeGoals.weekly.subjects && activeGoals.weekly.subjects.length > 0 ? (
                activeGoals.weekly.subjects.map(subject => {
                  const isComplete = subject.progressPercent >= 100;
                  return (
                    <View key={subject.subjectId} style={styles.subjectRow}>
                      <View style={styles.subjectHeader}>
                        <Text style={styles.subjectName}>
                          {getSubjectName(subject.subjectId)}
                        </Text>
                        {isComplete && (
                          <MaterialIcons name="check-circle" size={20} color={colors.success} />
                        )}
                      </View>
                      
                      <View style={styles.progressBarContainer}>
                        <View style={styles.progressBarBackground}>
                          <View
                            style={[
                              styles.progressBarFill,
                              {
                                width: `${Math.min(100, subject.progressPercent)}%`,
                                backgroundColor: isComplete ? colors.success : colors.primary,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.progressText}>
                          {subject.achievedHours.toFixed(1)}/{subject.targetHours}h ({Math.round(subject.progressPercent)}%)
                        </Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.noSubjectsText}>No subjects tracked</Text>
              )}
            </View>
          )}

          {/* Monthly Breakdown */}
          {activeGoals.monthly && (
            <View style={styles.periodCard}>
              <View style={styles.periodHeader}>
                <MaterialIcons name="event-note" size={24} color={colors.success} />
                <View style={styles.periodInfo}>
                  <Text style={styles.periodTitle}>Monthly Goal</Text>
                  <Text style={styles.periodName}>{activeGoals.monthly.periodName}</Text>
                </View>
              </View>
              
              <View style={styles.motivationBanner}>
                <Text style={styles.motivationText}>
                  {getMotivationalMessage(activeGoals.monthly)}
                </Text>
              </View>

              <Text style={styles.subjectsTitle}>Subject Breakdown</Text>
              {activeGoals.monthly.subjects && activeGoals.monthly.subjects.length > 0 ? (
                activeGoals.monthly.subjects.map(subject => {
                  const isComplete = subject.progressPercent >= 100;
                  return (
                    <View key={subject.subjectId} style={styles.subjectRow}>
                      <View style={styles.subjectHeader}>
                        <Text style={styles.subjectName}>
                          {getSubjectName(subject.subjectId)}
                        </Text>
                        {isComplete && (
                          <MaterialIcons name="check-circle" size={20} color={colors.success} />
                        )}
                      </View>
                      
                      <View style={styles.progressBarContainer}>
                        <View style={styles.progressBarBackground}>
                          <View
                            style={[
                              styles.progressBarFill,
                              {
                                width: `${Math.min(100, subject.progressPercent)}%`,
                                backgroundColor: isComplete ? colors.success : colors.primary,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.progressText}>
                          {subject.achievedHours.toFixed(1)}/{subject.targetHours}h ({Math.round(subject.progressPercent)}%)
                        </Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.noSubjectsText}>No subjects tracked</Text>
              )}
            </View>
          )}

          {/* Term Breakdown */}
          {activeGoals.term && (
            <View style={styles.periodCard}>
              <View style={styles.periodHeader}>
                <MaterialIcons name="school" size={24} color={colors.warning} />
                <View style={styles.periodInfo}>
                  <Text style={styles.periodTitle}>Term Goal</Text>
                  <Text style={styles.periodName}>{activeGoals.term.periodName}</Text>
                </View>
              </View>
              
              <View style={styles.motivationBanner}>
                <Text style={styles.motivationText}>
                  {getMotivationalMessage(activeGoals.term)}
                </Text>
              </View>

              <Text style={styles.subjectsTitle}>Subject Breakdown</Text>
              {activeGoals.term.subjects && activeGoals.term.subjects.length > 0 ? (
                activeGoals.term.subjects.map(subject => {
                  const isComplete = subject.progressPercent >= 100;
                  return (
                    <View key={subject.subjectId} style={styles.subjectRow}>
                      <View style={styles.subjectHeader}>
                        <Text style={styles.subjectName}>
                          {getSubjectName(subject.subjectId)}
                        </Text>
                        {isComplete && (
                          <MaterialIcons name="check-circle" size={20} color={colors.success} />
                        )}
                      </View>
                      
                      <View style={styles.progressBarContainer}>
                        <View style={styles.progressBarBackground}>
                          <View
                            style={[
                              styles.progressBarFill,
                              {
                                width: `${Math.min(100, subject.progressPercent)}%`,
                                backgroundColor: isComplete ? colors.success : colors.primary,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.progressText}>
                          {subject.achievedHours.toFixed(1)}/{subject.targetHours}h ({Math.round(subject.progressPercent)}%)
                        </Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.noSubjectsText}>No subjects tracked</Text>
              )}
            </View>
          )}

          {/* Info Card */}
          <View style={styles.infoCard}>
            <MaterialIcons name="info-outline" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Progress auto-updates from your study timers. Start a timer to see your goals move forward!
            </Text>
          </View>
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
  editButton: {
    padding: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  messageCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  messageText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  ringsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  ringsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  periodCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  periodInfo: {
    flex: 1,
  },
  periodTitle: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  periodName: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  motivationBanner: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  motivationText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subjectsTitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  subjectRow: {
    marginBottom: spacing.md,
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  subjectName: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  progressBarContainer: {
    gap: spacing.xs,
  },
  progressBarBackground: {
    height: 12,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  progressText: {
    fontSize: typography.caption,
    color: colors.textSecondary,
  },
  noSubjectsText: {
    fontSize: typography.bodySmall,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
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
  setGoalsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  setGoalsButtonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.background,
  },
});

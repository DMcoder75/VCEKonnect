import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui';
import { getUserSubjects } from '@/services/userSubjectsService';
import { getStudySessions } from '@/services/studyService';
import { VCESubject } from '@/services/vceSubjectsService';

interface DayData {
  date: string;
  minutes: number;
  count: number;
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [userSubjects, setUserSubjects] = useState<VCESubject[]>([]);
  const [heatmapData, setHeatmapData] = useState<DayData[]>([]);
  const [subjectStats, setSubjectStats] = useState<{ [key: string]: { minutes: number; sessions: number } }>({});
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('month');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user, selectedPeriod]);

  async function loadAnalytics() {
    if (!user) return;
    
    setIsLoading(true);
    
    // Load subjects
    const subjects = await getUserSubjects(user.id);
    setUserSubjects(subjects);
    
    // Calculate date range
    const endDate = new Date();
    let startDate = new Date();
    
    switch (selectedPeriod) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case 'all':
        startDate = new Date(2020, 0, 1); // Far past
        break;
    }
    
    // Load sessions
    const sessions = await getStudySessions(user.id, startDate, endDate);
    
    // Build heatmap data
    const dayMap: { [date: string]: DayData } = {};
    const subjectMap: { [subjectId: string]: { minutes: number; sessions: number } } = {};
    
    sessions.forEach(session => {
      // Heatmap
      if (!dayMap[session.date]) {
        dayMap[session.date] = { date: session.date, minutes: 0, count: 0 };
      }
      dayMap[session.date].minutes += session.duration;
      dayMap[session.date].count += 1;
      
      // Subject stats
      if (!subjectMap[session.subjectId]) {
        subjectMap[session.subjectId] = { minutes: 0, sessions: 0 };
      }
      subjectMap[session.subjectId].minutes += session.duration;
      subjectMap[session.subjectId].sessions += 1;
    });
    
    setHeatmapData(Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date)));
    setSubjectStats(subjectMap);
    setIsLoading(false);
  }

  const totalMinutes = Object.values(subjectStats).reduce((sum, stat) => sum + stat.minutes, 0);
  const totalSessions = Object.values(subjectStats).reduce((sum, stat) => sum + stat.sessions, 0);
  const avgSessionLength = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;
  
  // Calculate best streak
  let currentStreak = 0;
  let bestStreak = 0;
  let lastDate: Date | null = null;
  
  heatmapData.forEach(day => {
    const dayDate = new Date(day.date);
    if (lastDate) {
      const diffDays = Math.round((dayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        currentStreak++;
      } else if (diffDays > 1) {
        currentStreak = 1;
      }
    } else {
      currentStreak = 1;
    }
    bestStreak = Math.max(bestStreak, currentStreak);
    lastDate = dayDate;
  });

  const maxMinutes = Math.max(...heatmapData.map(d => d.minutes), 1);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>Study Analytics</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        {isLoading ? (
          <LoadingSpinner message="Analyzing your data..." />
        ) : (
          <>
            {/* Period Selector */}
            <View style={styles.periodSelector}>
              {(['week', 'month', 'all'] as const).map(period => (
                <Pressable
                  key={period}
                  style={[styles.periodChip, selectedPeriod === period && styles.periodChipActive]}
                  onPress={() => setSelectedPeriod(period)}
                >
                  <Text style={[styles.periodText, selectedPeriod === period && styles.periodTextActive]}>
                    {period === 'week' ? '7 Days' : period === 'month' ? '30 Days' : 'All Time'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Summary Stats */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <MaterialIcons name="schedule" size={24} color={colors.primary} />
                <Text style={styles.statValue}>{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</Text>
                <Text style={styles.statLabel}>Total Time</Text>
              </View>
              
              <View style={styles.statCard}>
                <MaterialIcons name="event-note" size={24} color={colors.success} />
                <Text style={styles.statValue}>{totalSessions}</Text>
                <Text style={styles.statLabel}>Sessions</Text>
              </View>
              
              <View style={styles.statCard}>
                <MaterialIcons name="trending-up" size={24} color={colors.warning} />
                <Text style={styles.statValue}>{avgSessionLength}m</Text>
                <Text style={styles.statLabel}>Avg Session</Text>
              </View>
              
              <View style={styles.statCard}>
                <MaterialIcons name="local-fire-department" size={24} color={colors.error} />
                <Text style={styles.statValue}>{bestStreak}</Text>
                <Text style={styles.statLabel}>Best Streak</Text>
              </View>
            </View>

            {/* Study Heatmap */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Study Heatmap</Text>
              <Text style={styles.sectionDesc}>Daily study activity visualization</Text>
              <View style={styles.heatmapContainer}>
                {heatmapData.length === 0 ? (
                  <View style={styles.emptyHeatmap}>
                    <MaterialIcons name="calendar-today" size={48} color={colors.textTertiary} />
                    <Text style={styles.emptyText}>No study sessions recorded</Text>
                  </View>
                ) : (
                  <View style={styles.heatmap}>
                    {heatmapData.map((day, index) => {
                      const intensity = Math.min(day.minutes / maxMinutes, 1);
                      const backgroundColor = intensity === 0 
                        ? colors.surface 
                        : `rgba(139, 92, 246, ${0.2 + intensity * 0.8})`;
                      
                      return (
                        <View key={day.date} style={styles.heatmapCell}>
                          <View style={[styles.heatmapDay, { backgroundColor }]}>
                            <Text style={styles.heatmapDayText}>
                              {new Date(day.date).getDate()}
                            </Text>
                          </View>
                          {day.minutes > 0 && (
                            <Text style={styles.heatmapMinutes}>{day.minutes}m</Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
                
                {/* Heatmap Legend */}
                {heatmapData.length > 0 && (
                  <View style={styles.heatmapLegend}>
                    <Text style={styles.legendText}>Less</Text>
                    {[0.2, 0.4, 0.6, 0.8, 1].map((intensity, i) => (
                      <View
                        key={i}
                        style={[
                          styles.legendBox,
                          { backgroundColor: `rgba(139, 92, 246, ${intensity})` }
                        ]}
                      />
                    ))}
                    <Text style={styles.legendText}>More</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Subject Breakdown */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Subject Breakdown</Text>
              <Text style={styles.sectionDesc}>Time spent per subject</Text>
              
              {userSubjects.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="subject" size={48} color={colors.textTertiary} />
                  <Text style={styles.emptyText}>No subjects selected</Text>
                </View>
              ) : (
                userSubjects
                  .map(subject => ({
                    subject,
                    stats: subjectStats[subject.id] || { minutes: 0, sessions: 0 },
                  }))
                  .sort((a, b) => b.stats.minutes - a.stats.minutes)
                  .map(({ subject, stats }) => {
                    const percentage = totalMinutes > 0 ? (stats.minutes / totalMinutes) * 100 : 0;
                    
                    return (
                      <View key={subject.id} style={styles.subjectCard}>
                        <View style={styles.subjectHeader}>
                          <View style={styles.subjectInfo}>
                            <Text style={styles.subjectName}>{subject.name}</Text>
                            <Text style={styles.subjectCode}>{subject.code}</Text>
                          </View>
                          <View style={styles.subjectStats}>
                            <Text style={styles.subjectTime}>
                              {Math.floor(stats.minutes / 60)}h {stats.minutes % 60}m
                            </Text>
                            <Text style={styles.subjectSessions}>{stats.sessions} sessions</Text>
                          </View>
                        </View>
                        <View style={styles.progressBarContainer}>
                          <View
                            style={[
                              styles.progressBar,
                              { width: `${percentage}%` }
                            ]}
                          />
                        </View>
                        <Text style={styles.percentageText}>{percentage.toFixed(1)}% of total time</Text>
                      </View>
                    );
                  })
              )}
            </View>

            {/* Insights */}
            {totalSessions > 0 && (
              <View style={styles.insightsCard}>
                <MaterialIcons name="lightbulb-outline" size={24} color={colors.warning} />
                <Text style={styles.insightsTitle}>Insights</Text>
                <View style={styles.insightsList}>
                  {avgSessionLength < 20 && (
                    <Text style={styles.insightText}>
                      • Try longer study sessions (25-50 mins) for better focus
                    </Text>
                  )}
                  {avgSessionLength > 90 && (
                    <Text style={styles.insightText}>
                      • Consider taking breaks every 50-60 minutes
                    </Text>
                  )}
                  {bestStreak > 3 && (
                    <Text style={styles.insightText}>
                      • Great job! You studied {bestStreak} days in a row! 🔥
                    </Text>
                  )}
                  {userSubjects.length > 0 && (
                    <Text style={styles.insightText}>
                      • You're tracking {userSubjects.length} subject{userSubjects.length > 1 ? 's' : ''}
                    </Text>
                  )}
                </View>
              </View>
            )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.h1,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  headerPlaceholder: {
    width: 40,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  periodChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  periodTextActive: {
    color: colors.background,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionDesc: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  heatmapContainer: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heatmap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  heatmapCell: {
    alignItems: 'center',
  },
  heatmapDay: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  heatmapDayText: {
    fontSize: 11,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  heatmapMinutes: {
    fontSize: 9,
    color: colors.textTertiary,
  },
  emptyHeatmap: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  heatmapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  legendText: {
    fontSize: typography.caption,
    color: colors.textSecondary,
  },
  legendBox: {
    width: 16,
    height: 16,
    borderRadius: 2,
  },
  subjectCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  subjectInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  subjectCode: {
    fontSize: typography.caption,
    color: colors.primary,
    marginTop: 2,
  },
  subjectStats: {
    alignItems: 'flex-end',
  },
  subjectTime: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  subjectSessions: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  percentageText: {
    fontSize: typography.caption,
    color: colors.textTertiary,
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  insightsCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.warning,
  },
  insightsTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  insightsList: {
    gap: spacing.xs,
  },
  insightText: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

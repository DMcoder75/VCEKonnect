import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getUserSubjects } from '@/services/userSubjectsService';
import { getStudySessions } from '@/services/studyService';
import { VCESubject } from '@/services/vceSubjectsService';

interface DayData {
  date: string;
  minutes: number;
  count: number;
}

interface HourData {
  hour: number;
  minutes: number;
  sessions: number;
}

interface EfficiencyMetrics {
  focusTime: number;
  breakTime: number;
  efficiency: number;
}

interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  totalMinutes: number;
  totalSessions: number;
  avgSessionLength: number;
  mostStudiedSubject: string;
  mostProductiveDay: string;
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [userSubjects, setUserSubjects] = useState<VCESubject[]>([]);
  const [heatmapData, setHeatmapData] = useState<DayData[]>([]);
  const [subjectStats, setSubjectStats] = useState<{ [key: string]: { minutes: number; sessions: number } }>({});
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('month');
  const [hourlyData, setHourlyData] = useState<HourData[]>([]);
  const [efficiencyMetrics, setEfficiencyMetrics] = useState<EfficiencyMetrics>({ focusTime: 0, breakTime: 0, efficiency: 0 });
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
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
    
    // Build hourly data for productivity patterns
    const hourMap: { [hour: number]: HourData } = {};
    let totalFocusTime = 0;
    let totalBreakTime = 0;
    
    sessions.forEach((session, index) => {
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
      
      // Hourly productivity data
      const hour = new Date(session.startTime).getHours();
      if (!hourMap[hour]) {
        hourMap[hour] = { hour, minutes: 0, sessions: 0 };
      }
      hourMap[hour].minutes += session.duration;
      hourMap[hour].sessions += 1;
      
      // Efficiency metrics (focus time vs break time)
      totalFocusTime += session.duration;
      if (index > 0) {
        const prevSession = sessions[index - 1];
        const breakMinutes = (new Date(session.startTime).getTime() - new Date(prevSession.endTime || prevSession.startTime).getTime()) / (1000 * 60);
        if (breakMinutes > 0 && breakMinutes < 180) { // Only count breaks under 3 hours
          totalBreakTime += breakMinutes;
        }
      }
    });
    
    setHourlyData(Object.values(hourMap).sort((a, b) => a.hour - b.hour));
    
    const efficiency = totalFocusTime + totalBreakTime > 0 
      ? (totalFocusTime / (totalFocusTime + totalBreakTime)) * 100 
      : 0;
    setEfficiencyMetrics({ focusTime: totalFocusTime, breakTime: totalBreakTime, efficiency });
    
    // Build weekly reports
    buildWeeklyReports(sessions, subjects);
    
    setHeatmapData(Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date)));
    setSubjectStats(subjectMap);
    setIsLoading(false);
  }
  
  function buildWeeklyReports(sessions: any[], subjects: VCESubject[]) {
    const weekMap: { [weekKey: string]: any } = {};
    
    sessions.forEach(session => {
      const sessionDate = new Date(session.date);
      const weekStart = new Date(sessionDate);
      weekStart.setDate(sessionDate.getDate() - sessionDate.getDay()); // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weekMap[weekKey]) {
        weekMap[weekKey] = {
          weekStart: weekKey,
          totalMinutes: 0,
          totalSessions: 0,
          subjectMinutes: {} as { [key: string]: number },
          dayMinutes: {} as { [day: string]: number },
        };
      }
      
      weekMap[weekKey].totalMinutes += session.duration;
      weekMap[weekKey].totalSessions += 1;
      
      if (!weekMap[weekKey].subjectMinutes[session.subjectId]) {
        weekMap[weekKey].subjectMinutes[session.subjectId] = 0;
      }
      weekMap[weekKey].subjectMinutes[session.subjectId] += session.duration;
      
      if (!weekMap[weekKey].dayMinutes[session.date]) {
        weekMap[weekKey].dayMinutes[session.date] = 0;
      }
      weekMap[weekKey].dayMinutes[session.date] += session.duration;
    });
    
    const reports: WeeklyReport[] = Object.values(weekMap).map((week: any) => {
      const weekEnd = new Date(week.weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const mostStudiedSubjectId = Object.entries(week.subjectMinutes)
        .sort(([, a]: any, [, b]: any) => b - a)[0]?.[0];
      const mostStudiedSubject = subjects.find(s => s.id === mostStudiedSubjectId)?.code || 'N/A';
      
      const mostProductiveDay = Object.entries(week.dayMinutes)
        .sort(([, a]: any, [, b]: any) => b - a)[0]?.[0] || '';
      const dayName = mostProductiveDay ? new Date(mostProductiveDay).toLocaleDateString('en-AU', { weekday: 'short' }) : 'N/A';
      
      return {
        weekStart: week.weekStart,
        weekEnd: weekEnd.toISOString().split('T')[0],
        totalMinutes: week.totalMinutes,
        totalSessions: week.totalSessions,
        avgSessionLength: week.totalSessions > 0 ? Math.round(week.totalMinutes / week.totalSessions) : 0,
        mostStudiedSubject,
        mostProductiveDay: dayName,
      };
    }).sort((a, b) => b.weekStart.localeCompare(a.weekStart));
    
    setWeeklyReports(reports);
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

            {/* Productivity Insights - Best Study Times */}
            {hourlyData.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Best Study Times</Text>
                <Text style={styles.sectionDesc}>When you're most productive</Text>
                <View style={styles.hourlyChart}>
                  {hourlyData.map(hourData => {
                    const maxHourMinutes = Math.max(...hourlyData.map(h => h.minutes), 1);
                    const heightPercentage = (hourData.minutes / maxHourMinutes) * 100;
                    const isPeak = hourData.minutes === maxHourMinutes;
                    
                    return (
                      <View key={hourData.hour} style={styles.hourBar}>
                        <View style={styles.hourBarContainer}>
                          <View
                            style={[
                              styles.hourBarFill,
                              { height: `${heightPercentage}%`, backgroundColor: isPeak ? colors.success : colors.primary }
                            ]}
                          />
                        </View>
                        <Text style={styles.hourLabel}>{hourData.hour}</Text>
                      </View>
                    );
                  })}
                </View>
                <View style={styles.peakInsight}>
                  <MaterialIcons name="access-time" size={20} color={colors.success} />
                  <Text style={styles.peakInsightText}>
                    Peak: {hourlyData.reduce((max, h) => h.minutes > max.minutes ? h : max, hourlyData[0]).hour}:00 - {hourlyData.reduce((max, h) => h.minutes > max.minutes ? h : max, hourlyData[0]).hour + 1}:00
                  </Text>
                </View>
              </View>
            )}
            
            {/* Study Efficiency Metrics */}
            {totalSessions > 1 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Study Efficiency</Text>
                <Text style={styles.sectionDesc}>Focus time vs breaks</Text>
                <View style={styles.efficiencyCard}>
                  <View style={styles.efficiencyRow}>
                    <View style={styles.efficiencyItem}>
                      <MaterialIcons name="timer" size={24} color={colors.success} />
                      <Text style={styles.efficiencyValue}>{Math.floor(efficiencyMetrics.focusTime / 60)}h {Math.round(efficiencyMetrics.focusTime % 60)}m</Text>
                      <Text style={styles.efficiencyLabel}>Focus Time</Text>
                    </View>
                    <View style={styles.efficiencyItem}>
                      <MaterialIcons name="free-breakfast" size={24} color={colors.warning} />
                      <Text style={styles.efficiencyValue}>{Math.floor(efficiencyMetrics.breakTime / 60)}h {Math.round(efficiencyMetrics.breakTime % 60)}m</Text>
                      <Text style={styles.efficiencyLabel}>Break Time</Text>
                    </View>
                  </View>
                  <View style={styles.efficiencyMeter}>
                    <View style={styles.efficiencyMeterBg}>
                      <View style={[styles.efficiencyMeterFill, { width: `${efficiencyMetrics.efficiency}%` }]} />
                    </View>
                    <Text style={styles.efficiencyPercentage}>
                      {efficiencyMetrics.efficiency.toFixed(0)}% Efficiency
                    </Text>
                  </View>
                  {efficiencyMetrics.efficiency > 80 && (
                    <Text style={styles.efficiencyWarning}>
                      ⚠️ High efficiency detected. Don't forget to take regular breaks!
                    </Text>
                  )}
                  {efficiencyMetrics.efficiency < 50 && efficiencyMetrics.focusTime > 60 && (
                    <Text style={styles.efficiencyTip}>
                      💡 Try reducing break times to maintain focus and momentum
                    </Text>
                  )}
                </View>
              </View>
            )}
            
            {/* Weekly Progress Reports */}
            {weeklyReports.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Weekly Progress Reports</Text>
                <Text style={styles.sectionDesc}>Performance trends over time</Text>
                {weeklyReports.slice(0, 4).map(report => (
                  <View key={report.weekStart} style={styles.weeklyReportCard}>
                    <View style={styles.weeklyReportHeader}>
                      <Text style={styles.weeklyReportTitle}>
                        {new Date(report.weekStart).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })} - {new Date(report.weekEnd).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}
                      </Text>
                      <Text style={styles.weeklyReportTime}>
                        {Math.floor(report.totalMinutes / 60)}h {report.totalMinutes % 60}m
                      </Text>
                    </View>
                    <View style={styles.weeklyReportStats}>
                      <View style={styles.weeklyReportStat}>
                        <Text style={styles.weeklyReportStatLabel}>Sessions</Text>
                        <Text style={styles.weeklyReportStatValue}>{report.totalSessions}</Text>
                      </View>
                      <View style={styles.weeklyReportStat}>
                        <Text style={styles.weeklyReportStatLabel}>Avg Length</Text>
                        <Text style={styles.weeklyReportStatValue}>{report.avgSessionLength}m</Text>
                      </View>
                      <View style={styles.weeklyReportStat}>
                        <Text style={styles.weeklyReportStatLabel}>Top Subject</Text>
                        <Text style={styles.weeklyReportStatValue}>{report.mostStudiedSubject}</Text>
                      </View>
                      <View style={styles.weeklyReportStat}>
                        <Text style={styles.weeklyReportStatLabel}>Best Day</Text>
                        <Text style={styles.weeklyReportStatValue}>{report.mostProductiveDay}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
            
            {/* Subject Comparison Chart */}
            {userSubjects.length > 1 && totalMinutes > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Subject Comparison</Text>
                <Text style={styles.sectionDesc}>Time distribution across subjects</Text>
                <View style={styles.comparisonChart}>
                  {userSubjects
                    .map(subject => ({
                      subject,
                      stats: subjectStats[subject.id] || { minutes: 0, sessions: 0 },
                    }))
                    .sort((a, b) => b.stats.minutes - a.stats.minutes)
                    .map(({ subject, stats }) => {
                      const percentage = totalMinutes > 0 ? (stats.minutes / totalMinutes) * 100 : 0;
                      const avgSession = stats.sessions > 0 ? Math.round(stats.minutes / stats.sessions) : 0;
                      
                      return (
                        <View key={subject.id} style={styles.comparisonBar}>
                          <View style={styles.comparisonBarHeader}>
                            <Text style={styles.comparisonBarSubject}>{subject.code}</Text>
                            <Text style={styles.comparisonBarValue}>{Math.floor(stats.minutes / 60)}h {stats.minutes % 60}m</Text>
                          </View>
                          <View style={styles.comparisonBarContainer}>
                            <View style={[styles.comparisonBarFill, { width: `${percentage}%` }]} />
                          </View>
                          <View style={styles.comparisonBarStats}>
                            <Text style={styles.comparisonBarStat}>{percentage.toFixed(0)}%</Text>
                            <Text style={styles.comparisonBarStat}>•</Text>
                            <Text style={styles.comparisonBarStat}>{stats.sessions} sessions</Text>
                            <Text style={styles.comparisonBarStat}>•</Text>
                            <Text style={styles.comparisonBarStat}>{avgSession}m avg</Text>
                          </View>
                        </View>
                      );
                    })}
                </View>
              </View>
            )}

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
                  {hourlyData.length > 0 && (
                    <Text style={styles.insightText}>
                      • Your peak productivity is around {hourlyData.reduce((max, h) => h.minutes > max.minutes ? h : max, hourlyData[0]).hour}:00
                    </Text>
                  )}
                  {efficiencyMetrics.efficiency > 0 && efficiencyMetrics.efficiency < 60 && (
                    <Text style={styles.insightText}>
                      • Consider shorter breaks to improve efficiency
                    </Text>
                  )}
                  {userSubjects.length > 1 && (
                    <Text style={styles.insightText}>
                      • Balance your study time across all {userSubjects.length} subjects
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
  hourlyChart: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 180,
  },
  hourBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  hourBarContainer: {
    width: '80%',
    height: 120,
    justifyContent: 'flex-end',
  },
  hourBarFill: {
    width: '100%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 4,
  },
  hourLabel: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  peakInsight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  peakInsightText: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: typography.semibold,
  },
  efficiencyCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  efficiencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  efficiencyItem: {
    alignItems: 'center',
  },
  efficiencyValue: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  efficiencyLabel: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  efficiencyMeter: {
    marginBottom: spacing.sm,
  },
  efficiencyMeterBg: {
    height: 12,
    backgroundColor: colors.surface,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  efficiencyMeterFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 6,
  },
  efficiencyPercentage: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: typography.semibold,
    textAlign: 'center',
  },
  efficiencyWarning: {
    fontSize: typography.caption,
    color: colors.warning,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  efficiencyTip: {
    fontSize: typography.caption,
    color: colors.primary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  weeklyReportCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weeklyReportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  weeklyReportTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  weeklyReportTime: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    color: colors.primary,
  },
  weeklyReportStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weeklyReportStat: {
    alignItems: 'center',
  },
  weeklyReportStatLabel: {
    fontSize: typography.caption,
    color: colors.textSecondary,
  },
  weeklyReportStatValue: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  comparisonChart: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  comparisonBar: {
    marginBottom: spacing.md,
  },
  comparisonBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  comparisonBarSubject: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.primary,
  },
  comparisonBarValue: {
    fontSize: typography.bodySmall,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  comparisonBarContainer: {
    height: 24,
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  comparisonBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  comparisonBarStats: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  comparisonBarStat: {
    fontSize: typography.caption,
    color: colors.textTertiary,
  },
});

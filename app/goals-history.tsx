import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useStudyGoals } from '@/hooks/useStudyGoals';
import { GoalPeriod } from '@/services/studyGoalsService';
import { LoadingSpinner } from '@/components/ui';

export default function GoalsHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { loadHistory } = useStudyGoals();
  
  const [periodType, setPeriodType] = useState<'weekly' | 'monthly' | 'term'>('weekly');
  const [history, setHistory] = useState<GoalPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bestWeek, setBestWeek] = useState<GoalPeriod | null>(null);

  useEffect(() => {
    if (user) {
      loadHistoryData();
    }
  }, [user, periodType]);

  async function loadHistoryData() {
    setIsLoading(true);
    const data = await loadHistory(periodType, 20);
    setHistory(data);
    
    // Find best week/month/term
    if (data.length > 0) {
      const best = data.reduce((prev, current) => 
        current.progressPercent > prev.progressPercent ? current : prev
      );
      setBestWeek(best);
    }
    
    setIsLoading(false);
  }

  function getStatusIcon(progressPercent: number) {
    if (progressPercent >= 100) return { name: 'check-circle' as const, color: colors.success };
    if (progressPercent >= 75) return { name: 'trending-up' as const, color: colors.primary };
    if (progressPercent >= 50) return { name: 'remove-circle-outline' as const, color: colors.warning };
    return { name: 'cancel' as const, color: colors.error };
  }

  function getStatusText(progressPercent: number) {
    if (progressPercent >= 100) return 'COMPLETED';
    if (progressPercent >= 75) return 'ON TRACK';
    if (progressPercent >= 50) return 'PARTIAL';
    return 'MISSED';
  }

  const periodTabs = [
    { key: 'weekly' as const, label: 'Weeks', icon: 'calendar-today' as const },
    { key: 'monthly' as const, label: 'Months', icon: 'event-note' as const },
    { key: 'term' as const, label: 'Terms', icon: 'school' as const },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Goals History</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Period Type Tabs */}
      <View style={styles.tabsContainer}>
        {periodTabs.map(tab => (
          <Pressable
            key={tab.key}
            style={[
              styles.tab,
              periodType === tab.key && styles.tabActive,
            ]}
            onPress={() => setPeriodType(tab.key)}
          >
            <MaterialIcons 
              name={tab.icon} 
              size={18} 
              color={periodType === tab.key ? colors.background : colors.textSecondary} 
            />
            <Text style={[
              styles.tabText,
              periodType === tab.key && styles.tabTextActive,
            ]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <LoadingSpinner message="Loading history..." />
      ) : history.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="history" size={64} color={colors.textTertiary} />
          <Text style={styles.emptyText}>No history yet</Text>
          <Text style={styles.emptyDesc}>Complete your first {periodType === 'weekly' ? 'week' : periodType === 'monthly' ? 'month' : 'term'} to see progress history</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Best Performance */}
          {bestWeek && bestWeek.progressPercent >= 75 && (
            <View style={styles.bestCard}>
              <View style={styles.bestHeader}>
                <MaterialIcons name="emoji-events" size={32} color={colors.premium} />
                <View style={styles.bestInfo}>
                  <Text style={styles.bestTitle}>🏆 Best Performance</Text>
                  <Text style={styles.bestPeriod}>{bestWeek.periodName}</Text>
                </View>
              </View>
              <View style={styles.bestStats}>
                <View style={styles.bestStat}>
                  <Text style={styles.bestStatValue}>{Math.round(bestWeek.progressPercent)}%</Text>
                  <Text style={styles.bestStatLabel}>Achievement</Text>
                </View>
                <View style={styles.bestStat}>
                  <Text style={styles.bestStatValue}>{bestWeek.achievedHours.toFixed(1)}h</Text>
                  <Text style={styles.bestStatLabel}>Study Time</Text>
                </View>
                <View style={styles.bestStat}>
                  <Text style={styles.bestStatValue}>{bestWeek.targetHours}h</Text>
                  <Text style={styles.bestStatLabel}>Target</Text>
                </View>
              </View>
            </View>
          )}

          {/* History List */}
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Past {periodType === 'weekly' ? 'Weeks' : periodType === 'monthly' ? 'Months' : 'Terms'}</Text>
            
            {history.map((period, index) => {
              const status = getStatusIcon(period.progressPercent);
              const isBest = bestWeek?.id === period.id;
              
              return (
                <View 
                  key={period.id} 
                  style={[
                    styles.historyCard,
                    isBest && styles.historyCardBest,
                  ]}
                >
                  <View style={styles.historyHeader}>
                    <View style={styles.historyLeft}>
                      <MaterialIcons name={status.name} size={28} color={status.color} />
                      <View style={styles.historyInfo}>
                        <Text style={styles.historyPeriod}>{period.periodName}</Text>
                        <Text style={styles.historyDates}>
                          {new Date(period.startDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} - {new Date(period.endDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                        </Text>
                      </View>
                    </View>
                    {isBest && (
                      <MaterialIcons name="star" size={24} color={colors.premium} />
                    )}
                  </View>

                  <View style={styles.historyProgress}>
                    <View style={styles.progressBarBackground}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${Math.min(100, period.progressPercent)}%`,
                            backgroundColor: status.color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressLabel}>
                      {period.achievedHours.toFixed(1)}/{period.targetHours}h ({Math.round(period.progressPercent)}%)
                    </Text>
                  </View>

                  <View style={styles.historyFooter}>
                    <View style={[styles.statusBadge, { backgroundColor: `${status.color}20` }]}>
                      <Text style={[styles.statusText, { color: status.color }]}>
                        {getStatusText(period.progressPercent)}
                      </Text>
                    </View>
                    {period.progressPercent >= 100 && period.progressPercent <= 120 && (
                      <View style={[styles.bonusBadge, { backgroundColor: `${colors.premium}20` }]}>
                        <MaterialIcons name="bolt" size={14} color={colors.premium} />
                        <Text style={[styles.bonusText, { color: colors.premium }]}>
                          {Math.round(period.progressPercent - 100)}% Bonus
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Insights */}
          <View style={styles.insightsCard}>
            <Text style={styles.insightsTitle}>📊 Your Insights</Text>
            <View style={styles.insightRow}>
              <Text style={styles.insightLabel}>Total completed:</Text>
              <Text style={styles.insightValue}>
                {history.filter(p => p.progressPercent >= 100).length} / {history.length}
              </Text>
            </View>
            <View style={styles.insightRow}>
              <Text style={styles.insightLabel}>Completion rate:</Text>
              <Text style={styles.insightValue}>
                {history.length > 0 ? Math.round((history.filter(p => p.progressPercent >= 100).length / history.length) * 100) : 0}%
              </Text>
            </View>
            <View style={styles.insightRow}>
              <Text style={styles.insightLabel}>Average progress:</Text>
              <Text style={styles.insightValue}>
                {history.length > 0 ? Math.round(history.reduce((sum, p) => sum + p.progressPercent, 0) / history.length) : 0}%
              </Text>
            </View>
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  bestCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.premium,
  },
  bestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  bestInfo: {
    flex: 1,
  },
  bestTitle: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  bestPeriod: {
    fontSize: typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  bestStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
  },
  bestStat: {
    alignItems: 'center',
  },
  bestStatValue: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.premium,
  },
  bestStatLabel: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  historySection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyCardBest: {
    borderColor: colors.premium,
    borderWidth: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  historyInfo: {
    flex: 1,
  },
  historyPeriod: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  historyDates: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  historyProgress: {
    marginBottom: spacing.sm,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  progressLabel: {
    fontSize: typography.caption,
    color: colors.textSecondary,
  },
  historyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: typography.caption,
    fontWeight: typography.bold,
  },
  bonusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  bonusText: {
    fontSize: typography.caption,
    fontWeight: typography.bold,
  },
  insightsCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  insightsTitle: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  insightLabel: {
    fontSize: typography.body,
    color: colors.textSecondary,
  },
  insightValue: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    color: colors.primary,
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
});

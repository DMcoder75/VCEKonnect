import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useStudyGoals } from '@/hooks/useStudyGoals';
import { getUserSubjects } from '@/services/userSubjectsService';
import { VCESubject } from '@/services/vceSubjectsService';
import {
  getCurrentWeekDates,
  getCurrentMonthDates,
  getCurrentTermDates,
  SaveGoalsPayload,
} from '@/services/studyGoalsService';

interface SubjectGoalInput {
  subjectId: string;
  weeklyHours: string;
  monthlyHours: string;
  termHours: string;
}

export default function GoalsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { activeGoals, saveUserGoals, isLoading: goalsLoading } = useStudyGoals();

  const [subjects, setSubjects] = useState<VCESubject[]>([]);
  const [weeklyTotal, setWeeklyTotal] = useState('25');
  const [monthlyTotal, setMonthlyTotal] = useState('100');
  const [termTotal, setTermTotal] = useState('400');
  const [subjectGoals, setSubjectGoals] = useState<SubjectGoalInput[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadSubjects();
    }
  }, [user]);

  useEffect(() => {
    if (subjects.length > 0) {
      initializeGoals();
    }
  }, [subjects, activeGoals]);

  async function loadSubjects() {
    if (!user) return;
    setIsLoadingSubjects(true);
    const userSubjects = await getUserSubjects(user.id);
    setSubjects(userSubjects);
    setIsLoadingSubjects(false);
  }

  function initializeGoals() {
    // If active goals exist, pre-fill with current values
    if (activeGoals?.weekly) {
      setWeeklyTotal(activeGoals.weekly.targetHours.toString());
    }
    if (activeGoals?.monthly) {
      setMonthlyTotal(activeGoals.monthly.targetHours.toString());
    }
    if (activeGoals?.term) {
      setTermTotal(activeGoals.term.targetHours.toString());
    }

    // Initialize subject goals
    const initialSubjectGoals = subjects.map(subject => {
      const weeklySubject = activeGoals?.weekly?.subjects?.find(s => s.subjectId === subject.id);
      const monthlySubject = activeGoals?.monthly?.subjects?.find(s => s.subjectId === subject.id);
      const termSubject = activeGoals?.term?.subjects?.find(s => s.subjectId === subject.id);

      return {
        subjectId: subject.id,
        weeklyHours: weeklySubject?.targetHours.toString() || '5',
        monthlyHours: monthlySubject?.targetHours.toString() || '20',
        termHours: termSubject?.targetHours.toString() || '80',
      };
    });

    setSubjectGoals(initialSubjectGoals);
  }

  function handleSmartFillEvenSplit() {
    const weekly = parseFloat(weeklyTotal) || 25;
    const monthly = parseFloat(monthlyTotal) || 100;
    const term = parseFloat(termTotal) || 400;
    const count = subjects.length || 1;

    const updatedGoals = subjects.map(subject => ({
      subjectId: subject.id,
      weeklyHours: (weekly / count).toFixed(1),
      monthlyHours: (monthly / count).toFixed(1),
      termHours: (term / count).toFixed(1),
    }));

    setSubjectGoals(updatedGoals);
  }

  function handleCopyWeeklyToMonthly() {
    console.log('Copy button clicked');
    console.log('Current weeklyTotal:', weeklyTotal);
    console.log('Current subjectGoals:', subjectGoals);
    
    // Update subject goals with proper fallback for empty/invalid values
    const updatedGoals = subjectGoals.map(goal => {
      const weeklyValue = parseFloat(goal.weeklyHours) || 0;
      const newMonthlyValue = (weeklyValue * 4.3).toFixed(1);
      console.log(`${goal.subjectId}: ${goal.weeklyHours}h → ${newMonthlyValue}h`);
      return {
        ...goal,
        monthlyHours: newMonthlyValue,
      };
    });
    
    console.log('Updated goals:', updatedGoals);
    setSubjectGoals(updatedGoals);

    // Also update monthly total with proper fallback
    const weeklyValue = parseFloat(weeklyTotal) || 25;
    const newMonthlyTotal = (weeklyValue * 4.3).toFixed(1);
    console.log(`Monthly total: ${weeklyTotal} → ${newMonthlyTotal}`);
    setMonthlyTotal(newMonthlyTotal);
    
    alert(`Updated! Weekly ${weeklyTotal}h × 4.3 = Monthly ${newMonthlyTotal}h`);
  }

  function updateSubjectGoal(subjectId: string, field: keyof SubjectGoalInput, value: string) {
    setSubjectGoals(prev =>
      prev.map(goal =>
        goal.subjectId === subjectId ? { ...goal, [field]: value } : goal
      )
    );
  }

  async function handleSave() {
    if (!user) return;

    setIsSaving(true);

    const weekDates = getCurrentWeekDates();
    const monthDates = getCurrentMonthDates();
    const termDates = getCurrentTermDates();

    const payload: SaveGoalsPayload = {
      weekly: {
        period_name: weekDates.name,
        start_date: weekDates.start,
        end_date: weekDates.end,
        total_hours: parseFloat(weeklyTotal) || 0,
        subjects: subjectGoals.map(g => ({
          subject_id: g.subjectId,
          hours: parseFloat(g.weeklyHours) || 0,
        })),
      },
      monthly: {
        period_name: monthDates.name,
        start_date: monthDates.start,
        end_date: monthDates.end,
        total_hours: parseFloat(monthlyTotal) || 0,
        subjects: subjectGoals.map(g => ({
          subject_id: g.subjectId,
          hours: parseFloat(g.monthlyHours) || 0,
        })),
      },
      term: {
        period_name: termDates.name,
        start_date: termDates.start,
        end_date: termDates.end,
        total_hours: parseFloat(termTotal) || 0,
        subjects: subjectGoals.map(g => ({
          subject_id: g.subjectId,
          hours: parseFloat(g.termHours) || 0,
        })),
      },
    };

    const { error } = await saveUserGoals(payload);

    setIsSaving(false);

    if (error) {
      alert(`Failed to save goals: ${error}`);
      return;
    }

    router.back();
  }

  if (isLoadingSubjects || goalsLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your subjects...</Text>
        </View>
      </View>
    );
  }

  if (subjects.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Study Goals</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.emptyState}>
          <MaterialIcons name="subject" size={64} color={colors.textTertiary} />
          <Text style={styles.emptyText}>No subjects selected</Text>
          <Text style={styles.emptySubtext}>Add subjects first to set study goals</Text>
          <Pressable
            style={styles.addSubjectsButton}
            onPress={() => router.push('/subjects')}
          >
            <MaterialIcons name="add" size={20} color={colors.background} />
            <Text style={styles.addSubjectsButtonText}>Add Subjects</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Study Goals Planner</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Period Info */}
        <View style={styles.infoCard}>
          <MaterialIcons name="info-outline" size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            Set your study targets for this week, month, and term. Your progress auto-updates from study timers.
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Pressable style={styles.quickActionButton} onPress={handleSmartFillEvenSplit}>
            <MaterialIcons name="auto-fix-high" size={18} color={colors.primary} />
            <Text style={styles.quickActionText}>Even Split</Text>
          </Pressable>
          <Pressable style={styles.quickActionButton} onPress={handleCopyWeeklyToMonthly}>
            <MaterialIcons name="content-copy" size={18} color={colors.primary} />
            <Text style={styles.quickActionText}>Weekly × 4.3 → Monthly</Text>
          </Pressable>
        </View>

        {/* Weekly Goal */}
        <View style={styles.periodSection}>
          <View style={styles.periodHeader}>
            <MaterialIcons name="calendar-today" size={24} color={colors.primary} />
            <Text style={styles.periodTitle}>WEEKLY (Mon-Sun)</Text>
          </View>
          <View style={styles.periodTotalRow}>
            <Text style={styles.periodLabel}>Total Hours:</Text>
            <TextInput
              style={styles.totalInput}
              value={weeklyTotal}
              onChangeText={setWeeklyTotal}
              keyboardType="numeric"
              placeholder="25"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
          {subjectGoals.map((goal, index) => {
            const subject = subjects.find(s => s.id === goal.subjectId);
            if (!subject) return null;
            return (
              <View key={goal.subjectId} style={styles.subjectRow}>
                <Text style={styles.subjectCode}>{subject.code}</Text>
                <TextInput
                  style={styles.subjectInput}
                  value={goal.weeklyHours}
                  onChangeText={value => updateSubjectGoal(goal.subjectId, 'weeklyHours', value)}
                  keyboardType="numeric"
                  placeholder="5"
                  placeholderTextColor={colors.textTertiary}
                />
                <Text style={styles.hoursLabel}>h</Text>
              </View>
            );
          })}
        </View>

        {/* Monthly Goal */}
        <View style={styles.periodSection}>
          <View style={styles.periodHeader}>
            <MaterialIcons name="event-note" size={24} color={colors.success} />
            <Text style={styles.periodTitle}>MONTHLY</Text>
          </View>
          <View style={styles.periodTotalRow}>
            <Text style={styles.periodLabel}>Total Hours:</Text>
            <TextInput
              style={styles.totalInput}
              value={monthlyTotal}
              onChangeText={setMonthlyTotal}
              keyboardType="numeric"
              placeholder="100"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
          {subjectGoals.map((goal, index) => {
            const subject = subjects.find(s => s.id === goal.subjectId);
            if (!subject) return null;
            return (
              <View key={goal.subjectId} style={styles.subjectRow}>
                <Text style={styles.subjectCode}>{subject.code}</Text>
                <TextInput
                  style={styles.subjectInput}
                  value={goal.monthlyHours}
                  onChangeText={value => updateSubjectGoal(goal.subjectId, 'monthlyHours', value)}
                  keyboardType="numeric"
                  placeholder="20"
                  placeholderTextColor={colors.textTertiary}
                />
                <Text style={styles.hoursLabel}>h</Text>
              </View>
            );
          })}
        </View>

        {/* Term Goal */}
        <View style={styles.periodSection}>
          <View style={styles.periodHeader}>
            <MaterialIcons name="school" size={24} color={colors.warning} />
            <Text style={styles.periodTitle}>TERM (Feb-Jun 2026)</Text>
          </View>
          <View style={styles.periodTotalRow}>
            <Text style={styles.periodLabel}>Total Hours:</Text>
            <TextInput
              style={styles.totalInput}
              value={termTotal}
              onChangeText={setTermTotal}
              keyboardType="numeric"
              placeholder="400"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
          {subjectGoals.map((goal, index) => {
            const subject = subjects.find(s => s.id === goal.subjectId);
            if (!subject) return null;
            return (
              <View key={goal.subjectId} style={styles.subjectRow}>
                <Text style={styles.subjectCode}>{subject.code}</Text>
                <TextInput
                  style={styles.subjectInput}
                  value={goal.termHours}
                  onChangeText={value => updateSubjectGoal(goal.subjectId, 'termHours', value)}
                  keyboardType="numeric"
                  placeholder="80"
                  placeholderTextColor={colors.textTertiary}
                />
                <Text style={styles.hoursLabel}>h</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <>
              <MaterialIcons name="save" size={20} color={colors.background} />
              <Text style={styles.saveButtonText}>Save All Goals</Text>
            </>
          )}
        </Pressable>
      </View>
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
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  quickActionText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.primary,
  },
  periodSection: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  periodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  periodTitle: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  periodTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  periodLabel: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  totalInput: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
    color: colors.primary,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    minWidth: 80,
    textAlign: 'center',
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  subjectCode: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    width: 80,
  },
  subjectInput: {
    flex: 1,
    fontSize: typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'center',
  },
  hoursLabel: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    width: 20,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    color: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.body,
    color: colors.textSecondary,
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
  emptySubtext: {
    fontSize: typography.body,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  addSubjectsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  addSubjectsButtonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.background,
  },
});

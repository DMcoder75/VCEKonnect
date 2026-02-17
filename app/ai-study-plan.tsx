import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useAI } from '@/hooks/useAI';
import { LoadingSpinner, Button } from '@/components/ui';
import { getUserSubjects } from '@/services/userSubjectsService';
import { getSubjectScores } from '@/services/scoresService';
import { VCESubject } from '@/services/vceSubjectsService';
import { getUserPreferences, updateUserPreferences } from '@/services/userPreferencesService';
import { getActiveGoals } from '@/services/studyGoalsService';
import { calculateATAR } from '@/services/atarCalculator';

export default function AIStudyPlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isLoading, error, response, createStudyPlan } = useAI();
  
  const [userSubjects, setUserSubjects] = useState<VCESubject[]>([]);
  const [currentScores, setCurrentScores] = useState<{ [key: string]: number }>({});
  const [targetATAR, setTargetATAR] = useState('');
  const [hoursPerWeek, setHoursPerWeek] = useState('');
  const [examDate, setExamDate] = useState('2026-11-01'); // Default VCE exam date
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  async function loadUserData() {
    if (!user) return;
    
    setIsLoadingData(true);
    
    // Load subjects first
    const subjects = await getUserSubjects(user.id);
    setUserSubjects(subjects);
    
    // Load current scores
    const scores = await getSubjectScores(user.id);
    const scoresMap: { [key: string]: number } = {};
    scores.forEach(score => {
      const subject = subjects.find(s => s.id === score.subjectId);
      if (subject) {
        // Average of SAC and exam prediction
        const avg = (score.sacAverage + score.examPrediction) / 2;
        scoresMap[subject.code] = Math.round(avg);
      }
    });
    setCurrentScores(scoresMap);
    
    // Auto-fill Target ATAR from ATAR predictor
    if (scores.length > 0) {
      const { atar } = calculateATAR(scores);
      if (atar > 0) {
        setTargetATAR(atar.toFixed(2));
      }
    }
    
    // Auto-fill Study Hours Per Week from active weekly goals
    const activeGoals = await getActiveGoals(user.id);
    if (activeGoals?.weekly) {
      // Convert target hours to hours per week
      const weeklyHours = activeGoals.weekly.targetHours;
      setHoursPerWeek(weeklyHours.toString());
    }
    // If no active weekly goal, leave field blank (don't load from preferences)
    
    setIsLoadingData(false);
  }

  async function handleGeneratePlan() {
    if (!user || !targetATAR || !hoursPerWeek) return;
    
    // Save preferences for future use
    await updateUserPreferences(user.id, {
      targetATAR: parseFloat(targetATAR),
      studyHoursPerWeek: parseFloat(hoursPerWeek),
    });
    
    // Use short subject codes for concise AI prompt
    await createStudyPlan(
      user.id,
      userSubjects.map(s => ({ code: s.code, name: s.code })), // Use code as name for brevity
      parseFloat(targetATAR),
      currentScores,
      parseFloat(hoursPerWeek),
      examDate
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
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>AI Study Plan</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* Premium Badge */}
        <View style={styles.premiumBadge}>
          <MaterialIcons name="auto-awesome" size={20} color={colors.warning} />
          <Text style={styles.premiumText}>AI-Powered Premium Feature</Text>
        </View>

        {isLoadingData ? (
          <LoadingSpinner message="Loading your data..." />
        ) : (
          <>
            {/* Input Form */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Details</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Target ATAR</Text>
                <TextInput
                  style={styles.input}
                  value={targetATAR}
                  onChangeText={setTargetATAR}
                  keyboardType="numeric"
                  placeholder="e.g., 95.00"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Study Hours Per Week</Text>
                <TextInput
                  style={styles.input}
                  value={hoursPerWeek}
                  onChangeText={setHoursPerWeek}
                  keyboardType="numeric"
                  placeholder="e.g., 20"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Exam Start Date</Text>
                <TextInput
                  style={styles.input}
                  value={examDate}
                  onChangeText={setExamDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>

            {/* Current Subjects */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Subjects ({userSubjects.length})</Text>
              <View style={styles.subjectsGrid}>
                {userSubjects.map(subject => (
                  <View key={subject.id} style={styles.subjectChip}>
                    <Text style={styles.subjectCode}>{subject.code}</Text>
                    <Text style={styles.subjectScore}>
                      {currentScores[subject.code] || 0}%
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Generate Button */}
            <Button
              title={isLoading ? "Generating Plan..." : "Generate Study Plan"}
              onPress={handleGeneratePlan}
              disabled={!targetATAR || !hoursPerWeek || isLoading}
              fullWidth
            />

            {/* Error Display - Debug Panel */}
            {error && (
              <View style={styles.errorCard}>
                <View style={styles.errorHeader}>
                  <MaterialIcons name="error-outline" size={24} color={colors.error} />
                  <Text style={styles.errorTitle}>API Error (Debug)</Text>
                </View>
                <ScrollView style={styles.errorScrollView} nestedScrollEnabled>
                  <Text style={styles.errorText}>{error}</Text>
                </ScrollView>
              </View>
            )}

            {/* Loading */}
            {isLoading && (
              <View style={styles.loadingCard}>
                <LoadingSpinner message="AI is creating your personalized study plan..." />
                <Text style={styles.loadingText}>This may take 2-5 seconds</Text>
              </View>
            )}

            {/* Response */}
            {response && (
              <View style={styles.responseCard}>
                <View style={styles.responseHeader}>
                  <MaterialIcons name="auto-awesome" size={24} color={colors.success} />
                  <Text style={styles.responseTitle}>Your Personalized Study Plan</Text>
                </View>
                
                <Text style={styles.responseText}>{response.response}</Text>
                
                {/* Metadata Info */}
                <View style={styles.modelInfo}>
                  <Text style={styles.modelText}>
                    {new Date(response.timestamp).toLocaleString()} • {response.metadata.response_length} characters
                    {response.metadata.search_performed && ' • Web search used'}
                  </Text>
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
    marginBottom: spacing.md,
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
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  premiumText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.warning,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subjectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  subjectChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    minWidth: 80,
  },
  subjectCode: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
    color: colors.primary,
    marginBottom: 2,
  },
  subjectScore: {
    fontSize: typography.caption,
    color: colors.textSecondary,
  },
  errorCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 2,
    borderColor: colors.error,
    maxHeight: 300,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.error,
  },
  errorScrollView: {
    maxHeight: 250,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  loadingText: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  responseCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 2,
    borderColor: colors.success,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  responseTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  responseText: {
    fontSize: typography.body,
    color: colors.textPrimary,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  modelInfo: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: spacing.md,
  },
  modelText: {
    fontSize: typography.caption,
    color: colors.textTertiary,
  },
  followupSection: {
    marginTop: spacing.md,
  },
  followupTitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  followupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  followupText: {
    flex: 1,
    fontSize: typography.caption,
    color: colors.textPrimary,
  },
});

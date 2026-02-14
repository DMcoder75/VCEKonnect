
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useATAR } from '@/hooks/useATAR';
import { ATARDisplay, Input, Button } from '@/components';
import { SubjectScoreCard } from '@/components/feature';
import { getUserSubjects } from '@/services/userSubjectsService';
import { VCESubject } from '@/services/vceSubjectsService';
import { useRouter, useFocusEffect } from 'expo-router';

export default function ATARScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { subjectScores, updateScore, getScenarios, getPrediction, reloadScores } = useATAR();
  
  const [editingSubject, setEditingSubject] = useState<string | null>(null);
  const [sacInput, setSacInput] = useState('');
  const [examInput, setExamInput] = useState('');
  const [rankInput, setRankInput] = useState('');

  const [userSubjects, setUserSubjects] = useState<VCESubject[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [isLoadingScores, setIsLoadingScores] = useState(true);
  const prediction = getPrediction();
  const scenarios = getScenarios();

  useEffect(() => {
    loadSubjects();
  }, [user]);

  useEffect(() => {
    if (subjectScores) {
      setIsLoadingScores(false);
    }
  }, [subjectScores]);

  // Reload scores when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        reloadScores();
      }
    }, [user])
  );

  async function loadSubjects() {
    if (!user) return;
    setIsLoadingSubjects(true);
    const subjects = await getUserSubjects(user.id);
    setUserSubjects(subjects);
    setIsLoadingSubjects(false);
  }

  function handleEditSubject(subjectId: string) {
    const existing = subjectScores.find(s => s.subjectId === subjectId);
    setEditingSubject(subjectId);
    setSacInput(existing?.sacAverage.toString() || '');
    setExamInput(existing?.examPrediction.toString() || '');
    setRankInput(existing?.studyRank.toString() || '');
  }

  async function handleSaveScore() {
    if (!editingSubject) return;
    
    const sac = parseFloat(sacInput) || 0;
    const exam = parseFloat(examInput) || 0;
    const rank = parseFloat(rankInput) || 50;

    await updateScore(editingSubject, sac, exam, rank);
    setEditingSubject(null);
    setSacInput('');
    setExamInput('');
    setRankInput('');
  }

  const isLoading = isLoadingSubjects || isLoadingScores;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>ATAR Predictor</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading your ATAR data...</Text>
          </View>
        ) : (
          <>
            {/* Main ATAR Display */}
            <View style={styles.atarCard}>
              <ATARDisplay atar={prediction.atar} size="large" />
              <Text style={styles.aggregateText}>
                Aggregate: {prediction.aggregate.toFixed(1)}
              </Text>
            </View>

            {/* Scenarios */}
            <View style={styles.scenariosCard}>
              <Text style={styles.sectionTitle}>ATAR Scenarios</Text>
              <View style={styles.scenarioRow}>
                <View style={styles.scenarioItem}>
                  <Text style={[styles.scenarioValue, { color: colors.success }]}>
                    {scenarios.bestCase.toFixed(2)}
                  </Text>
                  <Text style={styles.scenarioLabel}>Best Case</Text>
                  <Text style={styles.scenarioDesc}>+10% all exams</Text>
                </View>
                <View style={styles.scenarioDivider} />
                <View style={styles.scenarioItem}>
                  <Text style={[styles.scenarioValue, { color: colors.atarMid }]}>
                    {scenarios.current.toFixed(2)}
                  </Text>
                  <Text style={styles.scenarioLabel}>Current</Text>
                  <Text style={styles.scenarioDesc}>Based on inputs</Text>
                </View>
                <View style={styles.scenarioDivider} />
                <View style={styles.scenarioItem}>
                  <Text style={[styles.scenarioValue, { color: colors.warning }]}>
                    {scenarios.worstCase.toFixed(2)}
                  </Text>
                  <Text style={styles.scenarioLabel}>Worst Case</Text>
                  <Text style={styles.scenarioDesc}>-10% all exams</Text>
                </View>
              </View>
            </View>

            {/* Subject Scores */}
            <Text style={styles.sectionTitle}>Subject Scores</Text>
            <Text style={styles.sectionDesc}>
              Enter your SAC averages and predicted exam scores
            </Text>

            {userSubjects.map(subject => {
              const score = subjectScores.find(s => s.subjectId === subject.id);
              const isEditing = editingSubject === subject.id;

              return (
                <View key={subject.id} style={styles.subjectContainer}>
                  {!isEditing && score ? (
                    <Pressable onPress={() => handleEditSubject(subject.id)}>
                      <SubjectScoreCard
                        subjectId={subject.id}
                        subjectName={subject.name}
                        subjectCode={subject.code}
                        sacAverage={score.sacAverage}
                        examPrediction={score.examPrediction}
                        predictedStudyScore={score.predictedStudyScore}
                      />
                    </Pressable>
                  ) : isEditing ? (
                    <View style={styles.editCard}>
                      <View style={styles.editHeader}>
                        <Text style={styles.editTitle}>{subject.name}</Text>
                        <Pressable onPress={() => setEditingSubject(null)}>
                          <MaterialIcons name="close" size={20} color={colors.textSecondary} />
                        </Pressable>
                      </View>
                      
                      <Input
                        label="SAC Average (%)"
                        value={sacInput}
                        onChangeText={setSacInput}
                        keyboardType="numeric"
                        placeholder="e.g., 85"
                      />
                      
                      <Input
                        label="Predicted Exam Score (%)"
                        value={examInput}
                        onChangeText={setExamInput}
                        keyboardType="numeric"
                        placeholder="e.g., 80"
                      />
                      
                      <Input
                        label="Study Rank (percentile, 1-100)"
                        value={rankInput}
                        onChangeText={setRankInput}
                        keyboardType="numeric"
                        placeholder="e.g., 50 (average)"
                      />
                      
                      <Button title="Save Score" onPress={handleSaveScore} fullWidth />
                    </View>
                  ) : (
                    <Pressable
                      style={styles.addScoreCard}
                      onPress={() => handleEditSubject(subject.id)}
                    >
                      <MaterialIcons name="add-circle-outline" size={32} color={colors.primary} />
                      <Text style={styles.addScoreText}>{subject.name}</Text>
                      <Text style={styles.addScoreDesc}>Tap to add scores</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}

            {userSubjects.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialIcons name="assessment" size={64} color={colors.textTertiary} />
                <Text style={styles.emptyText}>No subjects selected</Text>
                <Text style={styles.emptyDesc}>
                  Add subjects in onboarding to start tracking
                </Text>
              </View>
            )}

            {/* Info Card */}
            <View style={styles.infoCard}>
              <MaterialIcons name="info-outline" size={20} color={colors.primary} />
              <Text style={styles.infoText}>
                This ATAR prediction uses simplified VTAC scaling formulas. 
                Actual ATAR may vary based on cohort performance and official scaling.
              </Text>
            </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.h1,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  atarCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  aggregateText: {
    fontSize: typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  scenariosCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  scenarioRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  scenarioItem: {
    flex: 1,
    alignItems: 'center',
  },
  scenarioValue: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
  },
  scenarioLabel: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  scenarioDesc: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 2,
  },
  scenarioDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
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
  subjectContainer: {
    marginBottom: spacing.md,
  },
  editCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  editTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  addScoreCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  addScoreText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  addScoreDesc: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xxl,
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
    textAlign: 'center',
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.body,
    color: colors.textSecondary,
  },
});
